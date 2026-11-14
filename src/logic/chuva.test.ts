import { describe, it, expect } from 'vitest'
import { alturaChuva, classeChuva, iconeChuva, classeChuvaDecendio, alturaChuvaDecendio } from './chuva'

describe('chuva', () => {
  it('faixas do decêndio usam 1/3 dos limites mensais', () => {
    expect(classeChuvaDecendio(19.9)).toBe('dry')
    expect(classeChuvaDecendio(20)).toBe('low')
    expect(classeChuvaDecendio(49.9)).toBe('low')
    expect(classeChuvaDecendio(50)).toBe('good')
    expect(classeChuvaDecendio(100)).toBe('good')
    expect(classeChuvaDecendio(100.1)).toBe('wet')
    expect(alturaChuvaDecendio(75)).toBe('50.0%')
    expect(alturaChuvaDecendio(200)).toBe('100.0%')
  })
  it('classes nos limiares', () => {
    expect(classeChuva(59)).toBe('dry')
    expect(classeChuva(60)).toBe('low')
    expect(classeChuva(149)).toBe('low')
    expect(classeChuva(150)).toBe('good')
    expect(classeChuva(300)).toBe('good')
    expect(classeChuva(301)).toBe('wet')
  })
  it('ícone: sol, garoa, chuva com sol só de nov a jan', () => {
    expect(iconeChuva(10, 0)).toContain('w-sun')
    expect(iconeChuva(100, 0)).toContain('w-drizzle')
    expect(iconeChuva(200, 3)).toContain('w-mixed')
    expect(iconeChuva(200, 5)).toContain('w-rain')
  })
  it('altura satura em 400 mm', () => {
    expect(alturaChuva(200)).toBe('50.0%')
    expect(alturaChuva(500)).toBe('100.0%')
  })
})
