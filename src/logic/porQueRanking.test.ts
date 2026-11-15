import { describe, expect, it } from 'vitest'
import type { RotacaoDef } from '../data/mock'
import { escalasDaOrdem, notaDaOrdem, porQueRanking } from './porQueRanking'

const rot = (water_security: number | null, soil_protection: number, productivity: number | null) =>
  ({ scores: { water_security, soil_protection, productivity, overall: null } }) as unknown as RotacaoDef
const RESILIENCIA_E_SOLO = { water_security: 1, soil_protection: 1, productivity: 0 } as const

describe('por que nesta posição (escalas da API, prioridades ligadas)', () => {
  it('a ordem usa só as prioridades ligadas; sem nenhuma, as três', () => {
    expect(escalasDaOrdem(RESILIENCIA_E_SOLO)).toEqual(['water_security', 'soil_protection'])
    expect(escalasDaOrdem({ water_security: 0, soil_protection: 0, productivity: 0 })).toHaveLength(3)
    expect(notaDaOrdem(rot(100, 74.4, 98.4).scores, ['water_security', 'soil_protection'])).toBeCloseTo(87.2)
    expect(notaDaOrdem(rot(null, 74, 98).scores, ['water_security'])).toBeNull()
  })

  it('caso real de 15/11: caupi → girassol e caupi → sorgo empatam (87,2 contra 87,1)', () => {
    const rots = [rot(100, 74.4, 98.4), rot(100, 74.2, 97.9)]
    expect(porQueRanking(rots, 0, RESILIENCIA_E_SOLO)).toBe(
      'Empate técnico com a 2ª: 87,2 contra 87,1 na média de resiliência climática e saúde do solo. A ordem entre elas pode mudar com pequenas variações.')
  })

  it('à frente ou atrás da vizinha, com a escala ligada que mais pesou', () => {
    const rots = [rot(90, 80, 50), rot(60, 78, 99)]
    expect(porQueRanking(rots, 0, RESILIENCIA_E_SOLO)).toBe(
      'À frente da 2ª por 16,0 pontos na média de resiliência climática e saúde do solo, sobretudo em resiliência climática (90,0 contra 60,0).')
    expect(porQueRanking(rots, 1, RESILIENCIA_E_SOLO)).toBe(
      'Atrás da 1ª por 16,0 pontos na média de resiliência climática e saúde do solo, sobretudo em resiliência climática (60,0 contra 90,0).')
  })

  it('sem escala da API (risco desconhecido) ou com uma rotação só, não explica nada', () => {
    expect(porQueRanking([rot(null, 80, 50), rot(60, 78, 99)], 0, RESILIENCIA_E_SOLO)).toBeNull()
    expect(porQueRanking([rot(90, 80, 50)], 0, RESILIENCIA_E_SOLO)).toBeNull()
  })
})
