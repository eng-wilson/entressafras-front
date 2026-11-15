// Simulação do rascunho pela API enquanto o agricultor edita (POST /api/rotations/simulate).
// - Cada cultura tem a sua faixa de cores (sweep), válida enquanto não mudam as culturas, o ciclo dela e as datas
//   da outra (`chaveFaixa`). Alguma ficou inválida: pedido com sweep (~0,6 s com a célula quente).
// - Senão, pedido sem sweep (~50 ms), com debounce e cancelando o anterior.
// - Enquanto a resposta não chega, `previa` traz o ponto exato do sweep, quando existe (soltar num decêndio).
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomCropInput, Ponto, RotationSimulationResponse, SoilType, SweepPoint } from '../types'
import { ErroRotacoes } from '../services/rotacoes'
import { lerSimulacao, simularRotacao, type PedidoSimulacao } from '../services/simulacao'
import { chaveFaixa, pontoDoSweep } from '../logic/rascunho'

/** Mesmo limite das recomendações; o rascunho só abre com a célula de clima já quente. */
const TEMPO_LIMITE_MS = 180_000
export const DEBOUNCE_MS = 200

export type BaseSimulacao = { ponto: Ponto; solo: SoilType; ano: number }
export type ErroSimulacao = { motivo: string; detalhe: string }

export type EstadoSimulacao = {
  status: 'incompleto' | 'simulando' | 'ok' | 'erro'
  /** Última resposta (pode ser de datas anteriores enquanto simula: ver `atual`). */
  dados: RotationSimulationResponse | null
  /** As culturas e datas que geraram `dados`. */
  enviado: CustomCropInput[] | null
  /** `dados` corresponde ao pedido atual. */
  atual: boolean
  /** Resposta com o sweep válido de cada cultura (null enquanto a faixa dela é recalculada). */
  sweeps: (RotationSimulationResponse | null)[]
  /** Resultado do sweep para as datas atuais, enquanto a resposta exata não chega. */
  previa: SweepPoint | null
  erro: ErroSimulacao | null
  recarregar: () => void
}

type Interno = {
  chave: string | null
  dados: RotationSimulationResponse | null
  enviado: CustomCropInput[] | null
  faixas: ({ chave: string; dados: RotationSimulationResponse } | null)[]
  erro: ErroSimulacao | null
}

const VAZIO: Interno = { chave: null, dados: null, enviado: null, faixas: [], erro: null }

export function useSimulacao(base: BaseSimulacao | null, culturas: CustomCropInput[] | null): EstadoSimulacao {
  const chaveBase = base ? `${base.ponto.lat},${base.ponto.lon},${base.solo},${base.ano}` : null
  const chave = chaveBase && culturas ? `${chaveBase}|${JSON.stringify(culturas)}` : null
  const chavesFaixa = useMemo(
    () => (chaveBase && culturas ? culturas.map((_, i) => `${chaveBase}|${chaveFaixa(culturas, i)}`) : null),
    [chaveBase, culturas],
  )
  const [tentativa, setTentativa] = useState(0)
  const [st, setSt] = useState<Interno>(VAZIO)

  // Outro talhão, solo ou ano: nada do anterior vale.
  const [baseVista, setBaseVista] = useState(chaveBase)
  if (baseVista !== chaveBase) {
    setBaseVista(chaveBase)
    setSt(VAZIO)
  }

  useEffect(() => {
    if (!base || !culturas || !chave || !chavesFaixa) return
    const precisaSweep = chavesFaixa.some((k, i) => st.faixas[i]?.chave !== k)
    const faixasDe = (dados: RotationSimulationResponse, atuais: Interno['faixas']) =>
      precisaSweep ? chavesFaixa.map(k => ({ chave: k, dados })) : atuais
    const pedido: PedidoSimulacao = { ...base, culturas, sweep: precisaSweep }
    const guardada = lerSimulacao(pedido)
    if (guardada) {
      setSt(s => ({ ...s, chave, dados: guardada, enviado: culturas, erro: null, faixas: faixasDe(guardada, s.faixas) }))
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
          setSt(s => ({ ...s, chave, dados, enviado: culturas, erro: null, faixas: faixasDe(dados, s.faixas) }))
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

  const s0 = chavesFaixa && st.faixas[0]?.chave === chavesFaixa[0] ? st.faixas[0].dados : null
  const s1 = chavesFaixa && st.faixas[1]?.chave === chavesFaixa[1] ? st.faixas[1].dados : null
  const sweeps = useMemo(() => [s0, s1], [s0, s1])
  const atual = !!chave && st.chave === chave && !!st.dados && JSON.stringify(st.enviado) === JSON.stringify(culturas)
  const previa = useMemo(
    () => (atual ? null : sweeps.reduce<SweepPoint | null>((p, sw) => p ?? pontoDoSweep(sw, culturas), null)),
    [atual, sweeps, culturas],
  )

  if (!culturas) return { status: 'incompleto', dados: null, enviado: null, atual: false, sweeps: [null, null], previa: null, erro: null, recarregar }
  const erro = st.chave === chave ? st.erro : null
  const status = erro ? 'erro' : atual ? 'ok' : 'simulando'
  return { status, dados: st.dados, enviado: st.enviado, atual, sweeps, previa, erro, recarregar }
}
