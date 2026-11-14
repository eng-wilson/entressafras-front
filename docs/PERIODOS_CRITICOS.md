# Períodos críticos das rotações

Revisão de 14/11/2026. Este documento descreve como a tela mostra **onde, no ciclo, cada rotação perde anos de chuva suficiente**, ou seja, por que ela recebeu o selo "Clima favorável", "arriscado" ou "desfavorável". Ele é para quem mantém o backend: lista os dados usados, de onde vêm e o que precisaria mudar para o cálculo sair do front.

**Resumo para o backend:** nenhum endpoint novo é necessário. O diagnóstico é front-end puro e só usa campos que já estão documentados em `GET /api/clima/decendios` ([/docs](https://entressafras-backend-production.up.railway.app/docs#/)). Os demais insumos são os parâmetros do ZARC e as janelas das safras, que já são mock do front e estão listados em [PLANO_INTEGRACAO.md](PLANO_INTEGRACAO.md), Fase 4.

## O problema que resolve

Antes, para entender o selo de uma rotação, o agricultor precisava arrastar o slider pelos 36 decêndios e descobrir sozinho em que época faltava água. Agora:

1. **No calendário**, cada barra de safra traz uma hachura sobre a fase em que faltou água, na cor do nível dessa fase. As 4 rotações mostram lado a lado onde cada uma aperta.
2. **Ao selecionar uma rotação** (clique na linha ou no nome), a simulação pula para o **período decisivo**: o que mais pesa no selo dela. O talhão, a chuva, a umidade e a temperatura passam a mostrar aquele momento. Clicar em outra hachura leva a simulação até ela.
3. **No painel lateral**, cada safra diz qual é o seu período crítico, quando ele acontece e em quantos anos faltou água.

## Decisão: front-end puro, sobre dados já documentados

Regra adotada: o front só consome dados da API quando eles já estão documentados no OpenAPI do backend. Qualquer outra coisa fica no front.

| Dado | Origem | Documentado na API? | Uso no diagnóstico |
|---|---|---|---|
| `decendios[].chuva_media` | `GET /api/clima/decendios` | Sim: "Chuva total média, mm" | Chuva da fase no ano médio; déficit médio |
| `decendios[].chuva_p20` | `GET /api/clima/decendios` | Sim: "Chuva superada em 8 de cada 10 anos, mm" | Chuva da fase no ano seco; déficit de ano seco |
| `decendios[].et0_media` | `GET /api/clima/decendios` | Sim: "ET0 total média, mm" | Consumo da cultura (Kc × ET0) |
| `decendios[].idx`, `rotulo` | `GET /api/clima/decendios` | Sim (`idx`: 0 = 1–10/set … 35 = 21–31/ago) | Posição do período no ciclo |
| ISNA mínimo por fase, CAD, Kc, duração das fases | `src/data/zarc.ts` | Não: **mock do front** | Quais fases contam e o limite de cada uma |
| Janelas de plantio e colheita (`SAFRAS`) | `src/data/mock.ts` | Não: **mock do front** | Onde cada fase cai no calendário |
| Estágios fenológicos do talhão | `src/logic/estagios.ts`, derivados de `SAFRAS` | Não: **front** | Desenho do talhão no decêndio simulado |

Campos documentados que **não** entram no diagnóstico, de propósito:

- `gwettop_media`, `gwetroot_media` e `sm_*` (SMAP): são a umidade observada da região, não o balanço da cultura. O ISNA do ZARC sai do balanço hídrico, não da umidade medida.
- `GET /api/clima/diario`: permitiria trocar os 10 anos sintéticos por anos reais (ver "Limitações"). Ainda não é usado no cálculo de resiliência.

## Como o diagnóstico é calculado

Código: [`src/logic/diagnostico.ts`](../src/logic/diagnostico.ts), com testes em [`diagnostico.test.ts`](../src/logic/diagnostico.test.ts).

`diagnostico(rot)` **não refaz o balanço hídrico**. Ele lê a memória de cálculo que [`resiliencia.ts`](../src/logic/resiliencia.ts) já produz para cada safra (passo a passo em [INDICADORES.md](INDICADORES.md), "Resiliência climática"):

- `calc.decendios[]`: fase do ZARC (I a IV), consumo, chuva média e chuva de ano seco de cada decêndio da safra;
- `calc.anos[]`: para cada um dos 10 anos típicos, a lista `falhou` com as fases que ficaram abaixo do ISNA mínimo;
- `calc.criterio.isna`: quais fases a portaria avalia (`null` = não avalia).

### Regra do período crítico

Uma fase de uma safra é um **período crítico** quando as três condições valem:

1. a portaria do ZARC avalia a fase (ISNA mínimo não nulo). Na prática, a fase I (estabelecimento) e a III (floração e enchimento de grãos); a cobertura também tem a fase II;
2. a fase ficou abaixo do mínimo em **pelo menos 1** dos 10 anos típicos;
3. a **safra não é favorável**, ou seja, chuva bastou em menos de 8 de 10 anos.

A condição 3 segue a régua do ZARC: 8 ou mais anos em 10 é risco de 20%, o nível favorável. Sem ela, no clima de Sorriso/MT a floração da soja (2 falhas em 10) viraria período crítico de todas as rotações, e a simulação pularia sempre para dezembro, que não é onde está o problema.

### O que cada período traz

| Campo | Significado |
|---|---|
| `safra`, `nome` | Qual safra da rotação (0 = 1ª) e o nome exibido |
| `fase`, `nomeFase` | Fase do ZARC (0 = I … 3 = IV) |
| `de`, `ate`, `rotulo` | Primeiro e último decêndio da fase (mesma numeração `idx` da API) e o texto "11 abr a 20 mai" |
| `falhas` | Em quantos dos 10 anos típicos a fase ficou abaixo do mínimo |
| `cls` | Nível da fase: `classeAnos(10 − falhas)`, a mesma régua do selo (`good` / `warn` / `risk`). É a cor da hachura |
| `isnaMin` | ISNA mínimo da portaria para a fase |
| `deficitMedio`, `deficitSeco` | Consumo da cultura menos a chuva na fase, em mm, no ano médio (`chuva_media`) e no ano seco (`chuva_p20`). Positivo = faltou chuva. Não considera a água guardada no solo: é um indicador de leitura, não o ISNA |

A rotação também recebe `decisivo` (ver abaixo), `limitante` (a safra mais fraca) e `anosReprovados`.

### Para onde a simulação pula

`periodoDecisivo(diagnostico)` devolve o `de` do **período decisivo**, o que mais pesa no selo. O selo da rotação é o nível da safra mais fraca, então os períodos críticos são ordenados assim:

1. safra com menos anos em que a chuva bastou (é ela que define o selo);
2. dentro dela, a fase que reprovou em mais anos;
3. empate: a de maior déficit no ano seco (`deficitSeco`);
4. empate: a primeira no ciclo.

Exemplo: se a soja reprovasse em 5 anos no estabelecimento (outubro) e o milho safrinha em 6 anos na floração (abril e maio), a simulação iria para abril, e não para outubro, mesmo outubro vindo antes. Se a rotação não tem período crítico (todas as safras favoráveis), a simulação fica no decêndio em que estava.

### Retrato com o clima de exemplo (fixture de Sorriso/MT, solo médio)

| Rotação | Período crítico | Falhas em 10 | Nível |
|---|---|---|---|
| Soja → crotalária + milheto | Crotalária + milheto, floração e enchimento | 3 | Arriscado |
| Soja → sorgo | Sorgo, floração e enchimento | 4 | Arriscado |
| Soja precoce → milho + braquiária | Milho + braquiária, floração e enchimento | 3 | Arriscado |
| Soja → milho safrinha (atual) | Milho safrinha, floração e enchimento | 6 | Desfavorável |

Em todas, a soja tem 2 falhas na floração (8 em 10, favorável) e por isso não é marcada.

## Limitações (as mesmas da resiliência)

- **Anos sintéticos:** os 10 "anos típicos" são quantis de uma lognormal ajustada a `chuva_media` e `chuva_p20`, do mais seco ao mais chuvoso. Não são anos do calendário, e a tela nunca os rotula como 2016, 2017 etc. Quando o backend expuser a série ano a ano (o `GET /api/clima/diario` já documentado é o caminho natural) ou calcular o ISNA por ano, `falhas` passa a contar anos reais sem mudar o restante do diagnóstico.
- **Passo decendial:** um veranico de poucos dias dentro do decêndio não aparece.
- **Só água:** geada, calor na floração e excesso de chuva na colheita não geram período crítico.
- **Janelas e estágios ilustrativos:** os períodos caem onde `SAFRAS` diz que a safra está. Com janelas reais (do ZARC ou do agricultor), a hachura e o salto acompanham sem mudança de código.

## Se o cálculo for para o backend

Não é necessário hoje. Se for, basta o endpoint de resiliência devolver, por safra, o que o front já calcula, e `diagnostico()` continua igual:

- por fase avaliada: `de`, `ate` (em `idx`) e o ISNA mínimo;
- por ano: as fases que ficaram abaixo do mínimo (`falhou`);
- por decêndio: consumo, chuva média e chuva de ano seco (para o déficit).
