# Arquitetura da simulação

Organização de `src/simulation/`, cálculo de um dia, onde mexer para cada mudança.

Docs irmãos: [PLANO_ASSETS_CROPS.md](PLANO_ASSETS_CROPS.md) (visual), [INTEGRACAO_DADOS_EXTERNOS.md](INTEGRACAO_DADOS_EXTERNOS.md) (dados reais), [IMPACTO_E_CONFIABILIDADE.md](IMPACTO_E_CONFIABILIDADE.md) (impacto das decisões, confiabilidade dos números).

---

## 1. Ideia

- **Um estado, vários processos.** Estado (`estado.js`) = arrays por célula, camada e planta. Sem regras. Cada processo físico = função `processo(E, ctx)` em arquivo próprio. Lê e escreve partes do estado.
- **Cada processo declara o que lê e escreve** no comentário do topo. Contrato entre quem mexe em água e quem mexe em planta.
- **Orquestrador (`season.js`) é receita.** Lista `PROCESSOS` dá ordem do dia. Sem física nele.
- **Números calibráveis em `parametros.js`**, com nome e unidade, agrupados por processo. Código dos processos sem limiar solto.
- **Simulação pura**: sem DOM, sem rede, determinística. Mesma entrada, mesmo resultado bit a bit no navegador, no Node e em Web Worker.

---

## 2. Arquivos

```
src/simulation/
  season.js           orquestrador: simulateSeason, lista PROCESSOS, reexporta a API pública
  parametros.js       PARAMS: limiares e taxas por processo
  estado.js           grade (GRID, CAMADAS, CAMADA_M), criarEstado, inicializarEstado, limitesAgua
  forcante.js         clima da safra e do dia
  fenologia.js        t, emergiu, kc, cobertura, raiz potencial, crescimento potencial, demanda
  solo/
    agua.js           entradaAgua, transpiracao, redistribuirPoca
    raiz.js           frente de raiz (taxa diária, memória), densidade por camada, raiz morta e barreira
    gleizacao.js      dias saturado e gley
    superficie.js     crosta, rachadura, temperatura da superfície
    nitrogenio.js     adubação, lixiviação, desnitrificação, mineralização
  planta/
    estresse.js       agudo por canal, disponibilidade de nutrientes, agudo -> crônico, geada
    crescimento.js    altura, espiga, senescência, acamamento
  retrato.js          texturas S0–S2 e P0–P1, registro das plantas, decodificador, perfilCelula
  impacto.js          série diária (Ks, NDVI esperado, perda do dia), produtividade, perda por causa, eventos críticos
  climaRegional.js    clima por ano agrícola e data de plantio, ano normal, faixa p10–p90, sobreposição seca × fase
  rotacao.js          safras encadeadas no talhão (simulateRotacao) e rotações de exemplo (ROTACOES)
  comparar.js         avaliação em N anos e comparação pareada entre duas rotações
  pragas.js           pressão de nematoide e percevejo entre safras (índice simplificado)
  solo/entressafra.js herança de solo entre safras: palhada, N, descompactação, biologia, água
```

Dados de resultado por cultura (produto, resíduo, pragas): `src/domain/crops/agronomia.js`. Posição das plantas, pura: `src/domain/plantio.js`. Várias safras e anos: código fora de `src/simulation/` importa de `rotacao.js`, `comparar.js`, `climaRegional.js`.

Safra única: código fora de `src/simulation/` importa só de `season.js`: `simulateSeason`, `GRID`, `CAMADAS`, `CAMADA_M`, `PROF_TOTAL_M`, `celulaDe`, `bilinear`, `perfilCelula`.

---

## 3. Um dia

`ctx` montado uma vez por dia. Só leitura para os processos:

| Campo | Conteúdo |
|---|---|
| `dia` | índice do dia (0 = plantio) |
| `clima` | `{ chuva, tmax, tmin, et0 }` do dia, de `forcante.js` |
| `fen` | `{ t, tPrev, emergiu, kc, cob, raizPot, dPot, req }`, de `fenologia.js` |
| `agua` | `{ SAT, FC, WP, SECO }` da classe de solo, mm por camada de 100 mm |
| `crop`, `classe` | dados da cultura e da classe de solo |
| `manejo` | `{ adubN }` (eventos do produtor) |
| `par` | `PARAMS` (ou parâmetros passados a `simulateSeason`) |

Ordem dos processos e saída de cada um:

| # | Processo | Lê | Escreve |
|---|---|---|---|
| 1 | `entradaAgua` | chuva, et0, cobertura, crosta, comp, palhada, tráfego, lençol, raiz e poça de ontem | `W`, `escLocal`, `escoamentoGlobal`, `lixiviado` |
| 2 | `raiz` | W, comp, acid, bio, satDias, temperatura, raiz potencial da fase | `raizCel` (frente com memória), `raizPotCel`, `raizDens`, `raizMorta`, `barreira` |
| 3 | `transpiracao` | raizCel, raizDens, W, satDias, acid, et0, kc | `W`, `dispRel`, `excesso`, `acidRaiz` |
| 4 | `gleizacao` | W | `satDias`, `gley` |
| 5 | `superficie` | chuva, tmax, cobertura, palhada, bio, W | `crosta`, `rachadura`, `tsup` |
| 6 | `nitrogenio` | lixiviado, excesso, mo, bio, adubação | `fert.N` |
| 7 | `redistribuirPoca` | escLocal, escoamentoGlobal, pesoEsc | `poca` |
| 8 | `estresse` | dispRel, excesso, acidRaiz, raiz, tsup, sal, relevo, fert, clima | `agudo`, `cron` |
| 9 | `crescimento` | agudo, cron, fenologia | `hAcc`, `hPot`, `espiga`, `senesc`, `acama` |

Após os processos, `retrato.js` empacota o dia: texturas Uint8 (solo) e registro Float32 das plantas. Renderização e inspetor leem esses dados.

Ordem importa. Raiz roda antes da transpiração: define de onde planta tira água. Drenagem usa raiz de ontem, porque roda antes da raiz de hoje. Poça de hoje só existe no fim do dia e entra na infiltração de amanhã.

---

## 4. Onde mexer

| Quero... | Arquivo |
|---|---|
| Calibrar limiar ou taxa | `parametros.js` |
| Mudar infiltração, drenagem ou evaporação | `solo/agua.js` |
| Mudar quando a raiz para e por quê | `solo/raiz.js` |
| Adicionar nutriente ao balanço (P, K com perdas) | novo processo em `solo/` + linha em `PROCESSOS` |
| Trocar fase por graus-dia | `fenologia.js` |
| Ligar clima real (NASA POWER, Open-Meteo) | `forcante.js` recebe forçante de `src/climate/` (ver doc de integração) |
| Umidade inicial ou solo de dados reais | `inicializarEstado` em `estado.js` |
| Assimilar umidade observada | novo processo após `entradaAgua` |
| Novo efeito visível na planta | `planta/estresse.js` ou `planta/crescimento.js`, e campo no registro (`retrato.js` + `domain/channels.js`) |
| Novo canal no modo mapa | `retrato.js` (textura) + `render/soil/maps.js` |

Adicionar processo:

1. Crie arquivo com `export function nome(E, ctx)` e comentário "Lê: ... Escreve: ...".
2. Estado novo: crie array em `criarEstado`.
3. Números calibráveis: crie grupo em `PARAMS`.
4. Insira função em `PROCESSOS`, na posição certa da ordem.

---

## 5. Impacto: de estresse para sc/ha e R$/ha

Responde três perguntas da tela: custo de uma decisão, onde clima encontra fase sensível, por que uma rotação ganha de outra.

### 5.1 Uma safra (`impacto.js`)

`simulateSeason` devolve `impacto: { serie, resumo, eventos }` e `estadoFinal`. Opções: `retratos: false` (corrida em lote, sem texturas), `herdar(E, ctx)` (solo da safra anterior), `potencial` (teto da cultura).

- **Produtividade por planta:** `Y = potencial · espiga^a · (hAcc/hPot)^b · (1 − kSen · senesc) · (1 − kAc · acama/max)` (`PARAMS.produtividade`). Cobertura vale pela biomassa (t/ha MS).
- **Perda por causa:** `planta/crescimento.js` registra em `atrib` quanto de cada componente veio de cada canal. Altura perdida vai para canal que mais freou no dia. Aborto e enchimento: divididos entre seca e calor. Senescência: entre seca e N. Acamamento: entre K, raiz e encharcamento. Por planta, `ln(potencial / Y)` divide-se entre componentes e canais. Soma das perdas = exatamente `potencial − produtividade`.
- **Série diária:** `ks` (mesmo fator que freia transpiração; 1 = sem restrição), `umidade` (água disponível relativa na zona de raiz), `agudo` e `sens` por canal, `ndvi` esperado, `ndviPotencial`, `perda` do dia por canal. Umidade 0,45 com `ks` 0,9 explica planta ainda verde. Tela pinta pelo estresse, não pela umidade.
- **Eventos críticos:** trechos de dias em que um canal custou mais que `eventoLimiarDia` do potencial. Cada evento traz fase, perda (sc/ha), chuva, `ksMin`. Exemplo: "Déficit hídrico em pendoamento e floração (dias 60–84): −104.9 sc/ha".

### 5.2 Clima com régua (`climaRegional.js`)

- Normais mensais (sintéticas, Cerrado goiano) e semente por ano agrícola (julho a junho). Semente sorteia fator de chuva do ano, retirada das chuvas (antecipada ou atrasada) e veranico.
- Safra começa numa data (`plantio: '10-15'`). Soja e safrinha do mesmo ano usam mesmo ano de chuva.
- `climaVsNormal`: por decêndio, chuva contra normal (`anomaliaPct`) e contra faixa p10–p90 de 30 anos (`classe`: seco, normal, úmido).
- `sobreposicaoRisco`: decêndios secos ou quentes em fase com sensibilidade ≥ 0,8. Não roda a planta.

### 5.3 Rotação (`rotacao.js`, `solo/entressafra.js`, `pragas.js`)

- `simulateRotacao` roda safras em sequência. `herdar` leva estado final de uma safra para a próxima: palhada (pelo resíduo e pela biomassa feita), crédito de N de leguminosa, descompactação onde raiz chegou, compactação de colheita nos rastros, biologia, água (entressafra seca longa esvazia perfil).
- Consórcio (`companheira`) entra no resíduo, nas pragas e no custo. Simulação diária roda só cultura principal.
- Pragas: nematoide multiplica em hospedeira, cai em não hospedeira e no pousio. Percevejo passa da cultura anterior para a seguinte. Perda entra nas perdas por causa (`nematoide`, `percevejo`). Índice simplificado, não calibrado.

### 5.4 Comparação (`comparar.js`, `indicadores.js`)

- `avaliarRotacao`: N anos, cada um com ciclo de aquecimento antes. Saída: safras de cada ano, p10/p50/p90, produtividade por safra.
- `compararProdutividade(A, B)` (`indicadores.js`): pareado (mesmos anos nas duas), só nas posições onde as duas rotações têm mesma cultura. Saída: diferença em pontos do % do potencial, p10/p50/p90, anos em que B é melhor.
- Tempo: safra sem retratos ~45 ms; 4 rotações × 6 anos ≈ 4 s no Node. Na tela, rode em Web Worker.

### 5.5 Percentual e contrafactual (`contrafactual.js`)

- Todo resumo traz `produtividadePct`, `perdaPct`, `perdasPct`, `componentesPct` (sobre potencial). Percentual não depende do teto em sc/ha, número menos calibrado.
- Perda por canal diz sintoma; contrafactual diz causa. Em solo compactado, perda aparece como "déficit hídrico": raiz rasa não alcança água. `medirIntervencoes` roda mesma safra, mesmo clima, com solo corrigido por cada intervenção de `INTERVENCOES`: calagem e gessagem, descompactação, palhada, adubação P/K, N, drenagem.
- Três medidas por intervenção: `ganhoPp` (pontos do potencial), `ganhoRelPct` (forma dos ensaios: "gesso +27,9 %"), `perdaEvitadaPct` (forma "a compactação reduziu 30 %"). Também roda "todas juntas" e mostra interação: partes não somam total.
- `medirIntervencoesAnos`: mesmo em N anos de clima regional, com p10/p50/p90. Exemplo: compactação custa 9 % no ano mediano, 24 % no ano seco.
- Tolerância ao alumínio por cultura (`morfologia.toleranciaAl`, 0..1) desloca limiares de acidez da raiz: milho 0, soja 0,8, braquiária 1.

Validação contra Embrapa (`node test/sim-faixas.mjs`):

| Caso | Simulação | Embrapa | Fonte |
|---|---|---|---|
| Milho, 25 dias sem chuva em VT–R1 | −58 % | uma semana no florescimento: −50 %; estresse no florescimento: > 50 % | Durães et al., Circ. Téc. 39, Embrapa Milho e Sorgo, 2004 |
| Soja, 25 dias sem chuva em R1–R5 | −39 % | −30 a −40 % no reprodutivo | Embrapa Cerrados, BRS 7581RR |
| Compactação, safra com veranico (milho / soja) | 40 % / 34 % evitada | 30 % / 28 % | Embrapa Soja (Debiasi, Circ. Téc. 2008; portal SECA) |
| Acidez e Al no subsolo, milho (mediana 8 anos) | 32 % evitada | gesso +27,9 % (≈ 22 % evitada), mais sob veranico | Embrapa Cerrados, relatório de impacto 2013; Circ. Téc. 32, 2005 |
| Acidez e Al no subsolo, soja | 10 % evitada | resposta ao gesso bem menor que a do milho | Circ. Téc. 32, 2005 |
| Nematoide (Pratylenchus), perda máxima na soja | 25 % | até 50 % | Embrapa Soja (Franchini et al., 2014) |

Sem percentual Embrapa encontrado (sem teste): encharcamento (Embrapa Clima Temperado só diz milho muito sensível no início do ciclo, dano proporcional à duração) e geada no vegetativo.

```
node test/sim-impacto.mjs
node test/sim-faixas.mjs
```

Verifica contratos e sentido agronômico: perdas fecham, veranico gera evento na floração, crotalária reduz nematoide, comparação fecha por causa.

---

## 6. Teste de referência

```
node test/sim-referencia.mjs
```

- Roda todos os cenários em todas as classes de solo (24 combinações, ~2 s). Compara hash dos retratos diários com `test/sim-referencia.json`.
- **Refatoração** (muda forma do código, não comportamento): hash tem que bater.
- **Mudança de comportamento intencional** (calibração, processo novo): teste falha e mostra combinações afetadas. Confira mudança visualmente. Grave de novo com `node test/sim-referencia.mjs --gravar`, no mesmo commit da mudança.
- Lavoura do teste fixa (7 × 7 com jitter). Não depende de `crop.plantio`.

Resultado idêntico bit a bit ao mover código: mantenha ordem das operações em ponto flutuante. Guarde valores intermediários em arrays com mesma precisão do original (`Float64Array` para valores antes em variáveis locais).
