// Rotações recomendadas para o talhão ativo: cache primeiro, depois a API; "Tentar de novo" ignora o cache.
// Trocar só as prioridades mantém as rotações anteriores na tela enquanto a nova ordem chega (`atualizando`).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CustomCropInput, Ponto, Priorities, RotationRecommendations, SoilType } from '../types'
import {
  ErroRotacoes, apagarRotacoes, chaveRotacoes, guardarRotacoes, lerRotacoes, recomendarRotacoes,
} from '../services/rotacoes'

/** Cobre a primeira carga de um local novo (POWER + SoilGrids + SMAP levam 1–3 min); depois disso vira erro de rede com "Tentar de novo". */
const TEMPO_LIMITE_MS = 180_000

export type EstadoRotacoes =
  | { status: 'carregando'; dados: null }
  | { status: 'ok'; dados: RotationRecommendations }
  | { status: 'erro'; dados: null; erro: string }

const CARREGANDO: EstadoRotacoes = { status: 'carregando', dados: null }

/** Rotações salvas pelo agricultor, enviadas em custom_rotations com o ano agrícola das datas delas. */
export type SalvasDoPedido = { ano: number; custom: CustomCropInput[][] } | null

type Entrada = { ponto: Ponto | null; solo: SoilType | null; historico: number[]; prioridades: Priorities; salvas?: SalvasDoPedido }

export function useRotacoes({ ponto, solo, historico, prioridades, salvas = null }: Entrada): EstadoRotacoes & {
  recarregar: () => void
  /** Resposta anterior do mesmo talhão (outras prioridades), exibida enquanto a nova carrega; null se não há. */
  anterior: RotationRecommendations | null
} {
  const lat = ponto?.lat, lon = ponto?.lon
  const hist = historico.join('-')
  const { water_security: ws, productivity: pd, soil_protection: sp } = prioridades
  // Sem salvas, o pedido fica como antes (ano padrão da API, mesma chave de cache).
  const extraJson = JSON.stringify(salvas?.custom.length ? { ano: salvas.ano, custom: salvas.custom } : {})
  const pedido = lat !== undefined && lon !== undefined
    ? {
        ponto: { lat, lon }, solo, historico: hist ? hist.split('-').map(Number) : [],
        prioridades: { water_security: ws, productivity: pd, soil_protection: sp }, ...JSON.parse(extraJson),
      }
    : null
  const chave = pedido ? chaveRotacoes(pedido) : null
  // Mesmo talhão, solo, histórico e salvas: a resposta anterior ainda descreve as mesmas rotações candidatas.
  const base = pedido ? `${pedido.ponto.lat.toFixed(2)},${pedido.ponto.lon.toFixed(2)},${solo ?? 'auto'},${hist},${extraJson}` : null

  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<{ chave: string | null; estado: EstadoRotacoes }>(() => {
    const c = chave ? lerRotacoes(chave) : null
    return { chave, estado: c ? { status: 'ok', dados: c } : CARREGANDO }
  })
  const ultima = useRef<{ base: string | null; dados: RotationRecommendations } | null>(null)

  useEffect(() => {
    if (!chave || !pedido) return
    const c = lerRotacoes(chave)
    if (c) {
      setResposta({ chave, estado: { status: 'ok', dados: c } })
      return
    }
    setResposta({ chave, estado: CARREGANDO })
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), TEMPO_LIMITE_MS)
    let ativo = true
    recomendarRotacoes(pedido, ac.signal)
      .then(dados => {
        if (!ativo) return
        guardarRotacoes(chave, dados)
        setResposta({ chave, estado: { status: 'ok', dados } })
      })
      .catch((e: unknown) => {
        // Talhão, solo ou prioridades mudaram, ou o componente saiu: a requisição anterior não interessa mais.
        if (!ativo) return
        setResposta({ chave, estado: { status: 'erro', dados: null, erro: e instanceof ErroRotacoes ? e.motivo : 'rede' } })
      })
      .finally(() => clearTimeout(timer))
    return () => { ativo = false; clearTimeout(timer); ac.abort() }
    // `pedido` é derivado de `chave` (que já inclui ponto, solo, histórico, prioridades e salvas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, tentativa])

  const recarregar = useCallback(() => {
    if (chave) apagarRotacoes(chave)
    setTentativa(n => n + 1)
  }, [chave])

  const estado = resposta.chave === chave ? resposta.estado : CARREGANDO
  if (estado.status === 'ok') ultima.current = { base, dados: estado.dados }
  const anterior = estado.status !== 'ok' && ultima.current?.base === base ? ultima.current.dados : null
  return { ...estado, recarregar, anterior }
}
