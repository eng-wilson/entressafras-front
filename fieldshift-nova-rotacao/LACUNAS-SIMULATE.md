# Lacunas e follow-ups: Nova rotação × `POST /api/rotations/simulate`

> **Contexto:** o `HANDOFF-SPEC.md` desta pasta calcula tudo no front com mocks: janelas do ZARC, ciclo mín./máx., ranking `[good, good, warn, risk]` e pragas "soja + milho". Com o endpoint `POST /api/rotations/simulate`, e pela regra "só dados da API" (`docs/PLANO_INTEGRACAO.md`), status, risco, ranking e janela de plantio do rascunho passam a vir do backend.
> **Conferido em 15/11/2026** com o OpenAPI ao vivo (`127.0.0.1:8000/openapi.json`), com chamadas reais (Sorriso/MT, -12.55/-55.71, safra 2026/27), com o código do `entressafras-backend` (ainda sem commit) e com a explicação do endpoint enviada pelo backend.
> **Plano de implementação:** `~/.claude/plans/leia-o-fieldshift-nova-rotacao-handoff-s-recursive-pelican.md`.

---

## 1. O que o `/simulate` resolve

| Spec (mock local) | Agora vem da API |
|---|---|
| Status Bom/Atenção/Risco pela janela do ZARC | `crop.risk.risk_percentage` por cultura (mesma régua "N de 10 anos" da tela principal) |
| Ranking `[good, good, warn, risk]` → "3º de 5" | `rank`, `ranked_among`, `would_be_recommended` com as `priorities` do pedido |
| Cores no calendário (verde/laranja/vermelho por decêndio) | Sweep por decêndio: `risk_percentage` de cada cultura no ponto, `temperature_ok`, `in_calendar` (marca secundária) e `best_decendio_idx` |
| "Suas limitações" | `checks` (avisos que não bloqueiam) + `soil_protection` |
| Ciclo mín./máx. em decêndios | Ciclo entre 50% e 150% do ciclo de referência do GGCMI (fora disso → 422) |
| — | `scores` 0–100: produtividade, segurança hídrica, proteção do solo e geral |

## 2. Contrato medido

**Pedido:** `location`, `soil_type?`, `agricultural_year?`, `priorities?`, `crop_history?`, `rotation.crops[2]` (`code` e, opcionais, `planting_date` e `harvest_date`), `sweep` (padrão `true`).

**Datas omitidas:** a cultura A usa o plantio do calendário regional (GGCMI). A cultura B é plantada 6 dias depois da colheita de A. O `harvest_date` define o ciclo da cultivar.

**Latência** (backend local):

| Caso | Tempo |
|---|---|
| 1ª chamada numa célula de clima nova (fria) | **309 s** ⚠️ (o backend esperava ~2 s) |
| Célula quente, `sweep: true` | 0,64 s |
| Célula quente, `sweep: false` | 0,06 s |
| 422 (validação) | imediato |

**422 reais:**
- `{"detail":"custom rotation: crop 801 has no FAO-56 water requirements to simulate"}`: Crotalária.
- `{"detail":"custom rotation: crop 1150 cycle of 31 days is outside 50%–150% of its reference cycle (100 days)"}`: soja com ciclo curto.

**Exemplo:** soja 21/10 → 20/02 + sorgo 21/02 → 10/06 dá `rank 1` de `ranked_among 14`, sem checks e com risco de 0% (soja) e 3,3% (sorgo). Soja 01/11 + milho (datas da API) dá `rank 14` de 14.

---

## 3. Validação com a explicação do backend

| Ponto da explicação | Confere? | Observação / ajuste |
|---|---|---|
| Pedido (`code`, datas opcionais, `sweep`) | ✅ | Confirmado ao vivo |
| 422: cultura desconhecida, colheita antes do plantio, ciclo fora de 50–150%, B antes da colheita de A, plantio fora do ano | ✅ | **Falta na lista:** cultura sem dados FAO-56 também dá 422 (L16) |
| Checks não bloqueiam: família, ±30 dias do calendário, temperatura, colheita depois de 31/ago | ✅ | Os textos vêm em inglês e livres (L4) |
| B plantada 6 dias após a colheita de A | ✅ | `PLANTING_GAP_DAYS = 5`, mais 1 |
| O rank usa as `priorities` do pedido, com candidatos em cache | ✅ | O front precisa mandar as mesmas prioridades da recomendação (L7) |
| `ranked_among` | ⚠️ | Conta **todos os candidatos** (14 no teste), não só as 4 recomendadas (L6) |
| Sweep: ~0,5 s quente, ~2 s na 1ª vez | ⚠️ | Quente confere (0,64 s). **Fria: 309 s** no teste local |
| "Arrastar o plantio de A é só consulta à faixa" | ⚠️ | Só é exato se **B andar junto**: o `first_planting_sweep` mantém o intervalo. O spec §5.2 diz que a vizinha não se move (L10) |
| Colheita ou soltar B → `sweep: false` com debounce (~50 ms) | ✅ | 60 ms medidos |
| `custom_rotations` (até 3), em lista separada, sem gravar no servidor | ✅ | O limite de 3 e o empate de rank afetam o Salvar (L14) |
| Milheto com 180 dias no GGCMI em Sorriso | Lacuna nova | Perfil de safra principal, ruim como 2ª safra (L15) |
| Sweep sem cache | ✅ | O front só pede `sweep: true` quando a estrutura muda |

---

## 4. Lacunas

| # | Spec diz | API faz | Impacto | Decisão |
|---|---|---|---|---|
| L1 | De 0 a N culturas ("adicionar até encher a safra") | Exatamente **2** (`crops` mín. 2, máx. 2) | Com 0, 1 ou 3+ culturas não há simulação | **Decidido:** máximo de 2. Com 0 ou 1: "Adicione a 2ª cultura para simular", barra `.b.none` e Salvar desabilitado. Com 2: "+ Cultura" desabilitado ("Máximo de 2 culturas por rotação") |
| L2 | Janelas boa/atenção do ZARC → Bom/Atenção/Risco | `risk_percentage`; `in_calendar` (±30 dias do GGCMI) e `temperature_ok` no sweep | O vocabulário do spec fica sem fonte | Status = `classeAnos(risk_percentage)`, como na tela principal; `null` → "Sem dado". Cor do decêndio = `classeDoRisco(risk_percentage)` do ponto do sweep, a mesma régua da barra (1ª cultura: pior entre as duas, porque a 2ª anda junto; 2ª: a própria); `temperature_ok=false` → risco. `in_calendar` (±30 dias do GGCMI) vira sublinhado "data usual da região". Contorno no `best_decendio_idx`. **Correção (15/11/2026):** a 1ª versão pintava de verde `in_calendar && temperature_ok`, que não mede risco, e divergia da barra (soja 1–20/set com 10–13% de risco fora do calendário; sorgo 11–20/abr com 33% dentro dele). Erro do front, não do backend |
| L3 | Ciclo mín./máx. fixo por cultura; catálogo com 7 culturas | 422 fora de 50–150% da referência, que **não é exposta**. ~~`GET /crops` não filtra culturas sem FAO-56~~ **Resolvido:** `GET /crops?simulable=true` (22 culturas) | O arrasto pode gerar 422 | Adicionar ou trocar envia a colheita **sem data**, e a resposta dá o ciclo de referência. Limites = `[⌈0,5·ref⌉, ⌊1,5·ref⌋]` dias. Um 422 de ciclo informa a referência, e o rascunho se corrige sozinho. O menu usa `simulable=true`, com nomes em PT locais (`src/data/nomesCulturas.ts`) porque a API devolve em inglês |
| L3b | — | `calendar.cycle_days` é o ciclo **enviado** (soja com datas: 123; sem datas: 100) | Não serve como referência quando há datas | Registrar a referência só quando a cultura vai sem datas |
| L4 | Textos de limitação em PT | `checks` e `warnings` em **inglês, texto livre** | Tradução frágil | Mapear os 4 padrões conhecidos para PT; um texto não reconhecido aparece como "Alerta agronômico". Pedir checks estruturados ao backend |
| L5 | Chip "Mais pragas" para soja + milho | O único critério é a mesma família botânica | Soja → milho não teria aviso de pragas pela API | O chip continua vindo de `PERFIS[2ª].pragas` (mock já usado na tela principal). O check de família aparece em "Suas limitações" |
| L6 | "Ficaria em 3º", "3º de 5" | `rank` entre **todos** os candidatos (`ranked_among` = 14); `would_be_recommended` = top 4 | "3º de 5" fica errado | Selo: `rank ≤ 4` → "Ficaria em Nº"; senão "Fora das 4 melhores". Cartão: "Nº de {ranked_among}" |
| L7 | Ranking só pelo status do clima | Ranking pelas `priorities` (`productivity`, `water_security`, `soil_protection`) | A Sidebar usa outro conjunto (`risco/agua/solo/prod`), e a recomendação não manda `priorities` | O `/simulate` usa os mesmos `location`, `soil_type` e `agricultural_year` da recomendação, sem `priorities`. A unificação fica como follow-up (§10.1 do spec) |
| L8 | Safra 2026/27 | Sem `agricultural_year`, a API usa a próxima safra | As datas do mock não servem | Usar o ano do conjunto carregado (`conj.ano`) |
| L9 | Tudo é instantâneo | Quente: 0,06 s / 0,64 s. **Fria: 309 s** | A 1ª chamada pode estourar o tempo | O rascunho só abre depois das recomendações (célula quente). Timeout de 20 s, "Simulando…" e "Não foi possível simular. Tentar de novo" |
| L10 | Mover A não mexe em B | `first_planting_sweep` move **A e B juntas**; `second_planting_sweep` move só B; ciclo variável não tem sweep | O preview sem rede só é exato em alguns gestos | **Proposta:** mover o meio de A leva B junto (mudança no spec §5.2). Mover B: preview pelo sweep e confirmação ao soltar. Alças: `sweep: false` com debounce de 200 ms e a faixa redesenhada depois |
| L11 | Lacuna = decêndios × 10 dias | `soil_protection.living_cover_days` | Os números do spec são aproximados | Intervalo entre culturas em dias reais (datas do usuário). Dias sem cobertura na safra vêm da API |
| L12 | `localStorage` [proposta] | `custom_rotations` no `/recommendations`, ranqueadas na mesma régua | — | **Decidido:** `localStorage` por talhão e safra, com as salvas enviadas em `custom_rotations` |
| L13 | Culturas encostadas | `planting_b` deve ser > `harvest_a`; colheita de B depois de 31/ago só gera check | — | Plantio = 1º dia do decêndio, colheita = último dia do decêndio; encostadas passam |
| L14 | Salvar quantas quiser | `custom_rotations` aceita **até 3**; cada uma é ranqueada sozinha (pode haver empate) | A 4ª salva não seria ranqueada | Máximo de 3 salvas por talhão e safra (o `+` fica desabilitado). Empate: como `rank` 1 = "melhor que todas as recomendadas", a salva fica **antes** da recomendada de mesmo rank; entre salvas, a mais antiga primeiro. Assim o "Ficaria em Nº" do rascunho bate com a posição depois de salvar |
| L15 | Ciclo padrão por cultura | O ciclo de referência do GGCMI pode ser de safra principal (milheto em Sorriso: 180 dias, plantio em novembro) | 2ª cultura adicionada sem datas fica irreal (colhe depois de 31/ago e tem risco alto) | Como 2ª cultura, se a colheita passar de 31/ago, encurtar para o fim da safra (≥ 50% da referência) com a dica "Ciclo ajustado para caber na safra" |
| L16 | — | Cultura sem FAO-56 → 422 (não documentado na explicação) | ~~O menu pode oferecer culturas que falham~~ | **Resolvido** com `simulable=true` (L3) |
| L17 | — | A mesma rotação da recomendação nº 1 (feijão-caupi → girassol, Sorriso), simulada como custom com as datas do calendário, recebe **rank 4 de 14** (notas 97/97/77) | O agricultor estranha: "copiei a 1ª e ela ficou em 4º" | Visto em 15/11 no teste ao vivo. Provável empate de risco quase zero, que a própria API avisa que muda a ordem (aviso "Rotations with near-zero risk are practically tied"). Follow-up B12 |
| L18 | — | O rascunho abre a partir da rotação "Atual" do talhão (ou da selecionada) | — | Decisão de implementação: a colheita vai sem data para a API devolver o ciclo de referência (necessário para os limites do arrasto) |

---

## 5. Follow-ups

### Backend (`entressafras-backend`)

| # | Item | Prioridade | Lacuna |
|---|---|---|---|
| B1 | Commitar `/simulate` e `custom_rotations` (hoje só na working tree) | Alta | — |
| B2 | Investigar a 1ª chamada fria de 309 s (NASA POWER / Earth Engine?) ou devolver 202 com progresso | Alta | L9 |
| B3 | `checks` estruturados (`{code, crop_code, value}`) ou em PT; `warnings` em PT | Alta | L4 |
| B4 | Expor `reference_cycle_days`, `min_cycle_days` e `max_cycle_days` em `calendar` | Média | L3, L3b |
| B5 | ~~`GET /crops?simulable=true`~~ **Feito** (22 culturas). Falta: nomes populares em PT (hoje em inglês: "soya bean", "bachanta") | Baixa | L3, L16 |
| B6 | Calendário por posição na rotação (1ª/2ª safra) | Média | L15 |
| B7 | Sweep que move só A e/ou varia o ciclo | Baixa | L10 |
| B8 | Cache do sweep | Baixa | — |
| B9 | Mais de 3 `custom_rotations`, ou desempate definido | Baixa | L14 |
| B10 | Critério de pragas além de "mesma família" | Baixa | L5 |
| B11 | Rotações com N culturas | Futuro | L1 |
| B12 | Explicar ou desempatar o rank de uma custom idêntica a uma recomendada (rank 4 para a cópia da nº 1) | Média | L17 |
| B13 | Classe de risco agregada por ponto do sweep (ex.: `rotation_class`), para o front não repetir a régua `classeAnos` nem decidir sozinho "pior das duas" | Baixa | L2 |

### Frontend

| # | Item | Lacuna |
|---|---|---|
| F1 | Unificar "O que importa" da Sidebar com `priorities` da API e mandar o mesmo valor nos dois endpoints | L7 |
| F2 | Mandar `crop_history` a partir do histórico do talhão | — |
| F3 | Trocar os mocks de `PERFIS` (pragas, nomes) quando a API tiver esses dados | L5 |
| F4 | Mensagem específica para a célula fria ("Primeira consulta neste local pode demorar") | L9 |
| F5 | Gravar a fixture real do `/simulate` e atualizar os goldens de paridade visual | — |

### Produto / design

| # | Decisão pendente | Ref. |
|---|---|---|
| P1 | Vocabulário de status: Bom/Atenção/Risco × "Clima favorável/arriscado/desfavorável" (N de 10 anos) | spec §10.2, L2 |
| P2 | Mover A leva B junto (proposta acima) | L10, spec §5.2 |
| P3 | Texto do selo quando `rank > 4` | L6 |
| P4 | Estado do rascunho com 1 cultura | L1 |
| P5 | Consórcios como uma cultura só | spec §10.4 |
| P6 | Cancelar: descartar com confirmação | spec §10.5 |

---

## 6. Implementação (15/11/2026)

| Parte | Arquivo |
|---|---|
| Serviço do `/simulate` (validação, 422 com `detail`, cache em memória) | `src/services/simulacao.ts` |
| Modelo do rascunho (decêndio ↔ data, limites do arrasto, pedido, checks e 422 em PT) | `src/logic/rascunho.ts` |
| Simulação ao vivo (sweep quando muda a estrutura, `sweep:false` com debounce de 200 ms, prévia pelo sweep) | `src/hooks/useSimulacao.ts` |
| Editor (sincroniza as datas resolvidas pela API e corrige 422 sozinho) | `src/hooks/useRascunho.ts` |
| Catálogo `simulable=true` | `src/services/culturas.ts`, `src/hooks/useCulturasSimulaveis.ts` |
| Rotações salvas + `custom_rotations` (com fallback se o 422 vier delas) | `src/services/rotacoesSalvas.ts`, `src/services/rotacoes.ts`, `src/logic/rotacoesApi.ts` |
| Interface | `src/components/rascunho/` (`DraftRow`, `CropTrack`, `CropPicker`, `DraftInspector`) |
| Cores do calendário na mesma régua da barra (`faixaDoSweep`) | `src/logic/rascunho.ts`, `src/components/MonthStrip.tsx` |

## 7. O que muda no `HANDOFF-SPEC.md`

- **§4.1 Catálogo:** as janelas e os ciclos do mock são substituídos pela API (L2, L3).
- **§5.1 Regras de cálculo:** status, ranking, veredito e janela no calendário vêm do `/simulate` (L2, L6).
- **§5.2 Arrasto:** mover A leva B junto (L10, se P2 for aprovado).
- **§5.4 Menu de culturas:** no máximo 2 culturas; itens sem FAO-56 desabilitados (L1, L3).
- **§5.5 Salvar:** até 3 salvas, via `custom_rotations` (L12, L14).
- **§6 Edge cases:** célula fria e o 422 (L9, L16).
