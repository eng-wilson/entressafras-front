import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_SALVAS, guardarSalva, lerSalvas, MAX_SALVAS, proximoAnoAgricola, removerSalva } from './rotacoesSalvas'

const culturas = [
  { code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' },
  { code: 48747, planting_date: '2028-02-21', harvest_date: '2028-06-10' },
] as Parameters<typeof guardarSalva>[2]

beforeEach(() => localStorage.clear())

describe('rotações salvas', () => {
  it('guarda por talhão e ano, até 3, da mais antiga para a mais nova', () => {
    for (let i = 0; i < MAX_SALVAS; i++) expect(guardarSalva('t1', 2027, culturas, 100 - i)).not.toBeNull()
    expect(guardarSalva('t1', 2027, culturas)).toBeNull()
    expect(guardarSalva('t1', 2028, culturas)).not.toBeNull()
    const l = lerSalvas('t1', 2027)
    expect(l.map(s => s.em)).toEqual([98, 99, 100])
    expect(lerSalvas('t2', 2027)).toEqual([])
  })
  it('remove e ignora dados corrompidos', () => {
    const s = guardarSalva('t1', 2027, culturas)!
    removerSalva('t1', s.id)
    expect(lerSalvas('t1', 2027)).toEqual([])
    localStorage.setItem(CHAVE_SALVAS, JSON.stringify({ t1: [{ id: 1 }] }))
    expect(lerSalvas('t1', 2027)).toEqual([])
    localStorage.setItem(CHAVE_SALVAS, '{')
    expect(lerSalvas('t1', 2027)).toEqual([])
  })
  it('guarda e lê uma rotação de 1 cultura (seguida de pousio); recusa 3 culturas gravadas', () => {
    expect(guardarSalva('t1', 2027, [culturas[0]])).not.toBeNull()
    expect(lerSalvas('t1', 2027)[0].culturas).toHaveLength(1)
    localStorage.setItem(CHAVE_SALVAS, JSON.stringify({ t1: [{ id: 'x', ano: 2027, em: 1, culturas: [...culturas, culturas[0]] }] }))
    expect(lerSalvas('t1', 2027)).toEqual([])
  })
  it('ano agrícola como o backend: a próxima safra a começar', () => {
    expect(proximoAnoAgricola(new Date(2026, 10, 15))).toBe(2027)
    expect(proximoAnoAgricola(new Date(2026, 7, 31))).toBe(2026)
  })
})
