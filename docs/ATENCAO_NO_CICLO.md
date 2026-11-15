# Atenção dentro de uma rotação favorável

A barra esquerda mostra momentos de restrição hídrica do cenário local mesmo quando a classificação geral da API é favorável. Esse panorama não altera a ordem nem o risco da API e não pretende explicar os motivos do ranking, que não são fornecidos pelo backend.

## Correção da origem do indicador

O widget antigo usava `WAT2` e `SOIL`, tabelas ilustrativas fixas por decêndio. O valor 0,44 da captura não era resultado da simulação daquela rotação. Agora o indicador “Água para a cultura” lê ETa/ETc da série usada pelo desenho. Não é umidade volumétrica medida no solo. Ausência de dados e entressafra são neutras, sem substituir por um valor fixo.

O canvas e a análise compartilham a mesma corrida do worker. Não se executa uma simulação adicional nem se recalcula o risco da API. O resultado fica vinculado às entradas atuais; trocar rotação, talhão, solo ou clima invalida a leitura anterior.

## Como os momentos são encontrados

- A saída diária do motor contém ETa, ETc, nome da fase e sensibilidade da cultura ao déficit hídrico.
- Em cada posição do calendário, lê-se o mesmo dia representativo mostrado pela cena: `round(fracaoDoCiclo × cicloDias)`. A janela visual estica o ciclo do modelo sobre as datas recebidas; portanto, não se anuncia uma média meteorológica real do decêndio.
- Atendimento = ETa/ETc, limitado a 0–1. Sem demanda ou sem série: sem dado.
- Conservam-se os limiares de apresentação do widget: crítico abaixo de 0,45, atenção de 0,45 a menos de 0,55. São limites internos de interface, não limiares agronômicos oficiais ou uma recomendação de irrigação.
- Quadros adjacentes são agrupados quando coincidem cultura, fase, estado e faixa de sensibilidade. Alta sensibilidade é a referência de 0,8 já usada no motor para o canal de déficit hídrico. Não se misturam fases ou safras numa única explicação.
- Cada momento mostra intervalo, cultura, fase no modelo, menor atendimento entre os quadros e o que conferir. Não se estima redução de rendimento nem dose de água por esse índice.

## Interpretação e ações

A classificação global e o cenário pontual respondem perguntas diferentes. Uma opção favorável na API pode conter restrições locais no cenário sintético. O selo geral foi renomeado para “Favorável no risco geral da API”, evitando sugerir ausência de alertas em todo o ciclo.

A resposta da cultura depende da fase e da sensibilidade do modelo. Uma restrição na maturação não recebe automaticamente a mesma orientação que uma restrição em fase de alta sensibilidade. As ações são de verificação: confirmar água na zona das raízes e estágio no campo; se houver irrigação, avaliar o manejo com assistência técnica. Na maturação, confirmar a maturidade antes de alterar o manejo. Não se prescreve irrigação com base só no índice.

Referência agronômica para a distinção de fases da soja: [Embrapa — Sintomas de falta de água](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua). A sensibilidade exibida para cada cultura vem do motor local, não de uma extrapolação dessa referência para todas as culturas.

## Limites que permanecem visíveis

O modelo usa clima diário sintético gerado de normais mensais do talhão, com complemento de normais do Cerrado em meses incompletos. Não é previsão do tempo, observação no campo, série histórica real de perdas ou balanço hídrico calculado pelo backend. A seleção de um quadro por decêndio pode deixar de capturar eventos entre quadros. Sem clima, não se apresenta um panorama do talhão usando o fallback da cena.

Quando o desenho usa uma cultura reserva por não haver modelo próprio para a cultura selecionada, a análise local permanece sem dado; não se apresenta a resposta do milho como se fosse a de outra espécie.

## Validação

Testes unitários cobrem risco geral favorável com restrições locais, agrupamento, sensibilidade por fase, dia alinhado à cena, troca de cultura e ausência de série/demanda. Testes de navegador usam um cenário seco com risco MOCK favorável para verificar os momentos, as ações, o vínculo com o widget e a neutralidade quando o clima falha.
