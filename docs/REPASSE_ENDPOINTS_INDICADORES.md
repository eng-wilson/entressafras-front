# Repasse para a sessão de endpoints: indicadores ainda usando mocks

15/11/2026. Solicitação do usuário: comunicar o erro encontrado nos indicadores da simulação e priorizar os dados que o backend já é capaz de fornecer. Este documento é um repasse no workspace; não confirma entrega de mensagem à outra sessão.

## Erro confirmado no frontend

O widget “Umidade do solo” exibia, por exemplo, **0,44 · Crítico**, enquanto a rotação soja → milheto aparecia como favorável. Ao rastrear a origem, o valor do widget vinha de `WAT2[idx]` ou `SOIL[idx]` em `src/data/mock.ts`, consumidos por `src/logic/soilGauge.ts`.

Esses números eram fixos por decêndio. Não representavam a resposta da cultura/rotação selecionada ao clima e ao solo do talhão. A seleção de qualquer cultura reutilizava essencialmente a mesma tabela. Portanto, não se podia interpretar o 0,44 como resultado daquela rotação nem usar esse número para orientar manejo.

Há duas questões distintas: uma classificação favorável no ciclo pode coexistir com restrições pontuais; porém, a divergência da captura não comprovava isso, pois o indicador pontual ainda era mock.

## Correção local feita nesta sessão

- `src/logic/soilGauge.ts`: removida a leitura de `WAT2`/`SOIL` no widget. Recebe agora o atendimento à demanda da série da cena.
- `src/components/SoilMoistureBar.tsx`: renomeado para **“Água para a cultura”**, exibindo ETa/ETc; não chamar esse índice de umidade volumétrica do solo.
- `src/components/IsoField.tsx` e `src/components/Simulation.tsx`: compartilham com o App o resultado já calculado pelo worker.
- `src/logic/atencaoCiclo.ts`: identifica quadros com restrição, cultura, fase e sensibilidade, sem recalcular o risco da API.
- `src/components/AtencaoCiclo.tsx`: panorama na barra direita, substituindo os gráficos anteriores, com intervalos e ações de verificação, inclusive para rotações favoráveis na API.
- Sem dados, sem clima ou sem modelo específico da cultura: estado neutro. Não substituir por zero, dado de outra cultura ou classificação favorável.

**Esta correção não conclui a integração com o backend.** O cenário da cena ainda usa clima diário sintético gerado de normais mensais. Os alertas estão identificados como simulação local. Eles não são observações de campo, previsão meteorológica nem a série calculada pelo backend.

## O que a sessão de endpoints deve verificar e integrar

O usuário informa que o backend já fornece dados capazes de substituir esses mocks/cálculos locais. A disponibilidade atual e os campos correspondentes não foram revalidados nesta sessão. Favor conferir o contrato atual antes de manter como verdade as pendências documentadas em 14/11.

1. Identificar o endpoint e os campos que fornecem a **resposta hídrica da cultura dentro da rotação**, por dia/decêndio/fase: ETa, ETc, ISNA/atendimento, água na zona radicular, estresse e/ou períodos de atenção, conforme o que realmente existir no contrato.
2. Conferir a semântica: umidade do solo, ETa/ETc, chuva menos demanda e percentual de risco histórico são medidas diferentes. Não intercambiar nomes, unidades ou limiares.
3. Vincular os resultados a talhão, solo, cultura, rotação, datas e cenário/ano corretos. Invalidar dados ao trocar essas entradas.
4. Alimentar o widget e o panorama de atenção com **a mesma fonte do backend**, substituindo o cálculo local quando o endpoint já resolver esse dado, conforme a regra do projeto.
5. Preservar a distinção entre classificação do ciclo e eventos internos. Uma rotação favorável também pode apresentar eventos que exijam acompanhamento; não ocultá-los apenas pelo selo geral.
6. Mapear método, origem, período e eventual marca `MOCK`/provisório do servidor. Dado entregue como MOCK não deve aparecer como validado para o talhão.
7. Rever também água, solo, pragas, produção e preços: `src/logic/aptidao.ts`, `src/logic/rotacoesApi.ts`, `src/data/perfis.ts` e `src/data/mock.ts`. Substituir o que o contrato atual já entregar; não assumir que todos esses indicadores já foram corrigidos.
8. Atualizar `docs/INDICADORES.md` e `docs/PLANO_INTEGRACAO.md` para refletir a cobertura real. Eles ainda registram mocks e uma decisão anterior de adiar consultas diárias; alinhar essa decisão ao escopo atual antes de reativar chamadas.

## Critérios de aceite

- Nenhum indicador apresentado como específico do talhão lê tabelas ilustrativas ou usa cultura reserva silenciosamente.
- Um cenário favorável no ciclo, mas com restrição em uma fase, mostra ambos os resultados com origem e significado claros.
- Selecionar um momento leva à mesma cultura, data e situação exibidas na cena/widget.
- Ausência de resposta permanece sem dado; erro permite recuperação, sem fallback enganoso.
- As orientações consideram a fase e as evidências disponíveis, sem prescrever irrigação ou quantificar melhora sem suporte do backend.

Referência da implementação local e seus limites: [ATENCAO_NO_CICLO.md](ATENCAO_NO_CICLO.md). Testes relevantes: `src/logic/atencaoCiclo.test.ts`, `src/logic/soilGauge.test.ts` e `tests/atencao-ciclo.spec.ts`.

## Resultado da verificação (15/11/2026, sessão de endpoints)

Contrato conferido no OpenAPI de produção nesta data. `POST /api/rotations/recommendations` respondia 500 durante toda a verificação; o formato abaixo é o do contrato, e os testes usam a fixture montada por ele.

1. **Resposta hídrica da cultura na rotação.** A API **não** entrega série por dia ou decêndio (ETa, ETc, água na zona das raízes, estresse). Entrega, por cultura, em `crops[].crop.risk`: `mean_isna` (ΣETr/ΣETc por estágio FAO-56: inicial, desenvolvimento, meio, fim, média das safras históricas do balanço diário da API), `mean_season_isna` (ciclo inteiro), `critical_stage`, `risk_percentage` e `estimated_yield_loss_pct`. O catálogo (`water_requirements.yield_response_factor`) traz o Ky por estágio.
2. **Semântica.** `mean_isna` é atendimento à demanda (ETa/ETc), a mesma razão do widget, mas por fase e em média histórica. Não é umidade do solo. `GET /api/clima/diario` traz `gwettop`/`gwetroot`, umidade regional do NASA POWER, que não é o balanço da cultura e não substitui estes indicadores. O risco (% de safras com perda acima do limiar) é outra grandeza e segue separado.
3. **Vínculo.** O panorama e o widget derivam da mesma resposta que a lista e o painel. A chave da consulta inclui ponto, solo, histórico e prioridades; trocar a rotação troca o panorama na hora. Sem resposta, nada é exibido no lugar.
4. **Mesma fonte no widget e no panorama.** Feito. Os dois leem `mean_isna` da fase de cada decêndio. As fases são posicionadas pelos estágios FAO-56 da API nas datas da API. A análise sobre a corrida do worker saiu dos indicadores; o motor local continua só no desenho da cena.
5. **Ciclo × eventos internos.** Preservado: rotação favorável no risco geral mostra as fases com atendimento baixo ("mesmo com o ciclo favorável no risco geral"). A fase de maior déficit da API vem marcada.
6. **Método e MOCK.** O widget e o panorama mostram "provisório" quando o servidor marca o risco como MOCK. Origem e período estão no texto ("média das safras históricas da API").
7. **Água, solo, pragas, produção e preços.** Saúde do solo e a nota de produtividade agora vêm da API (`scores`, `soil_protection`). Continuam mock: economia de água, umidade necessária (mm), pragas, produção (sc/ha) e preços. Mapa completo: [MOCK_E_DADOS_REAIS.md](MOCK_E_DADOS_REAIS.md).
8. **Consultas diárias.** A decisão de adiar `GET /api/clima/diario` continua: o endpoint não entrega a resposta da cultura, então reativá-lo não resolveria estes indicadores.

**Limite que fica:** com o atendimento por fase, eventos curtos dentro de uma fase (um veranico de dias) não aparecem; dentro da fase o valor é constante. Resolver isso exige uma série por dia ou decêndio no backend.

Sensibilidade: passou a ser o Ky da fase da API (Ky ≥ 1, FAO-33), no lugar do canal de déficit do motor local (≥ 0,8).
