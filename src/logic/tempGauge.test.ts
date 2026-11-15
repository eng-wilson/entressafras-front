import { describe, it, expect } from 'vitest'
import { tempGauge } from './tempGauge'
import { TMAX, TMIN } from '../data/mock'
import { CULTURAS_FIXTURE } from '../data/culturasFixture'
const soja = CULTURAS_FIXTURE.find(c => c.eco_port_code === 1150)!
const milho = CULTURAS_FIXTURE.find(c => c.eco_port_code === 2175)!
const juncea = CULTURAS_FIXTURE.find(c => c.eco_port_code === 801)!

const faixa = (idx: number) => ({ tmin: TMIN[idx], tmax: TMAX[idx] })

describe('tempGauge — soja', () => {
  it('idx=9: faixa 21–29 dentro do ótimo 20–33 → Bom', () => {
    const r = tempGauge('soja', 'flor', false, faixa(9), soja)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Bom')
  })
  it('máxima 35 supera ótimo 33 e não limite 38 → Atenção', () => {
    const r = tempGauge('soja', 'veg', false, { tmin: 21, tmax: 35 }, soja)
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Calor · Atenção')
  })
  it('floração usa requisitos da espécie e não limiar antigo 30', () => {
    const r = tempGauge('soja', 'flor', false, { tmin: 21, tmax: 31 }, soja)
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Bom')
  })
})

describe('tempGauge — sem cultura', () => {
  it('coberto (palhada) → good "Protegido"', () => {
    const r = tempGauge(null, 'straw', true, faixa(0))
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Protegido')
  })
  it('descoberto + TMAX=35 (>=32) → warn "Exposto"', () => {
    const r = tempGauge(null, 'bare', false, faixa(0))
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Exposto')
  })
  it('descoberto + TMAX=29 (<32) → "Sem cultura"', () => {
    const r = tempGauge(null, 'bare', false, faixa(9))
    expect(r.label).toBe('Sem cultura')
  })
})

describe('tempGauge — milho', () => {
  it('milho tem limite de calor 33/47 no catálogo', () => {
    expect(tempGauge('milho', 'veg', false, { tmin: 20, tmax: 35 }, milho).cls).toBe('warn')
    expect(tempGauge('milho', 'veg', false, { tmin: 20, tmax: 48 }, milho).cls).toBe('risk')
  })
})

describe('tempGauge — valores da API', () => {
  it('sem dado em qualquer extremo → semDado, rótulo "Sem dado", sem cápsula', () => {
    const r = tempGauge('soja', 'veg', false, { tmin: null, tmax: 29 })
    expect(r.semDado).toBe(true)
    expect(r.label).toBe('Sem dado')
    expect(r.rw).toBe(0)
    expect(r.aria).toBe('Temperatura: sem dado')
  })
  it('decimais: rótulos arredondados, limiar no valor bruto', () => {
    const r = tempGauge('soja', 'veg', false, { tmin: 20.29, tmax: 29.6 }, soja)
    expect(r.loLabel).toBe('20°')
    expect(r.hiLabel).toBe('30°')
    expect(r.cls).toBe('good')
    expect(r.aria).toBe('Temperatura de 20 a 30 graus, Bom')
    expect(tempGauge('soja', 'veg', false, { tmin: 20, tmax: 33.4 }, soja).cls).toBe('warn')
  })
  it('referência ausente ou parcial preserva números sem classificar como Bom', () => {
    const sem = tempGauge('soja', 'veg', false, faixa(9))
    expect(sem.label).toBe('Sem referência')
    expect(sem.loLabel).toBe('21°')
    expect(sem.semDado).toBe(false)
    expect(tempGauge('soja', 'veg', false, faixa(9), { ...soja, temperature: { ...soja.temperature, absolute_max: null } }).label).toBe('Sem referência')
  })
  it('limites exatos e valores além do absoluto', () => {
    expect(tempGauge('soja', 'veg', false, { tmin: 20, tmax: 33 }, soja).cls).toBe('good')
    expect(tempGauge('soja', 'veg', false, { tmin: 10, tmax: 38 }, soja).cls).toBe('warn')
    expect(tempGauge('soja', 'veg', false, { tmin: 9.9, tmax: 33 }, soja).label).toBe('Frio · Risco')
    expect(tempGauge('soja', 'veg', false, { tmin: 20, tmax: 38.1 }, soja).cls).toBe('risk')
  })
  it('geada depende de limite letal informado, estágio inicial e extremo histórico', () => {
    const faixa = { tmin: 21, tmax: 29, tminExtremo: -1 }
    expect(tempGauge('soja', 'seed', false, faixa, soja).label).toBe('Bom')
    expect(tempGauge('soja', 'seed', false, faixa, juncea).label).toBe('Geada · Risco histórico')
    expect(tempGauge('soja', 'flor', false, faixa, juncea).label).toBe('Bom')
    expect(tempGauge('soja', 'seed', false, { tmin: 21, tmax: 29 }, juncea).label).toBe('Bom')
  })
})
