import { describe, it, expect } from 'vitest'
import { rankRotations } from './rank'

describe('rankRotations', () => {
  it('com apenas risco ativo: r1(idx=0, score 5) é 1º, r4(idx=3, score 15) é último', () => {
    const pos = rankRotations({ risco:true, agua:false, solo:false, prod:false })
    expect(pos[0]).toBe(0)
    expect(pos[3]).toBe(3)
  })
  it('nenhuma ativa → usa risco como padrão', () => {
    const a = rankRotations({ risco:false, agua:false, solo:false, prod:false })
    const b = rankRotations({ risco:true,  agua:false, solo:false, prod:false })
    expect(a).toEqual(b)
  })
  it('retorna 4 posições únicas 0–3', () => {
    const pos = rankRotations({ risco:true, agua:true, solo:true, prod:true })
    expect(pos).toHaveLength(4)
    expect(new Set(pos).size).toBe(4)
    pos.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
    pos.forEach(v => expect(v).toBeLessThanOrEqual(3))
  })
  it('risco+solo: r1(solo=0) deve superar r2(solo=60)', () => {
    const pos = rankRotations({ risco:true, agua:false, solo:true, prod:false })
    expect(pos[0]).toBeLessThan(pos[1])
  })
})
