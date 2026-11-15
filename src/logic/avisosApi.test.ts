import { afterEach, describe, expect, it } from 'vitest'
import { avisosDeLocal, textoAvisoLocal } from './avisosApi'
import { definirIdioma } from '../i18n'
import type { SoilInfo } from '../types'

afterEach(() => definirIdioma('pt'))

// Textos exatos do backend (app/api/routes/rotations.py)
const SOLO = 'SoilGrids did not answer for this location (no answer within 25 s); soil from the nearest cached point (1694.6 km away). Send soil_type if it does not describe the field.'
const SOLO_PERTO = 'SoilGrids did not answer for this location (no answer within 25 s); soil from the nearest cached point (2.8 km away). Send soil_type if it does not describe the field.'
const CLIMA = 'NASA POWER did not answer (timeout); climate from the nearest cached cell at -12.5, -55.625 (120 km away, seasons 2016/17–2025/26). Risks describe that cell.'
const SEM_SOLO = 'Soil estimate unavailable (no data) and no cached soil to fall back on; assumed medium texture. Send soil_type for a better estimate.'
const soloEm = (km: number) => ({ distance_km: km }) as SoilInfo

describe('avisos do local vindos da API', () => {
  it('solo de um ponto distante, pelo aviso ou pela distância amostrada (acima de 10 km)', () => {
    expect(avisosDeLocal([SOLO])).toEqual([{ tipo: 'solo-distante', km: 1694.6 }])
    expect(avisosDeLocal([SOLO_PERTO])).toEqual([])
    expect(avisosDeLocal([], soloEm(35))).toEqual([{ tipo: 'solo-distante', km: 35 }])
    expect(avisosDeLocal([], soloEm(0.3))).toEqual([])
  })

  it('clima de outra célula e solo padrão; avisos comuns do método não viram alerta', () => {
    expect(avisosDeLocal([CLIMA, SEM_SOLO, 'Experimental method (simplified FAO-56 ...)'])).toEqual([
      { tipo: 'clima-distante', km: 120 }, { tipo: 'solo-padrao' },
    ])
  })

  it('texto curto no idioma da tela', () => {
    expect(textoAvisoLocal({ tipo: 'solo-distante', km: 1694.6 })).toBe('Solo estimado de um ponto a 1.695 km do talhão. Informe a textura se não for parecida.')
    definirIdioma('en')
    expect(textoAvisoLocal({ tipo: 'clima-distante', km: 120 })).toBe('Climate from another region, 120 km from the field: the risks describe that region.')
  })
})
