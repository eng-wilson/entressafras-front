# Períodos críticos das rotações

Revisão de 14/11/2026. Este documento descreve como a tela mostra **onde, no ciclo, está o risco de cada rotação**, ou seja, por que ela recebeu o selo "Clima favorável", "arriscado" ou "desfavorável". É para quem mantém o backend.

**Regra do projeto:** quando a API resolve algo que a tela mostra, o front não calcula; vale só o dado da API. O período crítico vem da API (`risk.critical_stage` em `POST /api/rotations/recommendations`). O diagnóstico antigo, que lia o balanço hídrico feito no front, foi removido junto com esse balanço.

## O que a tela mostra

1. **No selo de cada linha**, o motivo vem escrito junto do nível: "Arriscado · seca na floração (mar–abr)" (`motivoCurto`). Rotações favoráveis mantêm "Clima favorável". O tooltip traz a frase completa (`textoCritico`).
2. **No calendário**, a barra da safra ganha uma hachura sobre a fase crítica.
3. **Ao selecionar uma rotação**, a simulação pula para o **período decisivo**, o da safra mais arriscada.
4. **Na faixa de meses e no slider**, os decêndios da fase decisiva ganham uma faixa na cor do nível.
5. **No chip do talhão**, quando o decêndio simulado cai no período crítico, aparecem o estágio, "Período crítico" e o efeito agronômico geral da fase (`PROBLEMA_FASE`, texto fixo, não um cálculo).
6. **No painel lateral**, cada safra mostra o seu risco e o período crítico.

## Origem de cada dado

| Dado | Origem | Uso |
|---|---|---|
| `risk.risk_percentage` | API (rotações) | Nível da safra (selo e cor) |
| `risk.critical_stage` | API (rotações) | Qual fase é o período crítico |
| `risk.mean_isna` | API (rotações) | Exibido na memória de cálculo e no período (`isna`) |
| `planting_date`, `harvest_date` | API (rotações) | Janela da safra no calendário |
| `water_requirements.stage_length_days` | API (catálogo, dentro da rotação) | Onde cada fase cai dentro da janela |
| `chuva_media`, `chuva_p20`, `et0_media` | API (clima por decêndio) | Déficit de leitura da fase (consumo menos chuva) |
| `water_requirements.crop_coefficient` | API | Consumo da cultura (Kc × ET0) |

## Regra

Código: [`src/logic/diagnostico.ts`](../src/logic/diagnostico.ts), com testes em [`diagnostico.test.ts`](../src/logic/diagnostico.test.ts).

Uma safra tem período crítico quando:

1. a API trouxe o risco e a fase crítica (`critical_stage` não nulo);
2. a safra **não é favorável**: segurança hídrica (100 − risco) abaixo de 70, ou seja, risco acima de 30% (régua única do app).

O período é a fase apontada pela API, posicionada no calendário pelos estágios FAO-56 da cultura (estágios inicial, desenvolvimento, meio e fim = fases I a IV).

**Período decisivo** (para onde a simulação pula): o da safra mais arriscada. Empate: maior déficit no ano seco; depois, o primeiro no ciclo.

## Campos de cada período

| Campo | Significado |
|---|---|
| `safra`, `nome` | Qual safra da rotação (0 = 1ª) e o nome exibido |
| `fase`, `nomeFase` | Fase (0 = I … 3 = IV), de `critical_stage` |
| `de`, `ate`, `rotulo` | Primeiro e último decêndio da fase e o texto "11 mar a 20 abr" |
| `pct` | Risco hídrico da API, % |
| `cls` | Nível pela segurança hídrica (`good` / `warn` / `risk`) |
| `isna` | ISNA médio da fase, da API |
| `deficitMedio`, `deficitSeco` | Consumo da cultura menos a chuva na fase, mm (ano médio e ano seco); null sem clima. Só leitura |

## Com a fixture atual (resposta real reduzida, risco MOCK)

| Rotação | Risco da 2ª safra | Período crítico |
|---|---|---|
| Soja → milheto | 20% | Nenhum (favorável) |
| Soja → sorgo | 20% | Nenhum (favorável) |
| Soja → milho safrinha | 45% | Milho safrinha, floração e enchimento (fase III) |
| Soja → algodão | 40% | Algodão, floração e enchimento (fase III) |

A soja tem 10% em todas e não é marcada.

## Limitações

- **Risco MOCK:** hoje o servidor devolve valores provisórios, iguais para qualquer talhão e solo (`method: "MOCK"`). A tela avisa. Quando vier `FAO56_SIMPLIFIED_KY`, nada muda no front.
- **Uma fase por cultura:** a API aponta só a fase de maior déficit, não a frequência por fase.
- **Só água:** geada, calor na floração e excesso de chuva na colheita não geram período crítico.
