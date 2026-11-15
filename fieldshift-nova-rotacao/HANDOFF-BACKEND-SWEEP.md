# Handoff backend: `first_planting_sweep` deve mover só a 1ª cultura

> **Para:** quem cuida do `entressafras-backend` (o código do `POST /api/rotations/simulate` ainda não tem commit).
> **De:** frontend Field Shift, editor "Nova rotação" (ver `HANDOFF-SPEC.md` e `LACUNAS-SIMULATE.md`, follow-up B14).
> **Data:** 15/11/2026.
> **Tamanho:** pequeno. Muda só a semântica de um sweep; o contrato JSON fica igual.

## 1. Problema

No editor "Nova rotação", o agricultor seleciona uma cultura e o calendário pinta cada decêndio com o risco de plantá-la ali. As cores vêm dos sweeps do `/simulate`:
- a 1ª cultura usa o `first_planting_sweep`;
- a 2ª cultura usa o `second_planting_sweep`.

Hoje o sweep `"first"` move **as duas culturas juntas** (`CustomPlan.with_first_planting` mantém a distância entre elas). O produto quer outra coisa: **mover a 1ª safra não move a 2ª**. O agricultor ajusta o plantio da soja com o milho safrinha parado na data dele.

Com o sweep atual, a cor do decêndio da 1ª safra responde a outra pergunta ("e se eu mover a rotação inteira?"). Por isso ela diverge do que a simulação devolve depois que o agricultor solta a 1ª safra sozinha.

Exemplo medido em 15/11/2026: Sorriso/MT (-12.55, -55.72), solo `medium`, safra 2027, soja 1150 em 21/10–20/02 e sorgo 48747 em 21/02–10/06.

| Ponto "first" | Soja (plantio–colheita) | Sorgo (plantio–colheita) | Risco soja | Risco sorgo |
|---|---|---|---|---|
| 3 (1 out) | 01/10–31/01 | 01/02–21/05 | 0% | 0% |
| 9 (1 dez) | 01/12–01/04 | 02/04–21/07 | 0% | 16,7% |
| 12 (1 jan) | 01/01–02/05 | 03/05–21/08 | 0% | 76,7% |
| 13 (11 jan) | 11/01–12/05 | 13/05–31/08 | 0% | 96,7% |

O sorgo anda junto em todos os pontos, e o risco dele domina a leitura.

O backend em si está **consistente**: os 23 pontos dos dois sweeps foram re-simulados com `sweep:false` nas mesmas datas, e o `risk_percentage` bateu em 100% dos casos. O que precisa mudar é só a regra do sweep `"first"`.

## 2. Regra nova do `moved_crop: "first"`

Para cada início de decêndio `start` de 1/set a 21/ago (`decendio_starts`):

1. **Cultura A:** `planting_a = start`, com o ciclo em dias igual ao do pedido (`harvest_a = start + ciclo − 1`, como hoje).
2. **Cultura B:** **fica com as datas do plano.** São as datas pedidas ou, se vieram sem data, as que o plano resolveu: `harvest_a original + PLANTING_GAP_DAYS + 1`. A B não acompanha a A.
3. **Sobreposição:** pular o ponto quando `harvest_a >= planting_b`. É a mesma regra do 422 "the second crop must be planted after the harvest of the first".
4. **Fim da safra:** continuar pulando quando `last_harvest > 31/ago` (`SEASON_END`).
5. **Uma cultura só:** sem mudança, porque já só a A se move.
6. **`best_decendio_idx` / `worst_decendio_idx`:** mesma regra de hoje (prioridades do pedido), só que sobre os pontos novos.
7. **`moved_crop: "second"`:** **não muda.**

No exemplo de Sorriso (soja com ciclo de 123 dias e sorgo fixo em 21/02), os pontos "first" passam a ser os decêndios 0 a 5 (1/set a 21/out). A partir de 1/nov, a soja seria colhida depois de 21/02 e o ponto sai.

## 3. Onde mexer

`app/services/rotations.py`, em `planting_sweep`:

```diff
-    "first" moves both crops together (B keeps its distance from the harvest of A); "second"
-    keeps A and moves B after its harvest (needs a second crop). Points that end after Aug 31
-    are left out.
+    "first" moves only A (B keeps its planned dates; points where A would be harvested on or
+    after the planting of B are left out); "second" keeps A and moves B after its harvest
+    (needs a second crop). Points that end after Aug 31 are left out.
     ...
     for start in decendio_starts(context.year):
         if moved_crop == "first":
-            candidate, shared = plan.with_first_planting(start), None
+            candidate, shared = replace(plan, planting_a=start), None
+            if candidate.planting_b is not None and candidate.harvest_a >= candidate.planting_b:
+                continue
         else:
```

Outras mudanças:
- **`CustomPlan.with_first_planting`:** remover, se não tiver outro uso, ou trocar a docstring para "A moved alone; B keeps its dates".
- **`app/schemas/rotation.py`:**
  - `PlantingSweep.moved_crop` deve ter a description `"first: only the first crop moves (the second keeps its dates); second: the first crop is fixed and only the second one moves"`;
  - a docstring de `PlantingSweep` continua valendo ("Cycle lengths stay as requested").
- **Cache do 1º ciclo:** o atalho `_simulate_first_crop` do ramo `"second"` continua só nele. No `"first"`, a A muda a cada ponto e o balanço hídrico da B continua a partir do solo que a A deixou, então `shared=None` como hoje.

## 4. Testes (`tests/test_rotations.py`)

- **`test_planting_sweep_covers_the_decendios_that_fit_in_the_season`:** no ramo `moved == "first"`, trocar a asserção do gap constante por:
  ```python
  assert second["planting_date"] == rotation["crops"][1]["planting_date"]
  assert second["harvest_date"] == rotation["crops"][1]["harvest_date"]
  assert first["harvest_date"] < second["planting_date"]
  ```
- **Novo, com datas explícitas** (ex.: soja 21/10–20/02, milho 21/02–10/06):
  - nenhum ponto "first" tem colheita da A ≥ plantio da B;
  - o último ponto "first" é o decêndio 5 (21/out).
- **Novo, consistência:** para alguns pontos de cada sweep, `POST /simulate` com `sweep:false` nas datas do ponto devolve o mesmo `risk_percentage` por cultura.

## 5. Critérios de aceite

- **Contrato JSON igual:** mesmos campos, mesmo nome `first_planting_sweep` e `moved_crop: "first"`. Muda só a semântica.
- **Pontos "first":** em todo ponto, `crops[1].planting_date` e `crops[1].harvest_date` são iguais às da `rotation` da resposta, e `crops[0].harvest_date < crops[1].planting_date`.
- **Consistência com o `/simulate` exato:** cada ponto dos dois sweeps re-simulado com `sweep:false` dá o mesmo risco (o script da §7 confere).
- **Latência:** com o cache aquecido, igual ou menor que hoje (~0,6 s com sweep). Pode cair, porque há menos pontos "first".

## 6. O que o front faz depois (para contexto)

1. **Rascunho em datas exatas.** Hoje o front arredonda para decêndios; vai passar a guardar plantio + ciclo em dias, com colheita = plantio + ciclo − 1. Soltar a cultura num decêndio gera **exatamente** as datas do ponto do sweep, então a barra mostra a cor do ponto na hora e a resposta exata confirma.
2. **Arrastar a 1ª safra não move mais a 2ª.**
3. **A cor de cada faixa passa a ser o risco da própria cultura**, sem a "pior das duas" de hoje.
4. **Cada faixa só aparece enquanto vale.**
   - **Faixa da 1ª:** vale enquanto não mudam as culturas, os ciclos e as datas da 2ª.
   - **Faixa da 2ª:** vale enquanto não mudam as culturas, os ciclos e as datas da 1ª.
   - Mudou algo, o front pede `sweep:true` de novo.

Opcional, de baixa prioridade (B13 em `LACUNAS-SIMULATE.md`): uma classe de risco por cultura em cada ponto do sweep, para o front não repetir a régua "N de 10 anos".

## 7. Script de conferência

Ele compara cada ponto dos dois sweeps com o `/simulate` exato. Com o backend novo, deve imprimir só linhas sem `<<<` e nenhum ponto "first" com o sorgo fora de 21/02–10/06.

```python
import json, urllib.request
URL = "http://127.0.0.1:8000/api/rotations/simulate"
def sim(crops, sweep):
    body = {"soil_type": "medium", "location": {"lat": -12.55, "lon": -55.72},
            "agricultural_year": 2027, "rotation": {"crops": crops}, "sweep": sweep}
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=400))

base = [{"code": 1150, "planting_date": "2027-10-21", "harvest_date": "2028-02-20"},
        {"code": 48747, "planting_date": "2028-02-21", "harvest_date": "2028-06-10"}]
resp = sim(base, True)
for nome in ("first_planting_sweep", "second_planting_sweep"):
    print("==", nome, "best", resp[nome]["best_decendio_idx"])
    for p in resp[nome]["points"]:
        crops = [{k: c[k] for k in ("code", "planting_date", "harvest_date")} for c in p["crops"]]
        exato = [c["crop"]["risk"]["risk_percentage"] for c in sim(crops, False)["rotation"]["crops"]]
        sweep = [c["risk_percentage"] for c in p["crops"]]
        datas = [(c["planting_date"], c["harvest_date"]) for c in crops]
        print(p["decendio_idx"], datas, sweep, exato, "" if sweep == exato else "<<< DIFERENTE")
```
