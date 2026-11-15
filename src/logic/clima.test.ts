import type { Decendio } from '../types'
import { describe, it, expect } from 'vitest'
import { chuvaDoAno, chuvaDoMes, chuvaMeses, climaDoPeriodo, somaOuNull } from './clima'
import { climaDeMock } from '../data/climaFixture'
import { THIS_RAIN, TMAX, TMIN } from '../data/mock'

const { decendios } = climaDeMock()

describe('somaOuNull', () => {
  it('soma; qualquer null anula', () => {
    expect(somaOuNull([1, 2, 3.5])).toBe(6.5)
    expect(somaOuNull([1, null, 3])).toBeNull()
    expect(somaOuNull([])).toBe(0)
  })
})

describe('chuvaDoMes / chuvaMeses', () => {
  it('a fixture reproduz a chuva mensal do mock', () => {
    expect(chuvaMeses(decendios)).toEqual(THIS_RAIN)
    expect(chuvaDoMes(decendios, 3)).toBe(230)
  })
  it('um decêndio sem chuva → mês sem dado', () => {
    const d = decendios.map(x => (x.idx === 10 ? { ...x, chuva_media: null } : x))
    expect(chuvaDoMes(d, 3)).toBeNull()
    expect(chuvaDoMes(d, 4)).toBe(THIS_RAIN[4])
  })
  it('sem dados → 12 nulls', () => {
    expect(chuvaMeses(null)).toEqual(Array(12).fill(null))
  })
})

describe('climaDoPeriodo', () => {
  it('recorta o decêndio e o mês', () => {
    const p = climaDoPeriodo(decendios, 10)
    expect(p.chuvaMes).toBe(230)
    expect(p.chuvaDecendio).toBe(decendios[10].chuva_media)
    expect(p.tmin).toBe(TMIN[10])
    expect(p.tmax).toBe(TMAX[10])
  })
  it('chuva do mês falta mas a temperatura do decêndio fica', () => {
    const d = decendios.map(x => (x.idx === 9 ? { ...x, chuva_media: null } : x))
    const p = climaDoPeriodo(d, 10)
    expect(p.chuvaMes).toBeNull()
    expect(p.tmin).toBe(TMIN[10])
  })
  it('entrada null → tudo null', () => {
    const p = climaDoPeriodo(null, 10)
    expect(Object.values(p).every(v => v === null)).toBe(true)
  })
})

describe('chuvaDoAno', () => {
  const dec = (chuva: number | null) => ({ chuva_media: chuva }) as unknown as Decendio
  it('soma os 36 decêndios', () => {
    expect(chuvaDoAno(Array.from({ length: 36 }, () => dec(40)))).toBe(1440)
  })
  it('um decêndio sem dado deixa o ano sem dado', () => {
    expect(chuvaDoAno(Array.from({ length: 36 }, (_, i) => dec(i === 7 ? null : 40)))).toBeNull()
  })
  it('sem clima ou com decêndios faltando, sem dado', () => {
    expect(chuvaDoAno(null)).toBeNull()
    expect(chuvaDoAno(Array.from({ length: 35 }, () => dec(40)))).toBeNull()
  })
})
