// Simulação do rascunho pela API enquanto o agricultor edita (POST /api/rotations/simulate).
// - Culturas ou ciclos mudaram: pedido com sweep (faixa de cores por decêndio, ~0,5 s com a célula quente).
// - Só as datas andaram: pedido sem sweep (~50 ms), com debounce e cancelando o anterior.
// - Enquanto a resposta não chega, `previa` traz o ponto exato do sweep, quando existe (mover a 1ª ou a 2ª).
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomCropInput, Ponto, Priorities, RotationSimulationResponse, SoilType, SweepPoint } from '../types'
import { ErroRotacoes } from '../services/rotacoes'
import { lerSimulacao, simularRotacao, type PedidoSimulacao } from '../services/simulacao'
import { chaveEstrutura, pontoDoSweep } from '../logic/rascunho'

/** Mesmo limite das recomendações; o rascunho só abre com a célula de clima já quente. */
const TEMPO_LIMITE_MS = 180_000
export const DEBOUNCE_MS = 200

export type BaseSimulacao = { ponto: Ponto; solo: SoilType | null; ano: number; prioridades?: Priorities; historico?: number[] }
export type ErroSimulacao = { motivo: string; detalhe: string }

export type EstadoSimulacao = {
  status: 'incompleto' | 'simulando' | 'ok' | 'erro'
  /** Última resposta (pode ser de datas anteriores enquanto simula: ver `atual`). */
  dados: RotationSimulationResponse | null
  /** As culturas e datas que geraram `dados`. */
  enviado: CustomCropInput[] | null
  /** `dados` corresponde ao pedido atual. */
  atual: boolean
  /** Última resposta com sweep, das mesmas culturas e ciclos. */
  sweep: RotationSimulationResponse | null
  /** Resultado do sweep para as datas atuais, enquanto a resposta exata não chega. */
  previa: SweepPoint | null
  erro: ErroSimulacao | null
  recarregar: () => void
}

type Interno = {
  chave: string | null
  dados: RotationSimulationResponse | null
  enviado: CustomCropInput[] | null
  sweep: { estrutura: string; dados: RotationSimulationResponse } | null
  erro: ErroSimulacao | null
}

const VAZIO: Interno = { chave: null, dados: null, enviado: null, sweep: null, erro: null }

export function useSimulacao(base: BaseSimulacao | null, culturas: CustomCropInput[] | null): EstadoSimulacao {
  const chaveBase = base
    ? `${base.ponto.lat},${base.ponto.lon},${base.solo ?? 'auto'},${base.ano},${JSON.stringify(base.prioridades ?? null)},${(base.historico ?? []).join('-')}`
    : null
  const chave = chaveBase && culturas ? `${chaveBase}|${JSON.stringify(culturas)}` : null
  const estrutura = chaveBase && culturas ? `${chaveBase}|${chaveEstrutura(culturas)}` : null
  const [tentativa, setTentativa] = useState(0)
  const [st, setSt] = useState<Interno>(VAZIO)

  // Outro talhão, solo ou ano: nada do anterior vale.
  const [baseVista, setBaseVista] = useState(chaveBase)
  if (baseVista !== chaveBase) {
    setBaseVista(chaveBase)
    setSt(VAZIO)
  }

  useEffect(() => {
    if (!base || !culturas || !chave || !estrutura) return
    const precisaSweep = st.sweep?.estrutura !== estrutura
    const pedido: PedidoSimulacao = { ...base, culturas, sweep: precisaSweep }
    const guardada = lerSimulacao(pedido)
    if (guardada) {
      setSt(s => ({ ...s, chave, dados: guardada, enviado: culturas, erro: null, sweep: precisaSweep ? { estrutura, dados: guardada } : s.sweep }))
      return
    }
    const ac = new AbortController()
    let ativo = true
    let estourou = false
    let limite: ReturnType<typeof setTimeout> | undefined
    // A 1ª simulação sai na hora; as seguintes esperam o agricultor parar de arrastar.
    const espera = setTimeout(() => {
      limite = setTimeout(() => { estourou = true; ac.abort() }, TEMPO_LIMITE_MS)
      simularRotacao(pedido, ac.signal)
        .then(dados => {
          if (!ativo) return
          setSt(s => ({ ...s, chave, dados, enviado: culturas, erro: null, sweep: precisaSweep ? { estrutura, dados } : s.sweep }))
        })
        .catch((e: unknown) => {
          if (!ativo) return
          const abort = !!e && typeof e === 'object' && (e as { name?: unknown }).name === 'AbortError'
          if (abort && !estourou) return
          const erro = e instanceof ErroRotacoes ? { motivo: e.motivo, detalhe: e.message } : { motivo: 'rede', detalhe: '' }
          setSt(s => ({ ...s, chave, erro }))
        })
        .finally(() => clearTimeout(limite))
    }, st.dados ? DEBOUNCE_MS : 0)
    return () => { ativo = false; clearTimeout(espera); clearTimeout(limite); ac.abort() }
    // `base` e `culturas` estão representados em `chave`; `st` só decide o sweep e a espera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, tentativa])

  const recarregar = useCallback(() => {
    setSt(s => ({ ...s, erro: null }))
    setTentativa(n => n + 1)
  }, [])

  const sweep = st.sweep && st.sweep.estrutura === estrutura ? st.sweep.dados : null
  const atual = !!chave && st.chave === chave && !!st.dados && JSON.stringify(st.enviado) === JSON.stringify(culturas)
  const previa = useMemo(() => (atual ? null : pontoDoSweep(sweep, culturas)), [atual, sweep, culturas])

  if (!culturas) return { status: 'incompleto', dados: null, enviado: null, atual: false, sweep: null, previa: null, erro: null, recarregar }
  const erro = st.chave === chave ? st.erro : null
  const status = erro ? 'erro' : atual ? 'ok' : 'simulando'
  return { status, dados: st.dados, enviado: st.enviado, atual, sweep, previa, erro, recarregar }
}
