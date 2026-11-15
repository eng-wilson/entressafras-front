import { describe, it, expect } from 'vitest'
import { classeSeguranca, rotationStatus, rotuloCritico } from './status'
import type { PeriodoCritico } from './diagnostico'

describe('classeSeguranca (régua única do app: a mesma das prioridades)', () => {
  it('segurança hídrica 70+ favorável, 40–69 arriscado, abaixo de 40 desfavorável', () => {
    expect([100, 70, 69, 40, 39, 0].map(classeSeguranca)).toEqual(['good', 'good', 'warn', 'warn', 'risk', 'risk'])
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
  it('31–60% → warn, "Clima arriscado"', () => {
    const r = rotationStatus([[40,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.label).toBe('Clima arriscado')
  })
  it('acima de 60% → risk, "Clima desfavorável"', () => {
    const r = rotationStatus([[70,'soja']])
    expect(r.cls).toBe('risk')
    expect(r.label).toBe('Clima desfavorável')
  })
  it('múltiplas culturas: usa a mais arriscada — [[10,"soja"],[45,"milho"]] → warn', () => {
    const r = rotationStatus([[10,'soja'],[45,'milho']])
    expect(r.cls).toBe('warn')
    expect(r.text).toContain('milho')
  })
  it('o selo do calendário não explica o motivo (fica no painel direito)', () => {
    const r = rotationStatus([[10, 'soja'], [40, 'sorgo']])
    expect(r.label).toBe('Clima arriscado')
    expect(r.text).toBe('Risco hídrico de 40% (sorgo), da API')
  })
})

describe('rotuloCritico', () => {
  it('nível + motivo curto do período', () => {
    const p: PeriodoCritico = {
      safra: 1, nome: 'Sorgo', fase: 2, nomeFase: 'Floração e enchimento de grãos', de: 22, ate: 25,
      rotulo: '11 abr a 20 mai', cls: 'warn', pct: 40, isna: 0.45, deficitMedio: 74, deficitSeco: 138,
    }
    expect(rotuloCritico(p)).toBe('Arriscado · seca na floração (abr–mai)')
    expect(rotuloCritico({ ...p, de: 23, ate: 23 })).toBe('Arriscado · seca na floração (abr)')
  })
})
