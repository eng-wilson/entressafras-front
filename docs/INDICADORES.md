# Indicadores das rotações

> **Revisão de 15/11/2026:** com o contrato novo da API, Resiliência, Produtividade e Saúde do solo vêm das escalas 0–100 da API (`scores`), e a ordem vem do `rank` calculado pelas prioridades enviadas. Economia de água continua mock. As seções de Saúde do solo e Produtividade abaixo descrevem o mock anterior e ficam como histórico. Mapa atualizado: [INTEGRACAO_API.md](INTEGRACAO_API.md).

> **Regra do projeto (14/11/2026):** quando a API resolve algo que a tela mostra, o front não calcula; vale só o dado da API. A resiliência climática e a ordem das rotações vêm da API (`POST /api/rotations/recommendations`). O balanço hídrico que o front fazia foi removido. Água, solo e produtividade continuam ilustrativos (mock), porque a API ainda não os entrega. Detalhes: [INTEGRACAO_API.md](INTEGRACAO_API.md).

Revisão de 14/11/2026. Este documento descreve como a tela calcula cada um dos quatro indicadores (Resiliência climática, Economia de água, Saúde do solo e Produtividade) e a ordenação das rotações. Para cada um, indica a fórmula, a origem de cada dado (API real ou mock), as faixas de nota, onde a regra está no código e o que falta para sair do mock.

Estado da integração e pendências com o backend: [INTEGRACAO_API.md](INTEGRACAO_API.md).

## Visão geral

| Indicador | Origem dos dados | Escala da nota | Por safra? | Situação |
|---|---|---|---|---|
| Resiliência climática | Risco hídrico por cultura da API (`risk`) | Fixa: 10 pontos por ano em 10 | Sim | Da API (hoje marcado MOCK pelo servidor) |
| Economia de água | `SCORE.agua` (mock) | Relativa às 4 rotações | Não | Ilustrativo |
| Saúde do solo | `scores.soil_protection` e `soil_protection` da API | Fixa: 0–100 | Não | Da API (índice de planejamento) |
| Produtividade | `scores.productivity` da API (produção preservada) | Fixa: 0–100 | Só o R$/ha (mock) | Da API (hoje marcado MOCK pelo servidor) |
| Ordenação (1º a 4º) | `rank` da API, pelas prioridades enviadas | Posição | Não | Da API (hoje marcado MOCK pelo servidor) |

"Escala relativa" significa que a nota de uma rotação depende das outras: em água e solo, a melhor das quatro recebe 100 e a pior recebe 12. Na produtividade, a melhor recebe 100 e as demais ficam proporcionais à receita dela. Se uma rotação entrar ou sair, essas notas mudam. A resiliência é a única com escala fixa, o que é pré-requisito para o futuro montador de rotação.

## Nota no mapa e faixas

Código: [`src/logic/aptidao.ts`](../src/logic/aptidao.ts).

- `aptidao(i, rot)` devolve uma nota de 0 a 100 por eixo para a rotação `i`. O mapa de aptidão ([`QuadMap.tsx`](../src/components/QuadMap.tsx)) desenha essa nota da origem (0) até o canto (100).
- `PISO = 12`: a nota mínima, para a pior rotação não sumir no centro do mapa.
- Faixas exibidas como pontos e rótulo:

| Eixo | Ótima | Média | Fraca | Função |
|---|---|---|---|---|
| Todas as prioridades (resiliência, água, solo, produtividade) | nota ≥ 70 | nota ≥ 40 | nota < 40 | `faixa` / `faixaDaNota` |

A ordem das rotações não usa estas notas: vem do `rank` da API.

Uma régua só para as 4 prioridades, própria do app: são cortes de apresentação, sem referência normativa. Na resiliência, a nota é a segurança hídrica (100 − risco hídrico da API): risco até 30% = Ótima, 31–60% = Média, acima de 60% = Fraca.

## Resiliência climática

**O que mostra:** o risco hídrico de cada cultura, calculado pela API: a porcentagem das safras históricas em que a perda de produtividade por falta de água passou do limiar (`loss_threshold_pct`, hoje 20%).

**Código:** [`src/logic/resiliencia.ts`](../src/logic/resiliencia.ts) só organiza o que veio da API; textos em [`aptidao.ts`](../src/logic/aptidao.ts); exibição dos dados em [`MemoriaCalculo.tsx`](../src/components/MemoriaCalculo.tsx).

1. **Risco da safra:** `risk.risk_percentage` da cultura, sem nenhuma conta no front.
2. **Segurança hídrica:** só para classificar (selo e cor): 100 − risco, na régua única do app. 70 ou mais = favorável (risco até 30%), 40–69 = arriscado, abaixo de 40 = desfavorável (`classeSeguranca`).
3. **Rotação:** vale a safra mais arriscada (a API entrega o risco por cultura, não por ano).
4. **Nota no mapa:** a segurança hídrica (com a API, `scores.water_security`), com piso de 12.
5. **Sem risco na resposta:** "Sem dado de risco". A tela não estima nada no lugar.

O que o front ainda calcula aqui, por não vir pronto da API: o consumo de água do ciclo (Σ Kc × ET0), com Kc e ET0 da API, e a posição das fases no calendário, pelas datas e estágios FAO-56 da API.

**Ressalva atual:** o servidor marca o risco como `MOCK` (valores provisórios, iguais para qualquer talhão). A tela avisa isso no texto do risco e na memória de cálculo.

## Economia de água

**O que mede (intenção):** quanta água a rotação consome. Menos consumo = melhor.

**Como é calculado hoje:** a partir de um número fixo por rotação em `SCORE.agua`, em [`mock.ts`](../src/data/mock.ts). Menor = melhor; a unidade não está documentada.

| Rotação | `SCORE.agua` | Nota |
|---|---|---|
| Soja → crotalária + milheto | −8 | 100 |
| Soja → sorgo | −7 | 78 |
| Soja precoce → milho + braquiária | −6,5 | 67 |
| Soja → milho safrinha | −4 | 12 |

Nota = `round(12 + 88 × (max − valor) ÷ (max − min))`, com o mínimo e o máximo calculados entre as 4 rotações.

**Inconsistência conhecida:** o "Ver por safra" mostra o consumo de água calculado pelo clima real (Σ Kc × ET0, em mm). Esse consumo não alimenta a nota do eixo, então os dois podem se contradizer.

**Para sair do mock:**
- definir o que o eixo mede: consumo total do ciclo (Σ Kc × ET0), eficiência (receita por mm) ou água que sobra no solo para a safra seguinte;
- passar a usar a soma do consumo calculado das safras;
- adotar uma escala fixa (mm), em vez da relativa.

## Saúde do solo

**O que mede (intenção):** se a rotação melhora, mantém ou degrada o solo (cobertura, palhada, nitrogênio, tempo descoberto).

**Como é calculado hoje:**
- **Nota:** `SCORE.solo`, em [`mock.ts`](../src/data/mock.ts). Menor = melhor; a unidade não está documentada.
- **Texto:** `CT[i].soilWhy`, uma frase escrita à mão.

| Rotação | `SCORE.solo` | Nota | Texto (`soilWhy`) |
|---|---|---|---|
| Soja → crotalária + milheto | 0 | 100 | Fixa nitrogênio e cobre o solo |
| Soja precoce → milho + braquiária | 10 | 92 | Raízes e palha da braquiária |
| Soja → sorgo | 60 | 52 | A palhada do sorgo protege o solo |
| Soja → milho safrinha | 110 | 12 | Solo descoberto por 4 meses |

Mesma fórmula relativa da Economia de água.

**Para sair do mock:** este indicador é da rotação inteira, porque depende de como as safras se combinam. Insumos candidatos:
- meses de solo descoberto, que já dá para tirar das janelas em `SAFRAS`;
- palhada produzida por cultura (t/ha de matéria seca; o catálogo local já tem a unidade `t/ha MS` para coberturas);
- fixação de nitrogênio por leguminosa;
- análise de solo do talhão.

Falta fonte para converter esses insumos em nota.

## Produtividade

**O que mede (intenção):** retorno econômico da rotação.

**Como é calculado hoje:**
- **Receita:** `receitaHa(i)` = sacas × preço da 1ª safra + sacas × preço da 2ª safra, com `y1`, `p1`, `y2` e `p2` de `CT`. O que não é vendido conta como 0. Por safra: `receitaSafra(i, 0 | 1)`, exibida no "Ver por safra".
- **Nota:** `max(12, round(100 × receita ÷ maior receita entre as rotações))`. A nota é proporcional ao R$/ha exibido ao lado.

| Rotação | Receita | Nota |
|---|---|---|
| Soja precoce → milho + braquiária | 55 × R$ 152,45 + 105 × R$ 66,60 = R$ 15.378/ha | 100 |
| Soja → milho safrinha | 52 × R$ 152,45 + 98 × R$ 66,60 = R$ 14.454/ha | 94 |
| Soja → sorgo | 58 × R$ 152,45 + 62 × R$ 44,00 = R$ 11.570/ha | 75 |
| Soja → crotalária + milheto | 58 × R$ 152,45 = R$ 8.842/ha | 57 |

Até 14/11/2026 a nota vinha de `SCORE.prod`, um mock sem unidade que não batia com o R$/ha (a crotalária ficava com 12). Esse campo foi removido.

**Ainda mock:** produtividade (sacas/ha) e preço por cultura, ambos em `CT`.

**Para sair do mock:**
- produtividade esperada por cultura e região;
- preço de referência com data;
- custo de produção, para chegar à margem e não só à receita;
- adotar uma escala fixa (R$/ha), em vez da proporcional à melhor;
- possivelmente descontar a resiliência (receita esperada = produtividade × probabilidade de a safra dar certo).

## Ordenação das rotações (1º a 4º)

**Código:** [`src/logic/rank.ts`](../src/logic/rank.ts) e [`src/logic/rotacoesApi.ts`](../src/logic/rotacoesApi.ts) (`prioridadesApi`).

A ordem é o `rank` da API. As prioridades de "O que importa" vão na requisição (`priorities`): Resiliência → `water_security`, Produtividade → `productivity`, Saúde do solo → `soil_protection`. Com todas desligadas, a API ordena pelo pior risco hídrico. Economia de água não existe na API e não muda a ordem. O front não reordena.

## Glossário

- **Decêndio:** período de 10 dias (1–10, 11–20, 21–fim do mês). O ano agrícola tem 36, de setembro a agosto (`idx` 0 a 35).
- **ET0:** evapotranspiração de referência, em mm. Vem da API (FAO-56 Penman-Monteith, NASA POWER).
- **Kc:** coeficiente da cultura. Necessidade de água da cultura = Kc × ET0.
- **CAD:** capacidade de água disponível no solo para as raízes, em mm.
- **ISNA:** índice de satisfação das necessidades de água = água usada ÷ água necessária (0 a 1).
- **p20:** chuva superada em 8 de cada 10 anos naquele decêndio.
