// Clima por decêndio do talhão ativo: cache primeiro, depois a API; "Tentar de novo" ignora o cache.
import { useCallback, useEffect, useState } from 'react'
import type { EstadoClima, Ponto } from '../types'
import { ErroClima, apagarCache, chaveClima, climaDecendios, gravarCache, lerCache } from '../services/clima'

/** Cobre a primeira carga de um local novo (POWER + SoilGrids + SMAP levam 1–3 min); depois disso vira erro de rede com "Tentar de novo". */
const TEMPO_LIMITE_MS = 180_000

const CARREGANDO: EstadoClima = { status: 'carregando', dados: null }

function sinalComLimite(ac: AbortController): AbortSignal {
  if (typeof AbortSignal.any === 'function' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.any([ac.signal, AbortSignal.timeout(TEMPO_LIMITE_MS)])
  }
  return ac.signal
}

export function useClimaDecendios(p: Ponto | null): EstadoClima & { recarregar: () => void } {
  const lat = p?.lat, lon = p?.lon
  const chave = p ? chaveClima(p) : null
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<EstadoClima>(() => {
    const c = chave ? lerCache(chave) : null
    return c ? { status: 'ok', dados: c } : CARREGANDO
  })

  useEffect(() => {
    if (!chave || lat === undefined || lon === undefined) return
    if (tentativa === 0) {
      const c = lerCache(chave)
      if (c) {
        setEstado({ status: 'ok', dados: c })
        return
      }
    }
    setEstado(CARREGANDO)
    const ac = new AbortController()
    climaDecendios({ lat, lon }, sinalComLimite(ac))
      .then(dados => {
        if (ac.signal.aborted) return
        gravarCache(chave, dados)
        setEstado({ status: 'ok', dados })
      })
      .catch((e: unknown) => {
        // Talhão trocou ou componente saiu: a requisição anterior não interessa mais.
        if (ac.signal.aborted) return
        setEstado({ status: 'erro', dados: null, erro: e instanceof ErroClima ? e.motivo : 'rede' })
      })
    return () => ac.abort()
  }, [chave, lat, lon, tentativa])

  const recarregar = useCallback(() => {
    if (chave) apagarCache(chave)
    setTentativa(n => n + 1)
  }, [chave])

  return { ...estado, recarregar }
}
