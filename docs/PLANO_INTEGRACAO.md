# Integração com a API Entressafras

Revisão de 14/11/2026. Por decisão do usuário, a fase 2 está adiada e a fase 3 foi antecipada. Nenhuma consulta ao endpoint diário faz parte da implementação atual.

**Regra do projeto (14/11/2026):** quando a API resolve algo que a tela mostra, o front não calcula; vale só o dado da API, mesmo quando o servidor o marca como MOCK. A cobertura atual está na tabela gerada em "Cobertura dos dados pelo backend".

## Contratos disponíveis

Base: `VITE_API_URL`, com fallback para `https://entressafras-backend-production.up.railway.app`.

| Endpoint | Dados | Uso previsto |
|---|---|---|
| `GET /api/clima/decendios?lat&lon` | 36 decêndios climatológicos, fonte e safras | Indicadores de chuva e temperatura e resumo mensal |
| `GET /api/clima/diario?lat&lon&inicio&fim` | Série histórica diária | Adiado; sem serviço, hook, cache ou chamadas no frontend |
| `GET /api/crops` e `/api/crops/{eco_port_code}` | Catálogo e requisitos das culturas, com `water_requirements` (FAO-56) | Enriquecimento das culturas (fase 3) e Kc da resiliência (fase 5) |
| `POST /api/rotations/recommendations` | Até 4 rotações de 2 culturas, datas (calendário GGCMI), risco hídrico por cultura, ranking pelas prioridades, escalas 0–100, proteção do solo, solo usado (SoilGrids) | Rotações, ordem, mapa de aptidão e solo estimado (fases 5 e 6) |

O contrato diário contém `gwettop` e `gwetroot` históricos, mas não fornece uma leitura atual garantida de umidade. Na consulta de referência para o T-07 em 14/11/2026, a série termina em **31/08/2026**. Esses campos não serão usados para alimentar a lateral ou o indicador de solo nesta etapa. Não há integração de previsão futura neste escopo.

## Fase 1 — comportamento implementado

- Chuva: `chuva_media` do decêndio selecionado, em mm; título “Chuva do decêndio”.
- Temperatura: `tmin_media` e `tmax_media` do decêndio selecionado; arredondamento apenas nos rótulos.
- Meses: ícones e tooltips continuam usando a soma dos três decêndios do mês.
- Cache climatológico: 7 dias, até 20 pontos, chave `entressafras.clima.decendios.v1`.
- Carregamento, “Sem dado” e nova tentativa; ausência nunca vira zero ou mock climático.
- Umidade do solo e demais dados ilustrativos permanecem mock.
- Pendência conhecida: paridade visual com a referência ainda não aprovada. Os goldens antigos também refletem chuva mensal e precisam ser tratados como referência anterior à mudança de produto; manter explícitas as diferenças, sem aumentar a tolerância para ocultá-las.

## Fase 2 — adiada

Por decisão do usuário, não implementar nem consultar dados diários neste momento. O código iniciado foi retirado. Não criar tipos, serviço, hook, cache ou interface para essa série. Uma eventual retomada exige revisar o contrato e definir separadamente o escopo.

## Fase 3 — catálogo de culturas

Implementada com os contratos verificados no backend em 14/11/2026:

- Mapeamento explícito das espécies em `src/data/culturas.ts`. A busca por nome científico em `/api/crops` confirma o código antes de consultar `/api/crops/{eco_port_code}`. Nome científico e código do detalhe também são validados.
- Soja: `Glycine max`, código 1150; milho: `Zea mays`, código 2175. As demais espécies locais têm seus códigos verificados; Crotalária ochroleuca fica sem referência, sem substituição por outra espécie.
- Marandu, Piatã e Paiaguás compartilham a referência geral de `Brachiaria brizantha` (536), com indicação explícita de que os dados não são específicos da cultivar.
- Cache próprio de sete dias, até vinte registros, chave `entressafras.culturas.v1` (`v2` desde a fase 5), com validação, cancelamento, tratamento de erro e nova tentativa. Sem dependências novas.
- Temperatura: valores dentro da faixa ótima são “Bom”; fora da ótima são “Atenção”; além dos limites absolutos são “Risco”. Comparações usam valores brutos e os rótulos são arredondados. As quatro marcas e o gradiente acompanham a referência da espécie, em vez dos antigos limiares fixos por cultura.
- Limites térmicos ausentes ou incompletos: mostrar “Sem referência”, preservando os valores climáticos. Falha do catálogo nunca vira uma classificação positiva nem restaura os antigos limiares silenciosamente.
- Geada: apenas semeadura/emergência, com `killing_early_growth` informado e `tmin_extremo_medio` histórico menor ou igual a esse limite. O chip diz “Geada · Risco histórico”. Não usar médias como prova de geada, nem aplicar `killing_rest` a uma cultura em crescimento. Se o campo letal for null, não inventar um limite.
- “Ver todos os dados” abre “Dados das culturas”, com seletor das culturas locais, temperatura, chuva anual (mm/ano), ciclo (dias), pH e requisitos de solo. Fechamento por botão ou Escape, foco contido no diálogo e retorno ao botão de origem.
- Chuva anual é exibida como referência separada. Não substituir consumo por ciclo na `CompareTable`, nem dividir requisitos anuais para gerar suposta exigência por decêndio. Chuva do decêndio, consumo por ciclo e chuva anual são grandezas distintas.
- Solo, produtividade, ciclos simulados, ranking e adequação das rotações continuam ilustrativos. A fase 3 integra requisitos gerais do catálogo, sem alegar validar recomendações agronômicas ou prever geadas futuras.

Validação: testes do serviço e cache, faixas e extremos térmicos, ausência de referência, catálogo acessível, erro/nova tentativa e ausência de chamadas diárias. A pendência anterior de paridade com a referência permanece registrada separadamente.

## Fase 4: resiliência climática por safra (ZARC), com parâmetros mockados — REMOVIDA

> **Removida em 14/11/2026.** Com o risco por cultura na API, o balanço hídrico ZARC do front (10 anos sintéticos, ISNA mínimo, CAD, Kc local) saiu do código pela regra do projeto. O texto abaixo fica como histórico; as pendências de parâmetros ZARC deixaram de ser necessárias.

Como cada indicador é calculado, passo a passo: [INDICADORES.md](INDICADORES.md).

Implementada em 14/11/2026. A resiliência climática de cada safra segue o método do Zoneamento Agrícola de Risco Climático (ZARC, MAPA/Embrapa). Em cada um de 10 anos típicos, um balanço hídrico decendial calcula o ISNA (água usada ÷ água necessária) por fase da cultura. A safra conta como "chuva bastou" quando todas as fases que a portaria avalia atingem o ISNA mínimo. A contagem em 10 anos vira o nível de risco do ZARC: 8 ou mais = 20%, 7 = 30%, 6 = 40%, até 5 = acima de 40% (fora do zoneamento).

O clima vem do backend (`/api/clima/decendios`). **Os parâmetros agronômicos ainda são mock**, copiados à mão das portarias e mantidos em `src/data/zarc.ts`. A conta trata esses valores como reais, e a memória de cálculo ("Como chegamos nestes números") mostra a fonte e as ressalvas de cada um.

### Pendências de integração com o backend

| Dado mockado | Onde está | Origem atual | O que o backend precisa fornecer |
|---|---|---|---|
| ISNA mínimo por fase (I a IV) | `CRITERIOS[*].isna` | Portarias ZARC: soja MT 202/2026; milho 2ª safra (MAPA 2021, via manual Aprosoja-MS; mesmos valores em GO/DF/PR 2025/26); milho + braquiária SP 347/2026; sorgo granífero MT 91/2023 | Critério por cultura, **UF do talhão** e ano-safra vigente, com número da portaria e URL |
| Água disponível (CAD) por solo | `CRITERIOS[*].cad` | Mesmas portarias (tipos 1–3 ou classes AD1–AD6) | CAD por classe de solo e cultura, mais a profundidade das raízes |
| Classe de solo do talhão | Derivada da textura do cadastro | Aproximação nossa: arenoso, médio e argiloso → AD2, AD4 e AD5 para soja e consórcio | Classe AD1–AD6 pela função de pedotransferência da IN SPA/MAPA nº 1/2022, que usa areia, silte e argila. O cadastro hoje só tem textura e % de argila |
| Duração das fases | `FASES` (20/30/30/20%) | Portaria 347/2026, item 1.15 (milho consorciado, Grupo I), aplicada a todas as culturas | Duração das fases por cultura e grupo de ciclo |
| ~~Kc por cultura~~ | `SafraDef.kc` (sem reserva local) | **Resolvido na fase 5:** vem de `water_requirements.crop_coefficient` das rotações (mesmos valores da FAO-56) | Kc calibrado pelo ZARC, se existir |
| Kc do solo sem cultura | `KC_POUSIO` = 0,3 | Aproximação pelo Kc inicial da FAO-56 | Idem |
| Critério da cobertura (crotalária + milheto) | `CRITERIOS.coberturaMilheto` | **Analogia nossa** com o ZARC do sorgo forrageiro MT 2023/24; não existe ZARC para milheto nem crotalária | Validação agronômica: um critério próprio ou a confirmação da analogia |
| ~~Janelas de plantio e colheita~~ | `planting_date`/`harvest_date` das rotações | **Resolvido na fase 5** (datas da API). Ressalva do próprio backend: ciclos FAO-56, colheita possivelmente mais cedo que na prática | Ciclos calibrados para cultivares brasileiras |

### Limitações do cálculo no frontend (para o backend resolver)

- **Série ano a ano:** `/api/clima/decendios` traz média e p20, não os anos. Os 10 anos são sintéticos (lognormal por decêndio, com o mesmo quantil na safra inteira). O ZARC usa séries diárias reais de pelo menos 15 anos. Quando o backend expuser a série (o endpoint diário segue adiado, ver fase 2) ou calcular o ISNA por ano, trocar os anos sintéticos pelos reais.
- **Passo de tempo:** balanço por decêndio; o ZARC usa passo diário.
- **Fora da conta:** risco térmico (geada e temperatura mínima por fase), excesso de chuva na colheita e o ISNA de excesso hídrico na fase IV, que algumas portarias também avaliam.
- **Início:** a conta começa em 1º de setembro com o solo sem água disponível. Isso é razoável no Cerrado e precisa ser revisto para outras regiões.

### Períodos críticos (diagnóstico do selo)

Front-end puro, sem endpoint novo: usa só `chuva_media`, `chuva_p20` e `et0_media` de `/api/clima/decendios`, já documentados, e a memória de cálculo da resiliência. Regra, campos e limitações: [PERIODOS_CRITICOS.md](PERIODOS_CRITICOS.md).

### Contrato sugerido

`GET /api/zarc/criterios?uf=MT&cultura=soja&safra=2026/27`, retornando `isna[4]`, `cad` por classe de solo, `fases` (dias por grupo de ciclo), `kc` e a `fonte` (portaria, item, URL). O front já consome esse formato (`CriterioZarc` em `src/data/zarc.ts`); a troca é substituir o objeto `CRITERIOS` por uma chamada com cache, no mesmo padrão de `useCultura`.

## Fase 5: rotações recomendadas pela API

Implementada em 14/11/2026. As 4 rotações fixas do protótipo (`SAFRAS`/`CT`) saíram da tela; agora vêm de `POST /api/rotations/recommendations`, com o solo do talhão (arenoso/médio/argiloso → `sandy`/`medium`/`clayey`; sem textura = `medium`) e o centro do talhão.

- Serviço `src/services/rotacoes.ts`: validação da resposta, erros por motivo (rede, 422, HTTP, formato), cache de **1 dia** (o ranking é MOCK e o "ano que vem" muda), até 20 entradas, chave `entressafras.rotacoes.v1` por ponto e solo. Hook `useRotacoes`, com "Tentar de novo".
- Adaptador `src/logic/rotacoesApi.ts`: datas → decêndios e barras do calendário; Kc, estágios FAO-56 e profundidade das raízes do catálogo; risco por cultura. A ordem da tela é o `rank` da API.
- **Resiliência e período crítico só da API:** o selo, o eixo do mapa e o período crítico usam `risk` (`risk_percentage`, `critical_stage`, `mean_isna`). Na régua do ZARC: até 20% = favorável, 30–40% = arriscado, acima = desfavorável. Sem risco na resposta: "Sem dado de risco", sem estimativa local.
- **Estágios:** as fases I a IV de cada safra seguem `stage_length_days` (Kc, período crítico e estágios desenhados no talhão). **Raízes:** exibidas em "Dados das culturas", junto dos estágios e do Kc.
- O front ainda calcula, por não vir pronto da API: consumo de água do ciclo (Kc × ET0, ambos da API) e o déficit de leitura da fase. Cache do catálogo passou para `entressafras.culturas.v2` (guarda `water_requirements`).
- "Atual": a rotação igual à safra mais recente do histórico do talhão (`c1`/`c2`). Se nenhuma coincidir, nenhuma é marcada. A rotação inicial selecionada é a atual, senão a 1ª.
- As rotações chegam aos componentes por contexto (`src/state/conjunto.ts`). Enquanto a API não responde, a tela mostra "Buscando as rotações recomendadas…", **sem mock no lugar**; em erro, aviso com nova tentativa.
- `SAFRAS`, `CT` e `SCORE` continuam em `mock.ts` como `CONJUNTO_LOCAL`, só para testes.

### Pendências da fase 5

| Dado | Situação | O que o backend precisa fornecer |
|---|---|---|
| Ranking e `risk` por cultura | Exibidos como vêm, mas **MOCK no backend** (`warnings`, `method: "MOCK"`): mesmos valores para qualquer talhão e solo. A tela avisa "provisório" | Risco e ranking calculados (`FAO56_SIMPLIFIED_KY`); nada muda no front |
| Nome exibido, produtividade, preço, efeito no solo e nas pragas, scores de água e solo | Mock por cultura em `src/data/perfis.ts` (código EcoPort), os mesmos valores do conjunto antigo quando a cultura coincide | Produtividade e preço por cultura e região; efeito agronômico da sequência |
| Consórcios e coberturas (crotalária + milheto, milho + braquiária) | A API devolve só culturas puras; os consórcios do protótipo saíram da tela | Rotações com consórcio, se fizer parte do produto |
| Rotação atual do agricultor | Só aparece se a API recomendar a mesma sequência | Incluir a rotação atual do histórico na resposta, para comparação |

Paridade visual: os goldens de `tests/ui-parity.spec.ts` retratam as 4 rotações antigas e falham com as da API. Não foram atualizados.

## Fase 6: contrato de 15/11/2026 das rotações

Mapa completo do que é API e do que é mock, elemento por elemento: [MOCK_E_DADOS_REAIS.md](MOCK_E_DADOS_REAIS.md).

- **Requisição:** `soil_type` só quando o agricultor informou a textura (sem ela, a API estima pelo SoilGrids; o "médio" que o front assumia saiu); `crop_history` com as 3 últimas safras em códigos EcoCrop; `priorities` a partir de "O que importa" (Resiliência → `water_security`, Produtividade → `productivity`, Saúde do solo → `soil_protection`; Economia de água não existe na API).
- **Ordem:** o `rank` da resposta, agora calculado pelas prioridades. Trocar uma prioridade refaz a consulta; enquanto a nova ordem chega, a lista anterior segue na tela e a rotação selecionada é mantida pelo `id`. Cada rotação mantém a cor ao ser reordenada.
- **Mapa de aptidão:** Resiliência, Produtividade e Saúde do solo vêm de `scores` (escala absoluta 0–100). Saíram a nota de produtividade pela receita e o score de solo ilustrativo. Economia de água continua mock.
- **Saúde do solo:** texto e nota pela proteção do solo planejada (`soil_protection`: dias de cobertura viva e trocas de família botânica). O efeito no solo escrito à mão em `perfis.ts` saiu.
- **Solo:** sem textura informada, a lateral mostra a textura estimada pela API ("Argiloso (estimado)"); a memória de cálculo mostra o solo usado na simulação e de onde veio.
- **Datas:** a memória de cálculo mostra a origem (calendário regional GGCMI, com a estatística CONAB/MIRCA, ou referência FAO-56) e a duração do ciclo. Também mostra o ISNA do ciclo inteiro.
- **Validação:** a resposta precisa trazer `soil`, `priorities` e, em cada rotação, `scores`, `soil_protection` e `calendar` por cultura. `risk.method` aceita qualquer texto (antes só `MOCK` ou `FAO56_SIMPLIFIED_KY`).
- **Cache:** `entressafras.rotacoes.v2`, chave por ponto, solo (ou "auto"), histórico e prioridades. Tempo limite da consulta passou de 20 s para 90 s, porque a API agora simula cada rotação com balanço hídrico diário.
- **Script de cobertura:** pede como a tela pede (sem textura, com histórico e prioridades) e, se um endpoint estiver fora do ar, marca "fora do ar" e não altera o documento (antes marcaria como "pendente").

- **Umidade necessária** (tabela de comparação): passou a ser o consumo do ciclo, Σ Kc × ET0 com dados da API, no lugar das faixas ilustrativas por cultura. **Propriedades do solo superficial** (`soil_properties`, SoilGrids): exibidas na memória de cálculo.

**Pendência:** durante toda a integração (15/11/2026, cerca de 30 tentativas) o endpoint respondeu 500. A fixture de testes foi montada pelo contrato (ver o cabeçalho de `src/data/rotacoesFixture.ts`) e a tabela de cobertura abaixo ainda é a de antes do contrato novo. Quando o endpoint voltar: trocar a fixture pela resposta real, rodar `npm run dados:status` e conferir se o risco deixou de ser MOCK.

## Fase 7: atendimento à demanda por fase (widget e "Atenção no ciclo")

Origem: diagnóstico em [REPASSE_ENDPOINTS_INDICADORES.md](REPASSE_ENDPOINTS_INDICADORES.md). O widget de umidade lia tabelas fixas por decêndio (`WAT2`/`SOIL`); uma sessão anterior o trocou por ETa/ETc da simulação local e criou o panorama "Atenção no ciclo" sobre a mesma corrida.

- **Verificação do contrato (15/11/2026):** a API não entrega série por dia ou decêndio da resposta hídrica da cultura. Entrega `risk.mean_isna` (ΣETr/ΣETc por estágio FAO-56, média das safras históricas), `mean_season_isna`, `critical_stage` e, no catálogo, o Ky por estágio.
- **Integração:** pela regra do projeto, o widget "Água para a cultura" e o panorama passaram a ler `mean_isna` da fase de cada decêndio; a sensibilidade passou a ser o Ky da API (≥ 1). A análise sobre a simulação local saiu desses indicadores (o motor segue só no desenho). Detalhes: [ATENCAO_NO_CICLO.md](ATENCAO_NO_CICLO.md).
- **`GET /api/clima/diario` continua adiado:** traz umidade regional (`gwettop`/`gwetroot`), não o balanço da cultura; não resolveria estes indicadores.
- **Limite:** dentro de uma fase o valor é constante; veranicos curtos não aparecem. Pendência para o backend: série por dia ou decêndio (ETa, ETc, água na zona das raízes) vinculada à rotação.

## Cobertura dos dados pelo backend

<!-- dados-backend:inicio -->
_Gerada por `npm run dados:status` em 15/11/2026, consultando a API ao vivo. Não editar à mão: ajuste `scripts/dados-backend.mjs`._

Resumo: 7 reais em uso, 0 servidos sem uso no front, 2 MOCK no backend, 4 pendentes.

| Dado | Situação | Onde o front usa | O que falta do backend |
|---|---|---|---|
| Chuva, ET0 e temperatura por decêndio | ✅ Real, em uso | Indicadores do decêndio, resiliência, chuva no ano (lateral) | — |
| Requisitos das culturas (EcoCrop) | ✅ Real, em uso | Temperatura, catálogo "Dados das culturas" | — |
| Kc por cultura | ✅ Real, em uso | Consumo de água (Kc × ET0) na resiliência | — |
| Rotações recomendadas (culturas) | ✅ Real, em uso | As rotações da tela | — |
| Janelas de plantio e colheita | ✅ Real, em uso | Calendário, estágios, fases da resiliência | — |
| Duração dos estágios por cultura | ✅ Real, em uso | Fases no calendário, curva de Kc, período crítico e estágios do talhão | — |
| Profundidade das raízes | ✅ Real, em uso | Dados das culturas (exibição) | — |
| Ordem (rank) das rotações | 🟠 Servido, mas MOCK no backend | Ordem da lista (a tela não reordena) | Ranking calculado |
| Risco hídrico por cultura | 🟠 Servido, mas MOCK no backend | Selo de clima, resiliência no mapa, período crítico (única fonte; sem conta no front) | Risco calculado (`method: FAO56_SIMPLIFIED_KY`) |
| Produtividade e preço por cultura | ⬜ Pendente no backend | `src/data/perfis.ts` (mock) | Produtividade e preço por cultura e região, com data |
| Efeito da sequência no solo e nas pragas | ⬜ Pendente no backend | `src/data/perfis.ts` (mock) | Efeito agronômico por sequência de culturas |
| Umidade do solo atual | ⬜ Pendente no backend | Mock no indicador de umidade da cena | Leitura atual com data, origem e unidade |
| Previsão do tempo | ⬜ Pendente no backend | Fora do escopo atual | Fonte de previsão com horizonte e data de emissão |
<!-- dados-backend:fim -->

## Dependências futuras do backend

- Umidade atual ou recente: aguardar um contrato que defina disponibilidade, atualização, data de referência, origem e unidade. Só então substituir o mock da lateral e a lógica do indicador de solo.
- Previsão futura: depende de uma fonte ou endpoint de previsão com horizonte, data de emissão e proveniência. Não está coberta pelos endpoints históricos atuais.
