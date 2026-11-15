// Estado do editor "Nova rotação": o rascunho, a simulação dele na API e a sincronização entre os dois
// (datas que a API resolveu, ciclo de referência, 422 que dá para corrigir sozinho).
import { useMemo, useState } from 'react'
import type { Ponto, Priorities, SoilType } from '../types'
import {
  aplicarResposta, corrigir422, nomeCultura, pedidoCulturas, RASCUNHO_VAZIO, type Gesto, type Rascunho,
} from '../logic/rascunho'
import { useSimulacao, type EstadoSimulacao } from './useSimulacao'

export type EditorRascunho = {
  aberto: boolean
  rascunho: Rascunho
  /** Houve edição desde que abriu (Cancelar pede confirmação). */
  editado: boolean
  ano: number
  nomes: string[]
  sim: EstadoSimulacao
  abrir: (inicial?: Rascunho) => void
  fechar: () => void
  mudar: (r: Rascunho) => void
  selecionar: (i: number | null) => void
  /** Uma alça (plantio/colheita) está sendo arrastada: o ciclo muda e a faixa do calendário não vale. */
  alca: boolean
  /** Gesto de arrasto em curso (null ao soltar). */
  marcarArrasto: (g: Gesto | null) => void
}

/** `extra`: as mesmas prioridades e histórico da recomendação, para o rank do rascunho ser comparável ao da lista. */
export function useRascunho(ponto: Ponto | null, solo: SoilType | null, ano: number, extra?: { prioridades: Priorities; historico: number[] }): EditorRascunho {
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO)
  const [editado, setEditado] = useState(false)
  const [alca, setAlca] = useState(false)

  const pedido = useMemo(() => (aberto ? pedidoCulturas(rascunho, ano) : null), [aberto, rascunho, ano])
  const lat = ponto?.lat, lon = ponto?.lon
  const extraJson = JSON.stringify(extra ?? {})
  const base = useMemo(
    () => (aberto && lat !== undefined && lon !== undefined ? { ponto: { lat, lon }, solo, ano, ...JSON.parse(extraJson) } : null),
    [aberto, lat, lon, solo, ano, extraJson],
  )
  const sim = useSimulacao(base, pedido)

  // Datas resolvidas pela API (culturas enviadas sem data) voltam para o rascunho, e um 422 que o rascunho
  // corrige sozinho (ciclo fora da faixa, 1ª colhida depois do plantio da 2ª) é aplicado. Uma vez por resposta.
  const detalhe = sim.erro?.motivo === 'parametros' ? sim.erro.detalhe : null
  const [visto, setVisto] = useState<{ dados: unknown; detalhe: string | null }>({ dados: null, detalhe: null })
  if (sim.atual && sim.dados && sim.enviado && visto.dados !== sim.dados) {
    setVisto(v => ({ ...v, dados: sim.dados }))
    const novo = aplicarResposta(rascunho, sim.enviado, sim.dados)
    if (novo !== rascunho) setRascunho(novo)
  }
  if (detalhe !== visto.detalhe) {
    setVisto(v => ({ ...v, detalhe }))
    const novo = detalhe ? corrigir422(rascunho, detalhe, ano) : null
    if (novo) setRascunho(novo)
  }

  const nomes = useMemo(() => rascunho.culturas.map((c, i) => {
    const api = sim.dados?.rotation.crops[i]?.crop
    return nomeCultura(c.code, i, api?.eco_port_code === c.code ? api.common_names[0] : undefined)
  }), [rascunho.culturas, sim.dados])

  return {
    aberto, rascunho, editado, ano, nomes, sim, alca,
    marcarArrasto: g => setAlca(g === 'plantio' || g === 'colheita'),
    abrir: inicial => {
      setRascunho(inicial ?? RASCUNHO_VAZIO)
      setEditado(false)
      setAberto(true)
    },
    fechar: () => { setAberto(false); setRascunho(RASCUNHO_VAZIO); setEditado(false); setAlca(false) },
    mudar: r => { setRascunho(r); setEditado(true) },
    selecionar: i => setRascunho(r => ({ ...r, sel: i })),
  }
}
