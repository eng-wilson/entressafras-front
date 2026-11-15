// Rotações recomendadas para o talhão ativo: cache primeiro, depois a API; "Tentar de novo" ignora o cache.
import { useCallback, useEffect, useState } from 'react'
import type { Ponto, RotationRecommendations, Textura } from '../types'
import {
  ErroRotacoes, apagarRotacoes, chaveRotacoes, guardarRotacoes, lerRotacoes, recomendarRotacoes, soloDaTextura,
} from '../services/rotacoes'

/** Cobre o cold start do backend; depois disso vira erro de rede com "Tentar de novo". */
const TEMPO_LIMITE_MS = 20_000

export type EstadoRotacoes =
  | { status: 'carregando'; dados: null }
  | { status: 'ok'; dados: RotationRecommendations }
  | { status: 'erro'; dados: null; erro: string }

const CARREGANDO: EstadoRotacoes = { status: 'carregando', dados: null }

export function useRotacoes(p: Ponto | null, textura: Textura | null): EstadoRotacoes & { recarregar: () => void } {
  const lat = p?.lat, lon = p?.lon
  const solo = soloDaTextura(textura)
  const chave = lat !== undefined && lon !== undefined ? chaveRotacoes({ ponto: { lat, lon }, solo }) : null
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<{ chave: string | null; estado: EstadoRotacoes }>(() => {
    const c = chave ? lerRotacoes(chave) : null
    return { chave, estado: c ? { status: 'ok', dados: c } : CARREGANDO }
  })

  useEffect(() => {
    if (!chave || lat === undefined || lon === undefined) return
    const c = lerRotacoes(chave)
    if (c) {
      setResposta({ chave, estado: { status: 'ok', dados: c } })
      return
    }
    setResposta({ chave, estado: CARREGANDO })
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), TEMPO_LIMITE_MS)
    let ativo = true
    recomendarRotacoes({ ponto: { lat, lon }, solo }, ac.signal)
      .then(dados => {
        if (!ativo) return
        guardarRotacoes(chave, dados)
        setResposta({ chave, estado: { status: 'ok', dados } })
      })
      .catch((e: unknown) => {
        // Talhão ou solo trocou, ou o componente saiu: a requisição anterior não interessa mais.
        if (!ativo) return
        setResposta({ chave, estado: { status: 'erro', dados: null, erro: e instanceof ErroRotacoes ? e.motivo : 'rede' } })
      })
      .finally(() => clearTimeout(timer))
    return () => { ativo = false; clearTimeout(timer); ac.abort() }
  }, [chave, lat, lon, solo, tentativa])

  const recarregar = useCallback(() => {
    if (chave) apagarRotacoes(chave)
    setTentativa(n => n + 1)
  }, [chave])

  const estado = resposta.chave === chave ? resposta.estado : CARREGANDO
  return { ...estado, recarregar }
}
