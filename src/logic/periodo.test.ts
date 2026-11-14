import { describe, it, expect } from 'vitest'
import { decendioDoMes, diasDe, idxDoMes, mesDe, periodoLabel } from './periodo'

describe('periodo', () => {
  it('mês e posição do decêndio', () => {
    expect(mesDe(0)).toBe(0)
    expect(mesDe(10)).toBe(3)
    expect(mesDe(35)).toBe(11)
    expect(decendioDoMes(10)).toBe(1)
    expect(idxDoMes(3)).toEqual([9, 10, 11])
  })
  it('rótulos do período', () => {
    expect(periodoLabel(0)).toBe('1 a 10 de setembro')
    expect(periodoLabel(10)).toBe('11 a 20 de dezembro')
    expect(periodoLabel(17)).toBe('21 a 28 de fevereiro')
    expect(periodoLabel(35)).toBe('21 a 31 de agosto')
    expect(diasDe(2)).toBe('21 a 30')
  })
})
