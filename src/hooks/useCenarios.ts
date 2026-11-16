// Lista de cenários de clima para o seletor: cache primeiro, depois a API. Sem lista (carregando ou erro), o seletor
// fica oculto e a tela segue no clima atual: nada some e não há aviso extra.
import { useEffect, useState } from 'react'
import type { ClimateScenarioInfo } from '../types'
import { guardarCenarios, lerCenarios, listarCenarios } from '../services/cenarios'

export function useCenarios(): ClimateScenarioInfo[] {
  const [cenarios, setCenarios] = useState<ClimateScenarioInfo[]>(() => lerCenarios() ?? [])
  const carregado = cenarios.length > 0

  useEffect(() => {
    if (carregado) return
    const ac = new AbortController()
    listarCenarios(ac.signal)
      .then(dados => {
        if (ac.signal.aborted) return
        guardarCenarios(dados)
        setCenarios(dados)
      })
      .catch(() => { /* Seletor oculto; a tela segue no clima atual. */ })
    return () => ac.abort()
  }, [carregado])

  return cenarios
}
