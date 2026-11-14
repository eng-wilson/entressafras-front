import { describe, it, expect } from 'vitest'
import { soilGauge } from './soilGauge'

describe('soilGauge — com cultura', () => {
  it('WAT2[16]=0.62 (>=0.55) → good "Bom"', () => {
    const r = soilGauge(16, 'milho', false)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Bom')
  })
  it('WAT2[10]=0.48 (>=0.45, <0.55) → warn "Atenção"', () => {
    const r = soilGauge(10, 'soja', false)
    expect(r.cls).toBe('warn')
  })
  it('WAT2[12]=0.41 (<0.45) → risk "Crítico"', () => {
    const r = soilGauge(12, 'soja', false)
    expect(r.cls).toBe('risk')
    expect(r.label).toBe('Crítico')
  })
})
describe('soilGauge — sem cultura', () => {
  it('coberto com palhada → good "Protegido"', () => {
    const r = soilGauge(29, null, true)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Protegido')
  })
  it('descoberto SOIL[1]=0.30 (<0.45) → warn "Secando"', () => {
    const r = soilGauge(1, null, false)
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Secando')
  })
})
