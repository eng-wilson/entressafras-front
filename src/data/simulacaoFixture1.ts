// Simulação de 1 cultura (soja + pousio até 31/ago), no formato do handoff do backend (commit 8a258f1): mesma
// resposta da fixture de 2 culturas reduzida à soja, com second_planting_sweep null, pontos do sweep de 1 cultura e
// os valores do exemplo real (rank 11 de 14, soil_protection 19). Uso exclusivo em testes.
import type { RotationSimulationResponse } from '../types'
import { SIMULACAO_FIXTURE } from './simulacaoFixture'

const base = structuredClone(SIMULACAO_FIXTURE)
const soja = base.rotation.crops[0]

export const SIMULACAO_1_CULTURA: RotationSimulationResponse = {
  ...base,
  rotation: {
    ...base.rotation,
    id: `custom-1150-${soja.planting_date}`,
    rank: 11,
    ranked_among: 14,
    would_be_recommended: false,
    crops: [soja],
    soil_protection: {
      ...base.rotation.soil_protection,
      score: 19, living_cover_days: 100, season_days: 366, cover_fraction: 0.273,
      family_change_fraction: 0, transitions: 0, family_changes: 0, botanical_families: ['Fabaceae'],
    },
    scores: { productivity: 99.9, water_security: 100, soil_protection: 19.1, overall: 73, aggregation: 'WORST_CROP' },
    checks: [],
  },
  first_planting_sweep: base.first_planting_sweep && {
    ...base.first_planting_sweep,
    points: base.first_planting_sweep.points.map(p => ({ ...p, crops: [p.crops[0]] })),
  },
  second_planting_sweep: null,
}
