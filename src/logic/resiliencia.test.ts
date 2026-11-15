import { describe, expect, it } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { climaDeMock } from '../data/climaFixture'
import { CONJUNTO_LOCAL } from '../data/mock'
import { conjuntoDaApi } from './rotacoesApi'
import { anosDoRisco, faseNoCiclo, kcNoCiclo, resiliencia } from './resiliencia'

const conj = conjuntoDaApi(ROTACOES_FIXTURE)
const defs = conj.rotacoes.map(r => r.safras)

describe('resiliencia (só dados da API)', () => {
  it('a nota de cada safra é o risco da API na escala de 10 anos', () => {
    const r = resiliencia(climaDeMock(), 'medio', defs)
    expect(r.rotacoes.map(x => x.safras.map(s => s.risco?.pct))).toEqual([[10, 20], [10, 20], [10, 30], [10, 40]])
    expect(r.rotacoes.map(x => x.safras.map(s => s.anos))).toEqual([[9, 8], [9, 8], [9, 7], [9, 6]])
  })

  it('a rotação vale o da safra mais arriscada', () => {
    expect(resiliencia(climaDeMock(), 'medio', defs).rotacoes.map(x => x.anos)).toEqual([8, 8, 7, 6])
  })

  it('o risco não depende do clima nem da textura (o front não calcula risco)', () => {
    const a = resiliencia(null, null, defs).rotacoes.map(x => x.anos)
    expect(resiliencia(climaDeMock(), 'arenoso', defs).rotacoes.map(x => x.anos)).toEqual(a)
    expect(resiliencia(climaDeMock(), 'argiloso', defs).rotacoes.map(x => x.anos)).toEqual(a)
  })

  it('sem risco na resposta, a safra e a rotação ficam sem nota (sem estimativa local)', () => {
    const r = resiliencia(climaDeMock(), 'medio', CONJUNTO_LOCAL.rotacoes.map(x => x.safras))
    expect(r.rotacoes.every(x => x.anos === null && x.safras.every(s => s.anos === null && s.risco === null))).toBe(true)
  })

  it('consumo = Σ Kc × ET0 com o Kc da API; sem clima, consumo e chuva ficam null (nunca 0)', () => {
    const soja = resiliencia(climaDeMock(), 'medio', defs).rotacoes[0].safras[0]
    const soma = soja.calc.decendios.reduce((a, d) => a + d.kc! * d.et0!, 0)
    expect(soja.consumo).toBe(Math.round(soma))
    expect(soja.calc.kc).toEqual([0.4, 1.15, 0.5])
    const sem = resiliencia(null, 'medio', defs).rotacoes[0].safras[0]
    expect(sem.consumo).toBeNull()
    expect(sem.chuva).toBeNull()
  })

  it('as fases seguem os estágios FAO-56 da API', () => {
    const soja = resiliencia(null, null, defs).rotacoes[0].safras[0]
    expect(soja.calc.fonteFases).toBe('api')
    expect(soja.calc.fases.map(f => Math.round(f * 85))).toEqual([15, 15, 40, 15])
    // A fase III (meio do ciclo) ocupa quase metade da janela da soja
    expect(soja.calc.decendios.filter(d => d.fase === 2).length).toBeGreaterThanOrEqual(4)
  })
})

describe('escalas', () => {
  it('risco → anos em 10', () => {
    expect([0, 10, 20, 30, 40, 55, 100].map(anosDoRisco)).toEqual([10, 9, 8, 7, 6, 5, 0])
  })
  it('fase e Kc pela proporção das fases', () => {
    const f: [number, number, number, number] = [0.25, 0.25, 0.25, 0.25]
    expect([0.1, 0.3, 0.6, 0.9].map(t => faseNoCiclo(t, f))).toEqual([0, 1, 2, 3])
    expect(kcNoCiclo([0.4, 1.2, 0.6], 0.1, f)).toBe(0.4)
    expect(kcNoCiclo([0.4, 1.2, 0.6], 0.6, f)).toBe(1.2)
    expect(kcNoCiclo([0.4, 1.2, 0.6], 0.375, f)).toBeCloseTo(0.8)
  })
})
