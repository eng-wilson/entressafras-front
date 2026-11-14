import { describe, it, expect } from 'vitest'
import { rotationStatus } from './status'

describe('rotationStatus', () => {
  it('n>=7 → good, "Clima favorável"', () => {
    const r = rotationStatus([[8,'soja']])
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Clima favorável')
    expect(r.text).toBe('Água suficiente em 8 de 10 anos (soja)')
  })
  it('4–6 → warn, "Clima arriscado"', () => {
    const r = rotationStatus([[5,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Clima arriscado')
  })
  it('<=3 → risk, "Clima desfavorável"', () => {
    const r = rotationStatus([[3,'soja']])
    expect(r.cls).toBe('risk')
    expect(r.label).toBe('Clima desfavorável')
  })
  it('múltiplas culturas: usa a pior — [[8,"soja precoce"],[5,"milho"]] → warn', () => {
    const r = rotationStatus([[8,'soja precoce'],[5,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.text).toContain('milho')
  })
})
