import { describe, it, expect } from 'vitest'
import { tempGauge } from './tempGauge'

describe('tempGauge — soja', () => {
  it('idx=9: TMAX=29 (<=30) → good "Bom"', () => {
    const r = tempGauge('soja', 'flor', false, 9)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Bom')
  })
  it('idx=0: TMAX=35 (>30, <=40) → warn "Calor · Atenção"', () => {
    const r = tempGauge('soja', 'veg', false, 0)
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Calor · Atenção')
  })
  it('idx=28: TMAX=31 (>30) durante floração → warn "Calor · Atenção"', () => {
    const r = tempGauge('soja', 'flor', false, 28)
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Calor · Atenção')
  })
})

describe('tempGauge — sem cultura', () => {
  it('coberto (palhada) → good "Protegido"', () => {
    const r = tempGauge(null, 'straw', true, 0)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Protegido')
  })
  it('descoberto + TMAX=35 (>=32) → warn "Exposto"', () => {
    const r = tempGauge(null, 'bare', false, 0)
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Exposto')
  })
  it('descoberto + TMAX=29 (<32) → "Sem cultura"', () => {
    const r = tempGauge(null, 'bare', false, 9)
    expect(r.label).toBe('Sem cultura')
  })
})

describe('tempGauge — milho', () => {
  it('milho não tem limite de calor → sempre good no quesito calor', () => {
    const r = tempGauge('milho', 'veg', false, 0)
    expect(r.cls).toBe('good')
  })
})
