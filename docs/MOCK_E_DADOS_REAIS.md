# Mock e dados reais na tela

Revisão de 15/11/2026. Mapeia cada informação da tela à sua origem, para saber o que já é dado do backend e o que ainda é ilustrativo.

**Regra do projeto:** quando a API resolve algo que a tela mostra, o front não calcula; vale só o dado da API, mesmo enquanto o servidor o marca como MOCK. Sem dado na resposta, a tela mostra "Sem dado", nunca uma estimativa local.

A tabela de cobertura por dado do backend é gerada pela API ao vivo (`npm run dados:status`) em [PLANO_INTEGRACAO.md](PLANO_INTEGRACAO.md), seção "Cobertura dos dados pelo backend". Este documento olha pelo outro lado: elemento por elemento da tela.

## Legenda

| Origem | Significado |
|---|---|
| **API** | Valor do backend, exibido como vem |
| **API (MOCK)** | Valor do backend que o próprio servidor marca como provisório. A tela avisa "provisório" |
| **Front sobre API** | Conta simples do front com insumos da API (soma, Kc × ET0, classificação em faixas). Fica no front porque a API não entrega o resultado pronto |
| **Cadastro** | Informado pelo agricultor no onboarding |
| **Mock** | Valor ilustrativo escrito no código, sem fonte no backend |
| **Externo** | Serviço de terceiros (não é a API Entressafras) |

## Endpoints usados

| Endpoint | O que traz para a tela |
|---|---|
| `GET /api/clima/decendios` | Chuva, ET0, temperaturas e umidade histórica por decêndio (NASA POWER) |
| `GET /api/crops` e `/api/crops/{code}` | Requisitos EcoCrop, Kc, estágios e raízes (FAO-56) |
| `POST /api/rotations/recommendations` | Rotações, datas, risco hídrico, ranking pelas prioridades, escalas 0–100, proteção do solo, solo usado e calendário regional |

A tela envia a `POST /api/rotations/recommendations` o centro do talhão, a textura (só quando o agricultor a informou; sem ela a API estima pelo SoilGrids), o histórico das 3 últimas safras em códigos EcoCrop e as prioridades de "O que importa".

## Lateral (talhão)

| Elemento | Origem | Detalhe |
|---|---|---|
| Nome, contorno, área | Cadastro | Onboarding |
| Solo | Cadastro, ou **API** | Sem textura informada: "Argiloso (estimado)", a textura que a API estimou pelo local |
| Histórico | Cadastro | Também vai à API como `crop_history` |
| Chuva no ano | Front sobre API | Soma dos 36 `chuva_media`; faltando um decêndio, "Sem dado" |
| Local | Externo | Nome da cidade pelo Nominatim (OpenStreetMap) |
| "O que importa": Resiliência, Saúde do solo, Produtividade | **API** | Vão como `priorities`; a ordem da lista é o `rank` da resposta |
| "O que importa": Economia de água | Mock | Não existe na API: só destaca o eixo no mapa, não muda a ordem |
| Atenção no ciclo: fases com atendimento baixo | **API (MOCK)** | `risk.mean_isna` por fase, fase crítica (`critical_stage`) e sensibilidade pelo Ky da fase (`yield_response_factor`). Limiares de apresentação: 45% e 55%. Detalhes: [ATENCAO_NO_CICLO.md](ATENCAO_NO_CICLO.md) |

## Simulação do talhão (centro)

| Elemento | Origem | Detalhe |
|---|---|---|
| Chuva do decêndio | **API** | `chuva_media` |
| Temperatura (mín. e máx.) | **API** | `tmin_media`, `tmax_media` |
| Classificação da temperatura (Bom, Atenção, Risco) | Front sobre API | Clima comparado aos limites EcoCrop da cultura |
| Água para a cultura (ETa/ETc) | **API (MOCK)** | `risk.mean_isna` da fase em que a cultura está (média histórica por fase). Substituiu o antigo "Umidade do solo", que lia tabelas fixas (`WAT2`/`SOIL`). Não é umidade do solo |
| Cena isométrica (plantas, solo, palhada) | Front sobre API | Motor de simulação local (`simulacao/`), alimentado pelas normais do clima, pelas datas das rotações e pelo laudo |
| Estágio no chip (Semeadura, Floração…) | Front sobre API | Estágios FAO-56 da cultura posicionados na janela da API |
| "Período crítico" no chip | **API (MOCK)** | `critical_stage` da cultura |
| Cena isométrica: plantas e solo desenhados | Front | O motor local continua só no desenho; nenhum indicador lê a série dele |

## Rotações (calendário)

| Elemento | Origem | Detalhe |
|---|---|---|
| Quais rotações aparecem | **API** | Até 4 sequências de 2 culturas |
| Ordem 1º a 4º | **API (MOCK)** | `rank`, calculado pelas prioridades enviadas |
| Barras (plantio e colheita) | **API** | `planting_date`/`harvest_date`, pelo calendário regional GGCMI quando há (`calendar`) |
| Selo "Clima favorável / arriscado" | **API (MOCK)** | `risk_percentage` da cultura mais arriscada, lido na régua do ZARC (até 20% favorável, 30–40% arriscado) |
| Hachura do período crítico | **API (MOCK)** | `critical_stage`, posicionado pelos estágios FAO-56 |
| Tag "Atual" | Cadastro | A rotação igual à safra mais recente do histórico |
| Tag "Mais pragas" | Mock | `src/data/perfis.ts` |
| Ícones de chuva dos meses | Front sobre API | Soma dos 3 decêndios do mês |

## Comparação

| Elemento | Origem | Detalhe |
|---|---|---|
| Mapa de aptidão: Resiliência climática | **API (MOCK)** | `scores.water_security` (0–100, absoluto) |
| Mapa de aptidão: Produtividade | **API (MOCK)** | `scores.productivity`: produção preservada, 100 − perda por falta de água |
| Mapa de aptidão: Saúde do solo | **API** | `scores.soil_protection`: índice de cobertura viva e troca de família botânica (planejamento, não medida do solo) |
| Mapa de aptidão: Economia de água | **Mock** | Score ilustrativo relativo entre as rotações (`perfis.ts`) |
| Texto de Saúde do solo | **API** | `soil_protection`: dias de cobertura viva e trocas de família |
| Tabela: umidade necessária (mm) | Mock | Faixas ilustrativas por cultura |
| Tabela: ícone de histórico | **API (MOCK)** | Risco hídrico da safra |
| Tabela: risco de pragas | Mock | `perfis.ts` |
| Tabela: produção (sc/ha) | Mock | `perfis.ts` |
| "Ver por safra": consumo de água | Front sobre API | Σ Kc × ET0, com Kc e ET0 da API |
| "Ver por safra": receita (R$/ha) | Mock | Produção × preço ilustrativos |

## Painel da rotação selecionada (direita)

| Elemento | Origem | Detalhe |
|---|---|---|
| Datas de plantio e colheita | **API** | |
| Selo por safra e frase de risco | **API (MOCK)** | |
| "Por que ficou em Nº": resiliência | **API (MOCK)** | |
| Saúde do solo | **API** | Proteção do solo planejada |
| "Por que ficou em Nº": pragas | Mock | `perfis.ts` |
| "O que você ganha" | Cadastro | Só na rotação atual do agricultor |

## Memória de cálculo ("De onde vêm estes números")

Tudo da API, exibido como vem: risco, perda média, limiar, fase crítica, ISNA por fase e do ciclo, método, solo usado na simulação (textura, água por metro, origem SoilGrids), origem das datas (calendário GGCMI/CONAB ou referência FAO-56), Kc e estágios. A única conta é o consumo por decêndio (Kc × ET0).

## Dados das culturas

Tudo da API (EcoCrop e FAO-56): temperatura, chuva anual, pH, ciclo, requisitos de solo, limites letais, estágios, raízes e Kc.

## O que o front ainda calcula (sobre dados da API)

- Consumo de água do ciclo: Σ Kc × ET0.
- Déficit de leitura de uma fase: consumo menos chuva (ano médio e ano seco).
- Somas de chuva por mês e por ano.
- Classificações em faixas: régua do ZARC para o risco, Ótima/Média/Fraca no mapa e Bom/Atenção/Risco na temperatura.
- Estágios desenhados no talhão e simulação da cena (só desenho: nenhum indicador lê a série do motor local).

## O que ainda é mock (e o que o backend precisaria entregar)

| Mock | Onde | Precisaria |
|---|---|---|
| Economia de água (eixo e prioridade) | `src/data/perfis.ts` (`score.agua`) | Indicador de consumo ou eficiência de água por rotação |
| Produção (sc/ha), preço e receita | `src/data/perfis.ts` | Produtividade e preço por cultura e região, com data |
| Umidade necessária (faixa em mm) | `src/data/perfis.ts` | Consumo por ciclo da cultura (ou usar o Σ Kc × ET0 do front) |
| Efeito nas pragas e tag "Mais pragas" | `src/data/perfis.ts` | Efeito da sequência de culturas nas pragas |
| Nome exibido das culturas ("Milho safrinha") | `src/data/perfis.ts` | Nome comum em português e papel na rotação |
| Umidade do solo atual | Não exibida (as tabelas `WAT2`/`SOIL` saíram do widget) | Leitura atual com data, origem e unidade |
| Atendimento à demanda dentro da fase | A API só entrega por fase: eventos curtos não aparecem | Série por dia ou decêndio (ETa, ETc, água na zona das raízes) |

## Situação do backend em 15/11/2026

- O contrato de `POST /api/rotations/recommendations` mudou (prioridades, scores, proteção do solo, solo do SoilGrids, calendário GGCMI). O front está integrado a ele.
- **O endpoint respondia 500 em produção durante toda a integração** (mais de 30 tentativas, com e sem `soil_type`). Por isso a fixture de testes (`src/data/rotacoesFixture.ts`) foi montada pelo contrato: base real de 14/11 (culturas, datas, risco MOCK) mais os campos novos calculados pelas fórmulas do OpenAPI. Trocar pela resposta real quando o endpoint voltar.
- Na última resposta real (14/11), risco e ranking vinham marcados como MOCK. A descrição nova do endpoint fala em balanço hídrico diário FAO-56 sobre safras históricas; se o servidor deixar de avisar MOCK, a tela passa a tratar esses valores como reais sem mudança de código.
