import { describe, expect, it } from 'vitest'
import { SAFRAS } from '../data/mock'
import type { Decendio } from '../types'
import { NORMAIS } from '../sim/api.js'
import { normaisDoClima, plantioDoDecendio, quadroDoDecendio, rotacaoSim } from './talhaoSim'

describe('plantioDoDecendio', () => {
  it('cai no 5º dia do decêndio, com o mês do calendário', () => {
    expect(plantioDoDecendio(0)).toBe('09-05')
    expect(plantioDoDecendio(5)).toBe('10-25')
    expect(plantioDoDecendio(13)).toBe('01-15')
    expect(plantioDoDecendio(16)).toBe('02-15')
    expect(plantioDoDecendio(35)).toBe('08-25')
  })
})

describe('rotacaoSim', () => {
  it('leva soja → milho safrinha para a simulação, com o potencial da safrinha', () => {
    const r = rotacaoSim(3, SAFRAS[3])
    expect(r.safras).toEqual([
      { cultura: 'soja', nome: 'Soja', plantio: '10-25' },
      { cultura: 'milho', potencial: 130, nome: 'Milho safrinha', plantio: '02-15' },
    ])
  })
  it('consórcios entram como companheira', () => {
    expect(rotacaoSim(0, SAFRAS[0]).safras[1]).toMatchObject({ cultura: 'milheto', companheira: 'crotalaria_spectabilis' })
    expect(rotacaoSim(2, SAFRAS[2]).safras[1]).toMatchObject({ cultura: 'milho', companheira: 'brizantha_marandu' })
  })
})

describe('quadroDoDecendio', () => {
  const s = SAFRAS[3]   // soja 5–15, milho 16–28
  it('estica o ciclo sobre a janela da safra', () => {
    expect(quadroDoDecendio(s, 5)).toEqual({ posicao: 0, fracao: 0 })
    expect(quadroDoDecendio(s, 10)).toEqual({ posicao: 0, fracao: 0.5 })
    expect(quadroDoDecendio(s, 15)).toEqual({ posicao: 0, fracao: 1 })
    expect(quadroDoDecendio(s, 28)).toEqual({ posicao: 1, fracao: 1 })
  })
  it('antes de uma safra mostra o plantio dela', () => {
    expect(quadroDoDecendio(s, 2)).toEqual({ posicao: 0, fracao: 0 })
    expect(quadroDoDecendio(SAFRAS[1].map((x, i) => (i ? { ...x, de: 18 } : x)), 17)).toEqual({ posicao: 1, fracao: 0 })
  })
  it('depois da última colheita fica no fim do ciclo da última safra', () => {
    expect(quadroDoDecendio(s, 31)).toEqual({ posicao: 1, fracao: 1 })
  })
})

describe('normaisDoClima', () => {
  const dec = (idx: number, o: Partial<Decendio> = {}): Decendio => ({
    idx, rotulo: '', dias: 10, anos_validos: 20, dias_preenchidos: 0,
    chuva_media: 10, chuva_p20: null, et0_media: null,
    tmin_media: 15, tmin_extremo_medio: null, tmin_absoluto: null,
    tmax_media: 30, tmax_extremo_medio: null, tmax_absoluto: null,
    gwettop_media: null, gwetroot_media: null, ...o,
  })
  it('sem clima usa as normais do Cerrado goiano', () => {
    expect(normaisDoClima(null, null)).toBe(NORMAIS.cerrado_go)
  })
  it('soma a chuva e faz a média das temperaturas por mês do calendário', () => {
    const ds = Array.from({ length: 36 }, (_, i) => dec(i, i === 12 ? { chuva_media: 40 } : {}))
    const n = normaisDoClima(ds, { lat: -17.8, lon: -50.9 })
    expect(n.chuva[0]).toBe(60)   // janeiro = decêndios 12–14
    expect(n.chuva[8]).toBe(30)   // setembro = decêndios 0–2
    expect(n.tmax[3]).toBe(30)
    expect(n.tmin[3]).toBe(15)
    // Ra pela latitude: perto da normal sintética de Rio Verde
    expect(n.ra[0]).toBeCloseTo(NORMAIS.cerrado_go.ra[0], 0)
  })
  it('mês com dado faltando fica com a normal', () => {
    const ds = Array.from({ length: 36 }, (_, i) => dec(i, i === 0 ? { chuva_media: null, tmax_media: null } : {}))
    const n = normaisDoClima(ds, { lat: -17.8, lon: -50.9 })
    expect(n.chuva[8]).toBe(NORMAIS.cerrado_go.chuva[8])
    expect(n.tmax[8]).toBe(NORMAIS.cerrado_go.tmax[8])
    expect(n.tmin[8]).toBe(15)
  })
})
