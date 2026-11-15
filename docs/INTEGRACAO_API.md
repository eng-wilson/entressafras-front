# Integração com a API Entressafras: acompanhamento

Atualizado em 15/11/2026. Documento único de acompanhamento: estado de cada endpoint, origem de cada dado da tela e o que falta. O histórico das fases anteriores está no git.

## Regras

1. **Só dados da API.** Se a API resolve algo que a tela mostra, o front não calcula nem mantém mock daquilo. Isso vale mesmo quando o servidor marca o dado como MOCK; nesse caso a tela avisa "provisório".
2. **Sem dado não vira valor.** Ausência mostra "Sem dado"; nunca zero, estimativa local ou dado de outra cultura.
3. **Contas do front só sobre insumos da API**, quando a API não entrega o resultado pronto (ex.: Kc × ET0).
4. **A cobertura é conferida ao vivo:** `npm run dados:status` regera a tabela no fim deste documento.

## Endpoints

Base: `VITE_API_URL` (padrão `https://entressafras-backend-production.up.railway.app`).

| Endpoint | Estado em 15/11 | Uso na tela | Cache |
|---|---|---|---|
| `GET /api/health` | OK | Diagnóstico | — |
| `GET /api/clima/decendios?lat&lon` | OK | Chuva, ET0 e temperatura por decêndio (NASA POWER) | 7 dias, 20 pontos, `entressafras.clima.decendios.v1` |
| `GET /api/crops`, `/api/crops/{code}` | OK | Requisitos EcoCrop; Kc, estágios, raízes e Ky (FAO-56) | 7 dias, 20 culturas, `entressafras.culturas.v2` |
| `POST /api/rotations/recommendations` | **Erro 500** | Rotações, ordem, risco, escalas 0–100, proteção do solo, solo usado, calendário | 1 dia, 20 pedidos, `entressafras.rotacoes.v2` |
| `GET /api/clima/diario` | Não usado | — | — |

**Recomendações fora do ar.** Respondeu 500 em todos os testes de 15/11. Com textura informada, falha depois de cerca de 154 s; sem textura (solo estimado pelo SoilGrids), falha em 0,3 s. A tela mostra "As rotações recomendadas não carregaram" com "Tentar de novo". O front espera até 90 s; se o endpoint voltar demorando 154 s, esse limite precisará subir.

**Clima diário não usado de propósito:** traz umidade regional (`gwettop`/`gwetroot`), não a resposta hídrica da cultura, e não resolveria nenhum indicador atual.

### O que a tela envia às recomendações

| Campo | Origem | Regra |
|---|---|---|
| `location` | Centro do talhão | — |
| `soil_type` | Textura do cadastro | Só quando o agricultor informou; sem ela, a API estima o solo |
| `crop_history` | Histórico do talhão | 3 últimas safras em códigos EcoCrop, mais antiga primeiro |
| `priorities` | "O que importa" | Resiliência → `water_security`, Produtividade → `productivity`, Saúde do solo → `soil_protection` |

A resposta é validada antes de entrar na tela: exige `soil`, `priorities` e, em cada rotação, `scores`, `soil_protection` e `calendar` por cultura. Trocar só as prioridades mantém a lista anterior até a nova ordem chegar; a seleção e a cor de cada rotação acompanham o `id`.

## Origem de cada dado na tela

Legenda: **API** · **API (MOCK)**: o servidor marca como provisório · **Front/API**: conta do front com insumos da API · **Cadastro** · **Mock** · **Externo**.

| Área | Dado | Origem | Campo ou arquivo |
|---|---|---|---|
| Lateral | Solo | Cadastro ou **API** | Sem textura: "(estimado)", de `soil.texture_class` |
| Lateral | Chuva no ano | Front/API | Soma dos 36 `chuva_media` |
| Lateral | Local | Externo | Nominatim (OpenStreetMap) |
| Lateral | Prioridades (exceto água) | **API** | Vão como `priorities`; a ordem é o `rank` |
| Cena | Chuva e temperatura do decêndio | **API** | `chuva_media`, `tmin_media`, `tmax_media` |
| Cena | Classificação da temperatura | Front/API | Clima × limites EcoCrop da cultura |
| Cena | Água para a cultura (ETa/ETc) | **API (MOCK)** | `risk.mean_isna` da fase do decêndio |
| Cena | Estágio e período crítico no chip | **API (MOCK)** | Estágios FAO-56 nas datas da API; `critical_stage` |
| Cena | Desenho do talhão | Front | Motor local (`simulacao/`); só visual, nenhum indicador lê a série dele |
| Rotações | Quais rotações, datas, barras | **API** | `rotations[]`, `planting_date`, `harvest_date` |
| Rotações | Ordem 1º a 4º | **API (MOCK)** | `rank` |
| Rotações | Selo de clima, hachura do período crítico | **API (MOCK)** | `risk_percentage` (régua do ZARC), `critical_stage` |
| Rotações | Tag "Atual" | Cadastro | Safra mais recente do histórico |
| Rotações | Tag "Mais pragas" | Mock | `src/data/perfis.ts` |
| Comparação | Mapa: resiliência, produtividade, saúde do solo | **API (MOCK)** | `scores.water_security`, `productivity`, `soil_protection` |
| Comparação | Mapa: economia de água | Mock | `perfis.ts` (`score.agua`), relativo entre as rotações |
| Comparação | Umidade necessária | Front/API | Σ Kc × ET0 da safra |
| Comparação | Risco de pragas, produção (sc/ha), receita | Mock | `perfis.ts` |
| Painel direito | Selo da rotação, "Provisório", ordem | **API (MOCK)** | Risco da cultura mais arriscada; `warnings` |
| Painel direito | Atenção no ciclo | **API (MOCK)** | `mean_isna` por fase, `critical_stage`, Ky ≥ 1 (`yield_response_factor`) |
| Painel direito | Saúde do solo | **API** | `soil_protection` (cobertura viva, troca de família) |
| Painel direito | Pragas | Mock | `perfis.ts` |
| Memória de cálculo | Risco, ISNA, solo, propriedades do solo, calendário, Kc | **API** | `risk`, `soil`, `soil_properties`, `calendar`, `water_requirements` |
| Memória de cálculo | Consumo por decêndio | Front/API | Kc × ET0 |
| Dados das culturas | Tudo | **API** | EcoCrop e FAO-56 |

Limiares de apresentação definidos no front (não são da API nem oficiais): régua do ZARC para o risco (até 20% favorável, 30–40% arriscado); 45% e 55% para o atendimento à demanda; Ky ≥ 1 para fase sensível.

## Pendências

### Backend

| Prioridade | Pendência | Efeito na tela hoje |
|---|---|---|
| 1 | `POST /api/rotations/recommendations` responde 500 | Tela sem rotações |
| 2 | Risco, ranking e escalas ainda marcados MOCK (última resposta real: 14/11) | Valores "provisórios", iguais para qualquer talhão e solo |
| 3 | Série por dia ou decêndio da resposta hídrica (ETa, ETc, água na zona das raízes) | Atendimento constante dentro de cada fase; veranicos curtos não aparecem |
| 4 | Economia de água por rotação | Eixo e prioridade mock |
| 5 | Produção (sc/ha) e preço por cultura e região | Tabela e receita mock |
| 6 | Efeito da sequência de culturas nas pragas | Tag e texto mock |
| 7 | Nome comum das culturas em português | Nomes em `perfis.ts` |
| 8 | Umidade do solo atual, previsão do tempo | Não exibidos |

### Front

- **Quando as recomendações voltarem:** trocar a fixture `src/data/rotacoesFixture.ts` (hoje montada pelo contrato) pela resposta real; rodar `npm run dados:status`; conferir se o risco deixou de ser MOCK; rever o limite de 90 s.
- **Paridade visual:** os 5 testes de `tests/ui-parity.spec.ts` comparam com imagens das 4 rotações antigas. Atualizar as imagens depende de aprovação visual.
- **Painel direito em edição:** havia edições sem commit na pasta principal (navegação entre momentos de atenção e "scrubber" de períodos), ainda não integradas à `main`.

## Como manter

- `npm run dados:status`: consulta a API e regera a tabela abaixo; com `-- --check`, falha se ela estiver desatualizada. Com um endpoint fora do ar, mostra "fora do ar" e não altera o documento. O registro dos dados fica em `scripts/dados-backend.mjs`: ao integrar um dado, marque `emUso: true`; ao surgir uma pendência, acrescente-a lá.
- Testes: fixtures de API em `src/data/*Fixture.ts` e `tests/fixtures/`; os testes de navegador nunca chamam a API real.
- Detalhe de método: [INDICADORES.md](INDICADORES.md) (indicadores e ordem), [PERIODOS_CRITICOS.md](PERIODOS_CRITICOS.md) (período crítico), [ATENCAO_NO_CICLO.md](ATENCAO_NO_CICLO.md) (atenção no ciclo e água para a cultura).

## Cobertura dos dados pelo backend

<!-- dados-backend:inicio -->
_Gerada por `npm run dados:status` em 15/11/2026, consultando a API ao vivo. Não editar à mão: ajuste `scripts/dados-backend.mjs`._

Resumo: 16 reais em uso, 0 servidos sem uso no front, 0 MOCK no backend, 6 pendentes.

| Dado | Situação | Onde o front usa | O que falta do backend |
|---|---|---|---|
| Chuva, ET0 e temperatura por decêndio | ✅ Real, em uso | Indicadores do decêndio, consumo de água (tabela e memória), chuva no ano (lateral) | — |
| Requisitos das culturas (EcoCrop) | ✅ Real, em uso | Temperatura, catálogo "Dados das culturas" | — |
| Kc por cultura | ✅ Real, em uso | Consumo de água (Kc × ET0) | — |
| Duração dos estágios por cultura | ✅ Real, em uso | Fases no calendário, curva de Kc, período crítico e estágios do talhão | — |
| Profundidade das raízes | ✅ Real, em uso | Dados das culturas (exibição) | — |
| Rotações recomendadas (culturas) | ✅ Real, em uso | As rotações da tela | — |
| Janelas de plantio e colheita | ✅ Real, em uso | Calendário, estágios, fases | — |
| Origem das datas (calendário GGCMI/CONAB) | ✅ Real, em uso | Memória de cálculo | — |
| Ordem das rotações pelas prioridades | ✅ Real, em uso | Ordem da lista; "O que importa" vai à API (água não entra) | — |
| Risco hídrico por cultura | ✅ Real, em uso | Selo de clima, período crítico, resiliência por safra | — |
| Atendimento à demanda por fase (ISNA) | ✅ Real, em uso | Widget "Água para a cultura" e "Atenção no ciclo" | — |
| Ky por estágio (sensibilidade ao déficit) | ✅ Real, em uso | Sensibilidade da fase em "Atenção no ciclo" | — |
| Escalas 0–100 (segurança hídrica, produtividade, solo) | ✅ Real, em uso | Mapa de aptidão (3 dos 4 eixos) | — |
| Proteção do solo planejada | ✅ Real, em uso | Saúde do solo: nota e texto (cobertura viva, troca de família) | — |
| Solo usado na simulação (textura, água por metro) | ✅ Real, em uso | Lateral (solo estimado quando não informado), memória de cálculo | — |
| Propriedades do solo superficial (SoilGrids) | ✅ Real, em uso | Memória de cálculo (só exibição) | — |
| Atendimento à demanda dia a dia ou por decêndio | ⬜ Pendente no backend | Não há: dentro da fase o valor é constante | Série ETa, ETc e água na zona das raízes por dia ou decêndio, vinculada à rotação |
| Economia de água da rotação | ⬜ Pendente no backend | Eixo "Economia de água" (`src/data/perfis.ts`, mock) | Indicador de consumo ou eficiência de água por rotação |
| Produção (sc/ha) e preço por cultura | ⬜ Pendente no backend | Tabela de comparação e receita (`src/data/perfis.ts`, mock) | Produtividade e preço por cultura e região, com data |
| Efeito da sequência nas pragas | ⬜ Pendente no backend | Selo "Mais pragas" e texto (`src/data/perfis.ts`, mock) | Efeito da sequência de culturas nas pragas |
| Umidade do solo atual | ⬜ Pendente no backend | Não exibida (o widget mostra o atendimento à demanda) | Leitura atual com data, origem e unidade |
| Previsão do tempo | ⬜ Pendente no backend | Fora do escopo atual | Fonte de previsão com horizonte e data de emissão |
<!-- dados-backend:fim -->
