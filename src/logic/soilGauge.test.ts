import { describe, it, expect } from 'vitest'
import { soilGauge } from './soilGauge'

describe('atendimento à demanda — saída da simulação', () => {
  it.each([[.44, 'risk'], [.45, 'warn'], [.54, 'warn'], [.55, 'good'], [1, 'good']] as const)('classifica %s sem consultar uma tabela por data', (v, cls) => {
    const r = soilGauge(v, true)
    expect(r.cls).toBe(cls)
    expect(r.val).toBe(v.toFixed(2).replace('.', ','))
    expect(r.cx).toBe(v * 268)
    expect(r.unit).toContain('simulação local')
  })
  it.each([null, NaN])('mantém o resultado ausente neutro: %s', v => {
    const r = soilGauge(v, true)
    expect(r.semDado).toBe(true)
    expect(r.val).toBe('—')
    expect(r.label).toBe('Sem dado')
  })
  it('não inventa água armazenada para a entressafra', () => {
    const r = soilGauge(null, false)
    expect(r.label).toBe('Sem demanda')
    expect(r.semDado).toBe(true)
  })
})
