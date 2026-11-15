# Impacto das decisões: arquitetura e confiabilidade dos dados

Como simulação transforma estado do talhão em números de decisão (sc/ha, % do potencial, R$/ha, chance de ganhar). Como peças se encaixam. O que garante confiança nesses números.

Docs irmãos:
- [ARQUITETURA_SIM.md](ARQUITETURA_SIM.md): dia da simulação, processo a processo (seção 5 detalha módulos de impacto);
- [INTEGRACAO_DADOS_EXTERNOS.md](INTEGRACAO_DADOS_EXTERNOS.md): troca de clima e solo sintéticos por dados reais;
- [PLANO_ASSETS_CROPS.md](PLANO_ASSETS_CROPS.md): parte visual.

---

## 1. Problema

Protótipo de UI mostrava selos ("Bom", "Atenção", "Risco"), barras coloridas, alertas ("Mais pragas"). Pesquisa com usuários apontou três lacunas:

| Lacuna | Pergunta sem resposta | O que a simulação passa a entregar |
|---|---|---|
| Não sinto o impacto das decisões | Quanto ganho ou perco se trocar de rotação? | Produtividade e perda por causa, em sc/ha, % do potencial e R$/ha |
| Não vejo a ligação entre clima, rotação e talhão | O clima previsto é normal? A seca cai numa fase sensível? | Clima contra o ano normal, eventos críticos (seca × fase) e estresse diário (Ks, NDVI esperado) |
| Não sinto o peso da comparação | Por que escolher A e não B? | Comparação pareada: chance de B ganhar, delta por causa e corte do que não difere |

Regra geral: **tela não inventa números**. Selo, cor e frase saem de saída da simulação. Essa saída tem origem conhecida (seção 6).

---

## 2. Esqueleto

```
 ENTRADAS                         SIMULAÇÃO (pura, determinística)                 RESULTADO
 ────────                         ────────────────────────────────                 ─────────
 clima ─────────┐
  climaRegional │   ┌─────────────────────────────────────────────┐
  (ou cenário)  ├──►│ simulateSeason            (season.js)       │
 solo ──────────┤   │  9 processos por dia: água, raiz, estresse, │
  cenario.solo  │   │  crescimento...                             │
  classe        │   │  + serieDoDia            (impacto.js)       │──► série diária: Ks, umidade,
 cultura ───────┤   │  + resumoSafra / eventos (impacto.js)       │    NDVI esperado, perda do dia
  crops/*.js    │   └───────────────┬─────────────────────────────┘──► resumo: sc/ha, % potencial,
  agronomia.js ─┘                   │ estadoFinal                       perda por causa e componente
                                    ▼                                ──► eventos críticos
                    ┌───────────────────────────────────┐
                    │ simulateRotacao      (rotacao.js) │  herança de solo (solo/entressafra.js)
                    │  safra → entressafra → safra      │  pressão de pragas (pragas.js)
                    └───────────────┬───────────────────┘
                                    ▼
          ┌─────────────────────────┴──────────────────────────┐
          ▼                                                    ▼
 ┌──────────────────────────────┐            ┌──────────────────────────────────┐
 │ avaliarRotacao / comparar    │            │ medirIntervencoes / ...Anos      │
 │  (comparar.js)               │            │  (contrafactual.js)              │
 │  N anos, mesmo clima para A  │            │  mesma safra com o solo corrigido│
 │  e B, delta por causa        │            │  por intervenção                 │
 └──────────────┬───────────────┘            └──────────────┬───────────────────┘
                ▼                                           ▼
                                                 "Calagem e gessagem: +29 % do potencial"
                ▼
 "B ganha R$ 400/ha em média e é melhor em 7 de 10 anos; o ganho vem do nematoide na soja"
```

Três camadas, dependência só para baixo:

1. **Física do dia** (`season.js` e processos). Já existia. Só ganhou saídas, sem mudança de comportamento (hash de `test/sim-referencia.mjs` não mudou).
2. **Tradução em impacto** (`impacto.js`). Lê estado da planta, devolve números de decisão.
3. **Perguntas de decisão** (`rotacao.js`, `comparar.js`, `indicadores.js`, `contrafactual.js`). Chamam simulação várias vezes, com variações controladas.

Simulação continua pura: sem DOM, sem rede, mesma entrada → mesmo resultado bit a bit. Roda em Node (testes), navegador e Web Worker.

---

## 3. Módulos e contratos

| Módulo | Recebe | Devolve |
|---|---|---|
| `simulation/season.js` `simulateSeason` | `crop, classe, cenario, plants`; opcionais `retratos`, `herdar`, `potencial` | retratos diários (visual) + `impacto { serie, resumo, eventos }` + `estadoFinal` |
| `simulation/planta/crescimento.js` | estresse do dia | além do crescimento, a atribuição `atrib` / `atribDia`: quanto de cada perda veio de cada canal |
| `simulation/impacto.js` | estado + série | `resumo`: `produtividade`, `potencial`, `perdas` e `perdasPct` por canal, `componentes`; `eventos[]` com fase, dias, perda e clima do trecho |
| `climate/clima-regional.js` | semente do ano, data de plantio | clima no contrato de `forcante.js`; `climaVsNormal` (decêndios contra o normal e p10–p90); `sobreposicaoRisco` |
| `simulation/rotacao.js` | rotação (lista de safras com data), sementes de ano, solo | uma saída por safra: resumo com pragas, eventos, economia, solo herdado |
| `simulation/solo/entressafra.js` | estado final da safra anterior | função `herdar` (palhada, N, compactação, biologia, água) |
| `simulation/pragas.js` | pressão e hospedeiro | perda por pragas e pressão da próxima safra |
| `simulation/comparar.js` | duas avaliações nos mesmos anos | `probBMelhor`, delta p10/p50/p90, pior e melhor ano, `motivos`, `relevantes`, `atributos`, `frase` |
| `simulation/contrafactual.js` | cenário + lista de intervenções | ganho por intervenção (pp, relativo, perda evitada), "todas juntas", interação; faixa por ano |
| `domain/crops/agronomia.js` | id da cultura | potencial, resíduo, hospedeiro e sensibilidade a pragas |

Regras de contrato:

- **Perda fecha.** Soma das perdas por causa = exatamente `potencial − produtividade`, por planta e no talhão. Na comparação também: soma dos motivos = exatamente delta de margem de cada ano. Testes conferem os dois.
- **Mesma cultura ou troca.** Na comparação, perda por causa só se compara entre safras da mesma cultura. Cultura muda (milho → crotalária): diferença da safra inteira vira causa única, "troca de cultura". Sem essa regra, cobertura sem venda pareceria "evitar a seca do milho".
- **Sintoma e causa são medidas diferentes.** Perda por canal diz sintoma (déficit hídrico). Contrafactual diz causa (compactação deixou raiz rasa). Tela usa canal para explicar o que aconteceu, contrafactual para dizer o que fazer.

---

## 4. Uma pergunta, do começo ao fim

"Vale trocar soja → milho safrinha por soja → crotalária + milheto neste talhão compactado?"

1. `avaliarRotacao(ROTACOES.soja_milho, { anos: 8, solo })` e mesmo para `soja_crotalaria_milheto`. Cada ano roda ciclo de aquecimento (solo e pragas chegam no estado da própria rotação) e ciclo medido.
2. Em cada safra, `simulateSeason` roda com `retratos: false` (~45 ms) e herança da safra anterior.
3. Pragas entram sobre o resumo.
4. `compararProdutividade(A, B)` pareia anos (mesmo clima nas duas). Dá diferença da soja seguinte em pontos do potencial.
5. Tela mostra frase, chance de ganhar, pior ano, motivos relevantes. Exemplo do solo compactado: crotalária perde R$ 1.103/ha por ano contra milho safrinha. Soja seguinte ganha +6,9 sc/ha, quase tudo por menos nematoide.

Custo: 4 rotações × 6 anos ≈ 4 s no Node. Na tela, rode em Web Worker e mostre resultado quando pronto.

---

## 5. Medidas e quando usar cada uma

| Medida | Exemplo | Quando usar |
|---|---|---|
| % do potencial | "−42 % do potencial" | Primeira linha de qualquer resultado. Não depende do teto em sc/ha, número menos calibrado |
| Pontos percentuais (pp) | "Descompactar: +18 %" | Ganho de intervenção somado à perda do resumo (−42 % → −24 %) |
| Ganho relativo | "Gesso +28 %" | Comparar com ensaios publicados, que usam essa forma |
| Perda evitada | "A compactação custou 30 %" | Comparar com a forma "a compactação reduziu 30 %" |
| sc/ha, t/ha | "−104,9 sc/ha" | Detalhe, depois do percentual |
| R$/ha | "+R$ 448/ha" | Decisão econômica. Sempre com faixa de preço |
| Chance | "melhor em 7 de 10 anos" | Comparação entre opções. Mais honesto que média sozinha |
| Faixa p10–p90 | "+18 % (9–25 %)" | Sempre que número depende do clima |

Regra de exibição: **sem faixa, sem certeza**. Faixa de um delta cruza zero: tela diz "sem diferença clara", não escolhe vencedor.

---

## 6. Confiabilidade dos dados

### 6.1 Princípios

1. **Todo número tem origem declarada.** Medido, publicado, calibrado ou suposto (tabela 6.2). Origem viaja com número até a tela.
2. **Fonte manda.** Simulação discorda de faixa publicada: teste quebra. Ajuste vai em `PARAMS` ou na cultura, nunca na faixa.
3. **Percentual antes de absoluto.** Percentual cancela potencial em sc/ha, valor mais incerto.
4. **Comparar no mesmo clima.** Na comparação pareada, erro do modelo que afeta as duas opções igual se cancela. Diferença entre opções é mais confiável que valor de cada uma.
5. **Faixa, não ponto.** Resultado dependente do clima sai com p10–p90 de vários anos.
6. **Nada vira certeza na tela.** "Valores calibrados para visualização, não para previsão agronômica" vale até validação de campo (6.4, nível 4).

### 6.2 Origem de cada número hoje

Níveis:
- **A**: medido no talhão ou observado (satélite, estação);
- **B**: publicado por fonte técnica (Embrapa, CONAB), com referência;
- **C**: calibrado contra B por teste automático;
- **D**: suposição de ordem de grandeza, a substituir.

| Dado | Onde está | Nível hoje | Próximo passo |
|---|---|---|---|
| Clima diário | `domain/soil/scenarios.js`, `climate/clima-regional.js` (normais sintéticas do Cerrado goiano) | D | NASA POWER e Open-Meteo ([INTEGRACAO_DADOS_EXTERNOS.md](INTEGRACAO_DADOS_EXTERNOS.md)) → A |
| Solo (água, textura) | `domain/soil/presets.js` | D | SoilGrids ou laudo de análise → A/B |
| Solo por célula (compactação, acidez, fertilidade) | cenários | D | laudo, penetrômetro e camada de manejo do produtor → A |
| Resposta da cultura à seca na floração | `PARAMS.crescimento.espiga`, `crop.sensibilidade` | C | já testado contra Embrapa (6.3) |
| Resposta à compactação e à acidez | `PARAMS.raiz`, `morfologia.toleranciaAl` | C | já testado; faltam mais ensaios para a soja |
| Encharcamento e geada | `PARAMS.estresse` | D | sem percentual Embrapa encontrado; buscar ensaios ou marcar como qualitativo |
| Potencial (sc/ha) | `domain/crops/agronomia.js` | D | ZARC ou ensaios regionais da Embrapa → B |
| Resíduo, crédito de N, descompactação | `domain/crops/agronomia.js`, `PARAMS.entressafra` | D | ensaios de plantas de cobertura (Embrapa Cerrados, Agropecuária Oeste) → B |
| Pragas (nematoide, percevejo) | `domain/crops/agronomia.js`, `PARAMS.pragas` | D (perda máxima: C) | laudo nematológico do talhão → A; dinâmica populacional publicada → B |

Leitura honesta: **física da resposta da planta calibrada; entradas (clima, solo, preço) ainda sintéticas.** Comparação entre rotações já útil como ordem de grandeza e direção. Ainda não é previsão para talhão real.

### 6.3 Camadas de garantia

| # | Garante | Como | Comando |
|---|---|---|---|
| 1 | Refatoração não muda resultado | hash bit a bit dos retratos diários, 8 cenários × 3 solos | `node test/sim-referencia.mjs` |
| 2 | Contratos e sentido agronômico | perdas fecham, veranico gera evento na floração, crotalária reduz nematoide, comparação fecha por causa, clima pareado | `node test/sim-impacto.mjs` |
| 3 | Ordem de grandeza publicada | faixas da Embrapa por caso (tabela abaixo) | `node test/sim-faixas.mjs` |
| 4 | Talhão real | produtividade colhida e NDVI observado contra o esperado (proposta, 6.4) | a criar |
| 5 | Revisão agronômica | agrônomo revisa `agronomia.js`, `PARAMS` e as faixas a cada mudança de calibração | revisão de PR |

Faixas em uso (`test/sim-faixas.mjs`, `FAIXAS_EMBRAPA`):

| Caso | Simulação | Referência | Fonte |
|---|---|---|---|
| Milho, 25 dias sem chuva em VT–R1 | −58 % | uma semana no florescimento: −50 %; estresse no florescimento: > 50 % | Durães et al., Circ. Téc. 39, Embrapa Milho e Sorgo, 2004 |
| Soja, 25 dias sem chuva em R1–R5 | −39 % | −30 a −40 % | Embrapa Cerrados, BRS 7581RR |
| Compactação em safra com veranico (milho / soja) | 40 % / 34 % evitada | 30 % / 28 % | Embrapa Soja (Debiasi, Circ. Téc. 2008; portal SECA) |
| Compactação, ano seco contra ano mediano | p90 24 % contra p50 9 % | perdas concentradas em safras com falta de água | Embrapa Soja |
| Acidez e Al no subsolo, milho (mediana de 8 anos) | 32 % evitada | gesso +27,9 % (≈ 22 % evitada); mais sob veranico | Embrapa Cerrados, relatório de impacto 2013; Circ. Téc. 32, 2005 |
| Acidez e Al no subsolo, soja | 10 % evitada; menor que no milho | resposta ao gesso bem menor que a do milho | Circ. Téc. 32, 2005 |
| Nematoide na soja, perda máxima | 25 % | até 50 % | Embrapa Soja (Franchini et al., 2014) |

### 6.4 Validação com talhão real (a construir)

Nível 4 é único que diz se modelo acerta *aquele* talhão. Proposta:

1. **NDVI.** Série diária já tem `ndvi` esperado. Compare com NDVI observado (HLS 30 m, já citado no protótipo como "Observado · HLS 30 m"). Métrica: erro médio por fase. Erro acima do limite: tela troca "esperado" por "esperado (baixa confiança)".
2. **Produtividade colhida.** Fim de cada safra, produtor informa sc/ha. Guarde par (simulado, colhido) por talhão. Após 3 safras, calcule viés e corrija potencial do talhão (potencial = número nível D mais fácil de ajustar com dado real).
3. **Laudos.** Análise de solo (acidez, Al, P, K por camada) e laudo nematológico substituem valores de cenário. Cada valor de laudo entra com data e laboratório.
4. **Retroteste.** Com clima real de safras passadas (NASA POWER) e produtividade registrada, rode simulação e meça erro. Essa conta diz quanto alargar faixa p10–p90 da tela.

### 6.5 Como mudar um número

Toda mudança em `PARAMS`, `crops/*.js`, `domain/crops/agronomia.js`:

1. Registre fonte no comentário do valor (autor, publicação, ano) ou marque `suposição`.
2. Fonte tem número: acrescente ou ajuste faixa em `FAIXAS_EMBRAPA` (`test/sim-faixas.mjs`) com citação.
3. Rode os três testes. `sim-referencia` mudou: mudança de comportamento é intencional. Confira visualmente e grave com `--gravar` no mesmo commit.
4. Registre no PR antes e depois dos casos afetados, em % do potencial.

### 6.6 O que a tela mostra sobre confiança

- Selo de origem por número: **observado**, **publicado**, **estimado**. "Estimado" cobre níveis C e D.
- Faixa sempre que existir. Delta com faixa cruzando zero vira "sem diferença clara".
- Diferença abaixo do limiar (`limiarRS`, hoje R$ 50/ha) não aparece como motivo. Evita que valores repetidos diluam o que importa.
- "De onde vem isso?" abre fonte do número (UI do protótipo já tem botão).

### 6.7 Lacunas conhecidas

- **Clima e solo sintéticos.** Maior fonte de erro hoje. Caminho em [INTEGRACAO_DADOS_EXTERNOS.md](INTEGRACAO_DADOS_EXTERNOS.md).
- **Encharcamento e geada** sem percentual Embrapa encontrado. Sem teste de faixa.
- **Compactação em ano médio** abaixo dos 28–30 % da Embrapa (9 %). Simulação só chega perto em ano seco. Falta saber se número da Embrapa é média de anos ou ensaio com seca.
- **Resposta da soja ao gesso** confere só direção. Único número achado (+14 % sob veranico) não conferido no PDF original.
- **Pragas** = índice simplificado. Só perda máxima tem referência.
- **Preços, custos, potenciais** = ordem de grandeza, sem data de cotação.
- **Consórcio** entra no resíduo, nas pragas e no custo. Competição entre as duas plantas não simulada.

---

## 7. Comandos

```
node test/sim-referencia.mjs     # comportamento idêntico (refatoração)
node test/sim-impacto.mjs        # contratos e sentido agronômico
node test/sim-faixas.mjs         # faixas publicadas pela Embrapa
npx http-server -c-1 .           # app em http://localhost:8080/
```

---

## 8. Fontes

- Durães, F. O. M. et al. *Fenotipagem associada a tolerância a seca em milho*. Circular Técnica 39, Embrapa Milho e Sorgo, 2004. <https://www.infoteca.cnptia.embrapa.br/bitstream/doc/487708/1/Circ39.pdf>
- Impacto do déficit hídrico em diferentes fases da soja (Embrapa Cerrados, BRS 7581RR). Revista Cultivar. <https://revistacultivar.com.br/artigos/impacto-do-deficit-hidrico-em-diferentes-fases-do-desenvolvimento-da-soja>
- Debiasi, H. Circular Técnica, Embrapa Soja, 2008. <https://ainfo.cnptia.embrapa.br/digital/bitstream/item/52268/1/Circular-Tecnica.pdf>
- Embrapa Soja. *SECA – Soja em Carência de Água: manejo do solo*. <https://bioinfo.cnpso.embrapa.br/seca/index.php?option=com_content&view=article&id=75&Itemid=478>
- Embrapa Cerrados. Relatório de avaliação dos impactos: gesso agrícola no milho, 2013. <https://bs.sede.embrapa.br/2013/relatorios/cerrados_2013_gessomilho.pdf>
- Sousa, D. M. G.; Lobato, E.; Rein, T. A. *Uso de gesso agrícola nos solos do Cerrado*. Circular Técnica 32, Embrapa Cerrados, 2005. <https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/568533/1/cirtec32.pdf>
- Embrapa Soja. Manejo do solo na entressafra para redução de Pratylenchus brachyurus em soja. <https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/986687/1/Manejodosoloduranteaentressafraparareducaodapopulacaoedanosdonematoidedaslesoesradicularesemsoja.pdf>
- Embrapa Clima Temperado. Comunicado Técnico 388 (encharcamento em milho). <https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1146999/1/CPACT-Comunicado-Tecnico-388.pdf>

> Economia em R$ (preço, custo, margem) removida do produto. Onde este doc ainda fala em R$/ha, leia como histórico: decisões hoje usam % do potencial, anos com risco e indicadores de solo ([DECISAO_ROTACOES.md](DECISAO_ROTACOES.md)).
