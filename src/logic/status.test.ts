import { describe, it, expect } from 'vitest'
import { classeAnos, rotationStatus } from './status'
import type { PeriodoCritico } from './diagnostico'

describe('classeAnos (níveis de risco do ZARC)', () => {
  it('8+ = risco 20% (favorável), 6–7 = 30–40% (arriscado), até 5 = acima de 40% (desfavorável)', () => {
    expect([10, 8, 7, 6, 5, 0].map(classeAnos)).toEqual(['good', 'good', 'warn', 'warn', 'risk', 'risk'])
  })
})

describe('rotationStatus', () => {
  it('sem risco da API → selo neutro, sem estimativa', () => {
    expect(rotationStatus([[10, 'soja'], [null, 'teff']])).toMatchObject({ cls: 'nd', label: 'Sem dado de risco' })
  })
  it('risco até 20% → good, "Clima favorável"', () => {
    const r = rotationStatus([[20,'soja']])
    expect(r.cls).toBe('good')
    expect(r.label).toBe('Clima favorável')
    expect(r.text).toBe('Risco hídrico de 20% (soja), da API')
  })
  it('30–40% → warn, "Clima arriscado"', () => {
    const r = rotationStatus([[40,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Clima arriscado')
  })
  it('acima de 40% → risk, "Clima desfavorável"', () => {
    const r = rotationStatus([[50,'soja']])
    expect(r.cls).toBe('risk')
    expect(r.label).toBe('Clima desfavorável')
  })
  it('múltiplas culturas: usa a mais arriscada — [[10,"soja"],[30,"milho"]] → warn', () => {
    const r = rotationStatus([[10,'soja'],[30,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.text).toContain('milho')
  })
  it('com o período que mais pesa, o selo já diz o motivo', () => {
    const p: PeriodoCritico = {
      safra: 1, nome: 'Sorgo', fase: 2, nomeFase: 'Floração e enchimento de grãos', de: 22, ate: 25,
      rotulo: '11 abr a 20 mai', falhas: 4, cls: 'warn', pct: 40, isna: 0.45, deficitMedio: 74, deficitSeco: 138,
    }
    const r = rotationStatus([[10, 'soja'], [40, 'sorgo']], p)
    expect(r.label).toBe('Arriscado · seca na floração (abr–mai)')
    expect(r.text).toBe('Risco hídrico de 40% (sorgo), da API. Sorgo, floração e enchimento de grãos (11 abr a 20 mai): risco hídrico de 40% (API), maior déficit de água nesta fase.')
    expect(r.aria).toContain('risco hídrico de 40% (API)')
    expect(rotationStatus([[40, 'sorgo']], { ...p, de: 23, ate: 23 }).label).toBe('Arriscado · seca na floração (abr)')
  })
})
