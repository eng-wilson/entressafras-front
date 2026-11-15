import { describe, expect, it } from 'vitest'
import { CONJUNTO_LOCAL } from '../data/mock'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { conjuntoDaApi } from './rotacoesApi'
const ROTS = CONJUNTO_LOCAL.rotacoes
const API = conjuntoDaApi(ROTACOES_FIXTURE).rotacoes
import { climaDeMock } from '../data/climaFixture'
import { aptidao, detalheSafra, faixa, faixaAnos, motivo, motivoDetalhe, receitaHa, receitaSafra, safraLimitante } from './aptidao'
import { resiliencia } from './resiliencia'

const res = resiliencia(climaDeMock(), 'medio', CONJUNTO_LOCAL.rotacoes.map(r => r.safras))
const resApi = resiliencia(climaDeMock(), 'medio', API.map(r => r.safras))
const rot = (i: number) => res.rotacoes[i]

describe('aptidao', () => {
  it('água e solo: 100 à melhor rotação e o piso à pior', () => {
    expect(aptidao(0, rot(0), ROTS).agua).toBe(100)
    expect(aptidao(3, rot(3), ROTS).agua).toBe(12)
    expect(aptidao(0, rot(0), ROTS).solo).toBe(100)
    expect(aptidao(3, rot(3), ROTS).solo).toBe(12)
  })

  it('produtividade proporcional à receita da melhor rotação', () => {
    expect(aptidao(2, rot(2), ROTS).prod).toBe(100) // soja precoce → milho + braquiária: R$ 15.378/ha
    expect(aptidao(3, rot(3), ROTS).prod).toBe(94) // R$ 14.454 ÷ 15.378
    expect(aptidao(1, rot(1), ROTS).prod).toBe(75) // R$ 11.570 ÷ 15.378
    expect(aptidao(0, rot(0), ROTS).prod).toBe(57) // R$ 8.842 ÷ 15.378
  })

  it('resiliência pelo risco da API, em escala fixa de 10 pontos por ano', () => {
    expect([0, 1, 2, 3].map(i => aptidao(i, resApi.rotacoes[i], API).risco)).toEqual([80, 80, 70, 60])
  })

  it('sem risco da API, a resiliência fica sem nota', () => {
    expect(aptidao(3, rot(3), ROTS).risco).toBeNull()
    expect(aptidao(3, null, ROTS).risco).toBeNull()
    expect(motivo(ROTS[3], 'risco', null)).toBe('aguardando as rotações')
    expect(motivoDetalhe('risco', null)).toBeNull()
  })

  it('mantém as notas entre 12 e 100', () => {
    for (const i of [0, 1, 2, 3])
      for (const v of Object.values(aptidao(i, resApi.rotacoes[i], API))) {
        expect(v).toBeGreaterThanOrEqual(12)
        expect(v).toBeLessThanOrEqual(100)
      }
  })
})

describe('faixa e motivo', () => {
  it('converte a nota em Fraca / Média / Ótima', () => {
    expect(faixa(12).rotulo).toBe('Fraca')
    expect(faixa(40).rotulo).toBe('Média')
    expect(faixa(70).rotulo).toBe('Ótima')
  })

  it('resiliência segue os níveis de risco do ZARC', () => {
    expect([8, 7, 6, 5].map(n => faixaAnos(n).rotulo)).toEqual(['Ótima', 'Média', 'Média', 'Fraca'])
  })

  it('aponta a safra que limita a rotação, com o risco da API', () => {
    const r = resApi.rotacoes[2]
    expect(safraLimitante(r).nome).toBe('Milho safrinha')
    expect(motivo(API[2], 'risco', r)).toBe('milho safrinha: risco hídrico de 30% (API, provisório)')
    expect(motivo(API[2], 'solo', r)).toBe('solo descoberto por 4 meses')
    expect(motivo(API[2], 'agua', r)).toBeNull()
  })

  it('explica o risco da API e avisa quando ele é MOCK', () => {
    const milho = resApi.rotacoes[2].safras[1]
    expect(detalheSafra(milho)).toBe(
      'Risco hídrico de milho safrinha calculado pela API Entressafras: em 30% das 10 safras históricas a perda por falta de água passou de 20%. ' +
        'A perda média estimada por falta de água é de 14.5%. Leitura pela régua do ZARC: risco 30% no ZARC. ' +
        'Atenção: o servidor ainda marca este valor como MOCK (provisório, não calculado com o clima do talhão).',
    )
    expect(detalheSafra(rot(0).safras[0])).toMatch(/não trouxe o risco hídrico/)
    expect(motivoDetalhe('solo', resApi.rotacoes[0])).toBeNull()
  })

  it('receita por safra soma a da rotação; o que não é vendido conta 0', () => {
    expect(receitaSafra(ROTS[0].ct, 1)).toBe(0)
    for (const i of [0, 1, 2, 3]) expect(receitaSafra(ROTS[i].ct, 0) + receitaSafra(ROTS[i].ct, 1)).toBeCloseTo(receitaHa(ROTS[i].ct))
    expect(receitaHa(ROTS[0].ct)).toBeCloseTo(58 * 152.45)
  })
})
