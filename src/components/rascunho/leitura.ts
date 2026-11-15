// O que a linha e o painel do rascunho mostram a partir da simulação: a resposta exata, a prévia do sweep
// enquanto ela não chega, ou a última resposta esmaecida. Nada inventado: sem resposta, "Sem dado".
import type { EstadoSimulacao } from '../../hooks/useSimulacao'
import { classeDoRisco, piorClasse, type Classe, type Rascunho } from '../../logic/rascunho'

export type Leitura = {
  classes: Classe[]
  /** Risco em % de cada cultura (null = sem dado). */
  riscos: (number | null)[]
  /** Valores de datas anteriores (esmaecidos) enquanto a simulação corre. */
  velho: boolean
  pior: { cls: Classe; i: number }
  ranking: { rank: number; entre: number; recomendada: boolean } | null
}

export function lerSimulacao(r: Rascunho, sim: EstadoSimulacao): Leitura {
  const cs = r.culturas
  const vazio: Leitura = { classes: cs.map(() => 'none'), riscos: cs.map(() => null), velho: false, pior: { cls: 'none', i: -1 }, ranking: null }
  if (cs.length < 2) return vazio
  const dados = sim.dados
  const mesmas = !!dados && dados.rotation.crops.every((c, i) => c.crop.eco_port_code === cs[i]?.code)
  let riscos: (number | null)[] | null = null
  let velho = false
  if (sim.atual && dados) riscos = dados.rotation.crops.map(c => c.crop.risk.risk_percentage)
  else if (sim.previa && sim.previa.crops.every((c, i) => c.code === cs[i].code)) riscos = sim.previa.crops.map(c => c.risk_percentage)
  else if (mesmas) { riscos = dados!.rotation.crops.map(c => c.crop.risk.risk_percentage); velho = true }
  if (!riscos) return vazio
  const classes = riscos.map(classeDoRisco)
  const ranking = mesmas
    ? { rank: dados!.rotation.rank, entre: dados!.rotation.ranked_among, recomendada: dados!.rotation.would_be_recommended }
    : null
  return { classes, riscos, velho, pior: piorClasse(classes), ranking }
}
