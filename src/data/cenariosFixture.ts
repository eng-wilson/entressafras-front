// Resposta de GET /api/clima/scenarios (valores ilustrativos do backend), para os testes.
import type { ClimateScenarioInfo } from '../types'

export const CENARIOS_FIXTURE: ClimateScenarioInfo[] = [
  { id: 'historical', label: 'Current climate (30 seasons)', delta_temp_c: 0, rain_change_pct: 0, onset_delay_days: 0,
    description: 'Observed climate, no adjustment', source: 'NASA POWER' },
  { id: 'warmer', label: '2030: warmer', delta_temp_c: 1, rain_change_pct: 0, onset_delay_days: 0,
    description: '+1.0 °C', source: 'Illustrative values, pending NEX-GDDP-CMIP6' },
  { id: 'warmer_drier', label: '2030: warmer and drier', delta_temp_c: 1.5, rain_change_pct: -10, onset_delay_days: 10,
    description: '+1.5 °C, −10% rainfall, rainy season starts 10 days later', source: 'Illustrative values, pending NEX-GDDP-CMIP6' },
]
