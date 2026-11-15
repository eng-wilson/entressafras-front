// Catálogo do menu de culturas do rascunho: só as que a API simula (GET /api/crops?simulable=true).
import { useCallback, useEffect, useState } from 'react'
import type { CropSummary } from '../types'
import { culturasSimulaveis, lerSimulaveis } from '../services/culturas'

export type EstadoSimulaveis =
  | { status: 'carregando'; itens: null }
  | { status: 'ok'; itens: CropSummary[] }
  | { status: 'erro'; itens: null }

export function useCulturasSimulaveis(ativo: boolean): EstadoSimulaveis & { recarregar: () => void } {
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<EstadoSimulaveis>(() => {
    const c = lerSimulaveis()
    return c ? { status: 'ok', itens: c } : { status: 'carregando', itens: null }
  })
  useEffect(() => {
    if (!ativo || estado.status === 'ok') return
    const ac = new AbortController()
    let vivo = true
    culturasSimulaveis(ac.signal)
      .then(itens => { if (vivo) setEstado({ status: 'ok', itens }) })
      .catch(() => { if (vivo) setEstado({ status: 'erro', itens: null }) })
    return () => { vivo = false; ac.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, tentativa])
  const recarregar = useCallback(() => {
    setEstado({ status: 'carregando', itens: null })
    setTentativa(n => n + 1)
  }, [])
  return { ...estado, recarregar }
}
