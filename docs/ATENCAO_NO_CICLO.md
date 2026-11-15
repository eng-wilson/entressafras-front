# Atenção dentro de uma rotação favorável

Revisão de 15/11/2026. O painel direito mostra as fases com atendimento baixo à demanda de água, mesmo quando o risco geral da API é favorável. Ele substitui os antigos gráficos de risco por cultura e de ciclo das culturas e não aparece na barra esquerda. O panorama não altera a ordem nem o risco e não explica o ranking, que a API não justifica.

## Origem dos números: só a API

O widget "Água para a cultura" e o panorama "Atenção no ciclo" leem a mesma fonte: o atendimento à demanda por fase que a API entrega (`risk.mean_isna`, ΣETr/ΣETc por estágio FAO-56, média das safras históricas do balanço diário da API). É a razão ETa/ETc; não é umidade do solo.

- Cada decêndio da safra recebe o valor da fase em que a cultura está. As fases vêm dos estágios FAO-56 da API (`stage_length_days`), posicionados nas datas de plantio e colheita da API.
- A API não entrega valores dia a dia: dentro de uma fase, o valor é o mesmo em todos os decêndios. Eventos curtos dentro de uma fase não aparecem.
- Sem risco na resposta, ou fora das safras: sem dado. Nada é estimado no lugar.
- Valores que o servidor marca como MOCK aparecem como "provisório".

Histórico: a versão anterior (sessão de 15/11, ver [REPASSE_ENDPOINTS_INDICADORES.md](REPASSE_ENDPOINTS_INDICADORES.md)) lia ETa/ETc da corrida do worker da cena, com clima diário sintético. Pela regra do projeto (o que a API resolve não é calculado no front), essa análise saiu dos indicadores. O motor local continua só no desenho da cena. Antes disso, o widget lia tabelas fixas (`WAT2`/`SOIL`), o erro que motivou a correção.

## Como os momentos são encontrados

Código: [`src/logic/atencaoCiclo.ts`](../src/logic/atencaoCiclo.ts).

- Estado por fase, pelos limiares de apresentação do widget: crítico abaixo de 0,45; atenção de 0,45 a menos de 0,55. São limites de interface, não limiares agronômicos oficiais nem recomendação de irrigação.
- Decêndios seguidos da mesma safra e da mesma fase formam um momento.
- Sensibilidade: Ky da fase, da API (`yield_response_factor`). Ky ≥ 1 (FAO-33) indica fase em que a produção cai proporcionalmente mais que o déficit de água.
- A fase de maior déficit apontada pela API (`critical_stage`) vem marcada.
- Cada momento mostra intervalo, cultura, fase, atendimento da fase e o que conferir. Não estima redução de rendimento nem dose de água.

## Interpretação e ações

A classificação geral (risco) e o atendimento por fase respondem perguntas diferentes: uma rotação favorável pode ter uma fase com atendimento baixo. As ações são de verificação: conferir a água na zona das raízes e o estágio no campo; havendo irrigação, avaliar o manejo com assistência técnica. Na maturação, confirmar a maturidade antes de alterar o manejo. Não se prescreve irrigação com base só no índice.

Referência agronômica para a distinção de fases da soja: [Embrapa — Sintomas de falta de água](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua).

## Validação

Testes unitários (`src/logic/atencaoCiclo.test.ts`, `src/logic/soilGauge.test.ts`): leitura do ISNA da fase em cada decêndio, fase baixa em rotação favorável, agrupamento por fase, fase crítica, sensibilidade pelo Ky, ausência de risco sem estimativa, marca de provisório. Testes de navegador (`tests/atencao-ciclo.spec.ts`): momento, ação e o mesmo estado no widget; resposta sem risco; falha do clima sem apagar o que veio da API.
