# Indicadores das rotações

Revisão de 14/11/2026. Este documento descreve como a tela calcula cada um dos quatro indicadores (Resiliência climática, Economia de água, Saúde do solo e Produtividade) e a ordenação das rotações. Para cada um, indica a fórmula, a origem de cada dado (API real ou mock), as faixas de nota, onde a regra está no código e o que falta para sair do mock.

As pendências com o backend estão detalhadas em [PLANO_INTEGRACAO.md](PLANO_INTEGRACAO.md). Este documento só aponta para elas.

## Visão geral

| Indicador | Origem dos dados | Escala da nota | Por safra? | Situação |
|---|---|---|---|---|
| Resiliência climática | Clima real (API) + critérios do ZARC (mock) | Fixa: 10 pontos por ano em 10 | Sim | Calculado |
| Economia de água | `SCORE.agua` (mock) | Relativa às 4 rotações | Não | Ilustrativo |
| Saúde do solo | `SCORE.solo` e `soilWhy` (mock) | Relativa às 4 rotações | Não | Ilustrativo |
| Produtividade | Receita em R$/ha, de sacas e preços em `CT` (mock) | Proporcional à melhor rotação | Só o R$/ha | Ilustrativo (dados), coerente (nota = receita) |
| Ordenação (1º a 4º) | Os mesmos valores dos eixos do mapa | Posição | Não | Segue os indicadores |

"Escala relativa" significa que a nota de uma rotação depende das outras: em água e solo, a melhor das quatro recebe 100 e a pior recebe 12. Na produtividade, a melhor recebe 100 e as demais ficam proporcionais à receita dela. Se uma rotação entrar ou sair, essas notas mudam. A resiliência é a única com escala fixa, o que é pré-requisito para o futuro montador de rotação.

## Nota no mapa e faixas

Código: [`src/logic/aptidao.ts`](../src/logic/aptidao.ts).

- `aptidao(i, rot)` devolve uma nota de 0 a 100 por eixo para a rotação `i`. O mapa de aptidão ([`QuadMap.tsx`](../src/components/QuadMap.tsx)) desenha essa nota da origem (0) até o canto (100).
- `PISO = 12`: a nota mínima, para a pior rotação não sumir no centro do mapa.
- Faixas exibidas como pontos e rótulo:

| Eixo | Ótima | Média | Fraca | Função |
|---|---|---|---|---|
| Resiliência climática | 8 a 10 anos (risco 20% no ZARC) | 6 ou 7 anos (risco 30% ou 40%) | até 5 anos (acima de 40%) | `faixaAnos` / `classeAnos` |
| Água, solo, produtividade | nota ≥ 70 | nota ≥ 40 | nota < 40 | `faixa` |

Cada eixo também tem um valor bruto no sentido "maior = melhor" (`valorEixo`): anos em 10 para a resiliência, R$/ha para a produtividade e `−SCORE` para água e solo. A ordenação usa esses valores.

As faixas da resiliência seguem os níveis de risco do ZARC. As dos outros eixos são cortes ilustrativos, sem fundamentação.

## Resiliência climática

**O que mede:** em quantos de 10 anos a chuva da região bastou para a cultura passar pelas fases críticas do ciclo. Segue o método do Zoneamento Agrícola de Risco Climático (ZARC, MAPA/Embrapa).

**Código:** cálculo em [`src/logic/resiliencia.ts`](../src/logic/resiliencia.ts); parâmetros em [`src/data/zarc.ts`](../src/data/zarc.ts); janelas das safras em `SAFRAS`, em [`src/data/mock.ts`](../src/data/mock.ts); textos em [`aptidao.ts`](../src/logic/aptidao.ts); memória de cálculo em [`MemoriaCalculo.tsx`](../src/components/MemoriaCalculo.tsx).

### Passo a passo

1. **Janela e fases.** Cada safra tem uma janela em decêndios (`SAFRAS`). A janela é dividida nas 4 fases do ZARC, nas proporções 20/30/30/20%: I estabelecimento, II crescimento vegetativo, III floração e enchimento de grãos, IV maturação.
2. **Necessidade de água.** Em cada decêndio, necessidade = Kc × ET0. A ET0 vem da API. O Kc vem da FAO-56: constante na fase I, sobe na II, fica constante na III e desce na IV.
3. **Água no solo.** A capacidade (CAD, em mm) é a da portaria do ZARC da cultura, escolhida pela textura do talhão. Sem textura no cadastro, usa a média.
4. **10 anos típicos.** A API traz, por decêndio, a chuva média e a chuva superada em 8 de cada 10 anos (p20), mas não a série ano a ano. Para cada decêndio, ajustamos uma lognormal que passa pela média e pelo p20. Em seguida geramos 10 anos nos quantis 5%, 15%, …, 95%, com o mesmo quantil em todos os decêndios do ano (um ano seco é seco em toda a safra).
5. **Balanço hídrico.** Em cada ano, de 1º de setembro (solo sem água disponível) até o fim da rotação:
   - a chuva entra no solo até a CAD, e o excesso se perde;
   - a cultura usa o mínimo entre a necessidade e a água disponível;
   - fora das safras, o solo descoberto evapora com Kc 0,3;
   - na troca de cultura, a água acima da nova CAD é descartada.
6. **ISNA por fase.** Para cada fase, ISNA = água usada ÷ água necessária.
7. **Critério.** O ano conta como "chuva bastou" se cada fase avaliada pela portaria atingir o ISNA mínimo:

   | Safra | Critério (`ZarcId`) | Fase I | Fase II | Fase III | CAD arenoso / médio / argiloso |
   |---|---|---|---|---|---|
   | Soja, soja precoce | `soja` | ≥ 0,50 | — | ≥ 0,55 | 32 / 55 / 72 mm |
   | Milho safrinha | `milho2` | ≥ 0,60 | — | ≥ 0,50 | 30 / 47 / 72 mm |
   | Milho + braquiária | `milhoBraquiaria` | ≥ 0,70 | — | ≥ 0,50 | 31,8 / 54,6 / 72,6 mm |
   | Sorgo | `sorgoGranifero` | ≥ 0,60 | — | ≥ 0,45 | 35 / 55 / 75 mm |
   | Crotalária + milheto | `coberturaMilheto` | ≥ 0,70 | ≥ 0,60 | ≥ 0,40 | 42 / 66 / 90 mm |

   As fontes (número da portaria, item e URL) estão em `CRITERIOS`, em `zarc.ts`, e aparecem na memória de cálculo.
8. **Resultado.** O resultado da safra é quantos dos 10 anos passaram. A rotação considera um ano bom só se todas as safras passaram naquele ano; na prática, isso dá o número da safra mais fraca (`safraLimitante`). O nível de risco vem de `nivelZarc`: 8 ou mais = 20%, 7 = 30%, 6 = 40%, até 5 = fora do zoneamento.
9. **Nota no mapa.** `max(12, anos × 10)`. Sem clima carregado, a nota é `null` e a tela mostra "Sem dado".

### Onde aparece

- **Mapa (Comparação):** o eixo "Resiliência climática". O texto ao lado nomeia a safra limitante.
- **"Ver por safra":** a nota de cada safra e o link "Como chegamos nestes números", que mostra todos os dados de entrada e as tabelas por decêndio e por ano.
- **Calendário:** a cor de cada barra de safra e o selo "Clima favorável/arriscado/desfavorável".
- **Tabela de comparação:** o ícone de histórico ao lado da umidade necessária.
- **Painel lateral:** o selo de cada safra da rotação atual e a frase de resumo.

### O que é real e o que é mock

- **Real (API):** `chuva_media`, `chuva_p20`, `et0_media`, `safras`, `fonte` e `celula`, de `/api/clima/decendios`.
- **Mock, com fonte (portaria ou FAO):** ISNA mínimo, CAD, Kc e proporção das fases.
- **Aproximação nossa:**
  - a classe de solo AD da soja e do consórcio, derivada da textura;
  - a mesma proporção de fases para todas as culturas;
  - o critério da cobertura, por analogia com o sorgo forrageiro;
  - o Kc 0,3 do solo sem cultura;
  - o solo vazio em 1º de setembro;
  - os anos sintéticos.
- **Fora da conta:** temperatura e geada, excesso de chuva na colheita, ISNA de excesso hídrico na fase IV, veranicos dentro do decêndio, irrigação.

### Para sair do mock

Ver PLANO_INTEGRACAO.md, Fase 4. Em resumo: critérios do ZARC por UF, cultura e safra, vindos do backend; classe de solo pela granulometria; série climática ano a ano (ou o ISNA calculado no backend); janelas de plantio do ZARC ou do agricultor.

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

**Código:** [`src/logic/rank.ts`](../src/logic/rank.ts); regra também descrita em [HANDOFF-SPEC.md](../HANDOFF-SPEC.md), na seção "Ordenação".

**Regra:**
1. Para cada prioridade marcada na lateral, cada rotação soma quantas outras são melhores que ela naquele eixo. Os valores são os mesmos do mapa (`valorEixo`): anos de resiliência calculados com o clima, receita em R$/ha, e água e solo do mock.
2. As rotações são ordenadas pela soma, da menor para a maior. O desempate é por mais anos com chuva suficiente e, depois, pela ordem de `CT`.
3. Sem prioridade marcada, vale só a resiliência.
4. Enquanto o clima não carrega, a resiliência fica de fora da conta (não há dado para comparar); os demais eixos marcados continuam ordenando.

Até 14/11/2026 a ordenação usava `SCORE.risco`, um mock (5, 8, 10, 15) que não batia com a resiliência calculada. Por isso uma rotação podia aparecer em 2º lugar com o selo "Clima arriscado". Esse campo foi removido.

## Glossário

- **Decêndio:** período de 10 dias (1–10, 11–20, 21–fim do mês). O ano agrícola tem 36, de setembro a agosto (`idx` 0 a 35).
- **ET0:** evapotranspiração de referência, em mm. Vem da API (FAO-56 Penman-Monteith, NASA POWER).
- **Kc:** coeficiente da cultura. Necessidade de água da cultura = Kc × ET0.
- **CAD:** capacidade de água disponível no solo para as raízes, em mm.
- **ISNA:** índice de satisfação das necessidades de água = água usada ÷ água necessária (0 a 1).
- **p20:** chuva superada em 8 de cada 10 anos naquele decêndio.
- **ZARC:** Zoneamento Agrícola de Risco Climático (MAPA/Embrapa). Define épocas de plantio com risco de perda de 20%, 30% ou 40%.
