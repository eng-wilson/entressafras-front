import { describe, it, expect } from 'vitest'
import { atencaoCiclo } from './atencaoCiclo'
import type { ResultadoRotacao, SafraSimulada } from '../sim/api'
import type { SafraDef } from '../data/mock'

const defs: SafraDef[] = [{ nome: 'Soja', ref: 'soja', zarc: 'soja', de: 5, ate: 9, risco: { risk_percentage: 10, estimated_yield_loss_pct: 0, loss_threshold_pct: 20, critical_stage: null, mean_isna: { initial: 1, development: 1, mid_season: 1, late_season: 1 }, valid_years: 10, method: 'MOCK' } }]
const safra = (posicao = 0): SafraSimulada => ({ ciclo: 1, posicao, nome: 'Soja', cultura: 'soja', companheira: null, plantio: '10-25', cicloDias: 4, resumo: { produtividade: 0 },
  serie: [.8, .4, .35, .5, .4].map((v, dia) => ({ dia, faseNome: dia < 4 ? 'Floração' : 'Maturação', eta: v * 5, etc: 5, umidade: .2, sens: [dia < 4 ? .9 : .3] })) })
const resultado = (): ResultadoRotacao => ({ rotacao: { id: 'teste', safras: [] }, safras: [safra()] })

describe('momentos locais de atenção', () => {
  it('encontra restrições mesmo quando o risco geral da API é favorável', () => {
    const p = atencaoCiclo(resultado(), defs)
    expect(p.momentos.map(m => [m.de, m.ate, m.estado, m.sensivel])).toEqual([[6, 7, 'risk', true], [8, 8, 'warn', true], [9, 9, 'risk', false]])
    expect(p.momentos[0].menorAtendimento).toBeCloseTo(.35)
    expect(defs[0].risco?.risk_percentage).toBe(10)
  })
  it('separa a restrição na maturação e não sugere irrigação automática', () => {
    const p = atencaoCiclo(resultado(), defs)
    expect(p.momentos[2].acao).toContain('Confirme a maturidade')
    expect(p.momentos[2].reacao).toContain('menor sensibilidade')
    expect(p.momentos[0].acao).not.toContain('Irrigue')
  })
  it('usa o mesmo arredondamento de dia da cena e preserva a cultura correta', () => {
    const r = resultado()
    r.safras[0].cicloDias = 6
    r.safras[0].serie = Array.from({ length: 7 }, (_, dia) => ({ dia, faseNome: 'Crescimento', eta: 2, etc: 5, umidade: .2, sens: [.5] }))
    const p = atencaoCiclo(r, defs)
    expect(p.quadros.filter(q => q.safra === 0).map(q => q.dia)).toEqual([0, 2, 3, 5, 6])
    expect(p.quadros[6].cultura).toBe('Soja')
    expect(p.quadros[4].estado).toBe('none')
  })
  it('zero demanda e série ausente são dados neutros, não condições favoráveis', () => {
    const r = resultado()
    r.safras[0].serie![0].etc = 0
    r.safras[0].serie = r.safras[0].serie!.filter(d => d.dia !== 1)
    const p = atencaoCiclo(r, defs)
    expect(p.quadros[5].estado).toBe('none')
    expect(p.quadros[6].estado).toBe('none')
  })
  it('não mistura ciclos de aquecimento ou a safra anterior', () => {
    const r = resultado()
    r.safras[0].ciclo = 0
    expect(atencaoCiclo(r, defs).momentos).toEqual([])
    r.safras[0].ciclo = 1
    const d = [...defs, { ...defs[0], nome: 'Sorgo', ref: 'sorgo', de: 10, ate: 14 }]
    r.safras.push({ ...safra(1), cultura: 'sorgo' })
    const p = atencaoCiclo(r, d)
    expect(p.momentos.some(m => m.cultura === 'Sorgo')).toBe(true)
    expect(p.momentos.every(m => m.ate <= 9 || m.de >= 10)).toBe(true)
  })
  it('não usa a cultura reserva do desenho para inferir a resposta da cultura real', () => {
    const r = resultado()
    r.safras[0].cultura = 'milho'
    const p = atencaoCiclo(r, defs)
    expect(p.momentos).toEqual([])
    expect(p.quadros.filter(q => q.atendimento != null)).toEqual([])
  })
})
