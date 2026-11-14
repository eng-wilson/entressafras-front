import { describe, it, expect } from 'vitest'
import { areaHa, centroide, fmtHa, fmtHaCurto } from './geo'
import { TALHAO_EXEMPLO } from '../onboarding/exemplo'

describe('areaHa', () => {
  it('talhão de exemplo de Rio Verde tem ~43 ha', () => {
    expect(areaHa(TALHAO_EXEMPLO)).toBeGreaterThan(42)
    expect(areaHa(TALHAO_EXEMPLO)).toBeLessThan(44)
  })
  it('menos de 3 pontos → 0', () => {
    expect(areaHa([[0, 0], [0, 1]])).toBe(0)
  })
  it('não depende do sentido (horário ou anti-horário)', () => {
    expect(areaHa([...TALHAO_EXEMPLO].reverse())).toBeCloseTo(areaHa(TALHAO_EXEMPLO), 6)
  })
})

describe('centroide', () => {
  it('centro do retângulo é o meio', () => {
    const c = centroide(TALHAO_EXEMPLO)
    expect(c.lat).toBeCloseTo(-17.95, 4)
    expect(c.lon).toBeCloseTo(-51.05, 4)
  })
  it('menos de 3 pontos → média', () => {
    expect(centroide([[0, 0], [2, 2]])).toEqual({ lat: 1, lon: 1 })
  })
})

describe('fmtHa', () => {
  it('vírgula decimal abaixo de 10 ha', () => expect(fmtHa(4.32)).toBe('≈ 4,3 ha'))
  it('inteiro a partir de 10 ha', () => expect(fmtHa(42.6)).toBe('≈ 43 ha'))
  it('curto sem ≈', () => expect(fmtHaCurto(42)).toBe('42 ha'))
})
