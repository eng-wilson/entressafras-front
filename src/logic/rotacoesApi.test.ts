import { describe, expect, it } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { SIMULACAO_FIXTURE } from '../data/simulacaoFixture'
import { climaDeMock } from '../data/climaFixture'
import { conjuntoDaApi, decendioDaData, mesDaData, nomeRotacao } from './rotacoesApi'
import { resiliencia } from './resiliencia'
import { diagnostico } from './diagnostico'
import { aptidao } from './aptidao'
import { estagios } from './estagios'
import type { RotationRecommendations } from '../types'

const conj = conjuntoDaApi(ROTACOES_FIXTURE)

describe('datas da API → decêndios do ano agrícola', () => {
  it('conta a partir de 1º de setembro do ano da safra', () => {
    expect(decendioDaData('2027-09-01', 2027)).toBe(0)
    expect(decendioDaData('2027-10-15', 2027)).toBe(4)
    expect(decendioDaData('2028-01-07', 2027)).toBe(12)
    expect(decendioDaData('2028-08-31', 2027)).toBe(35)
  })
  it('limita ao ano agrícola', () => {
    expect(decendioDaData('2027-08-20', 2027)).toBe(0)
    expect(decendioDaData('2028-09-10', 2027)).toBe(35)
  })
  it('posição em meses para as barras', () => {
    expect(mesDaData('2027-10-01', 2027)).toBe(1)
    expect(mesDaData('2028-01-31', 2027, true)).toBe(5)
  })
})

describe('conjuntoDaApi', () => {
  it('mantém a ordem do rank e as 4 rotações', () => {
    expect(conj.origem).toBe('api')
    expect(conj.ano).toBe(2027)
    expect(conj.rotacoes.map(nomeRotacao)).toEqual([
      'Soja depois milheto', 'Soja depois sorgo', 'Soja depois milho safrinha', 'Soja depois algodão 2ª safra',
    ])
  })

  it('repassa os avisos do backend (ranking MOCK)', () => {
    expect(conj.avisos.some(a => a.startsWith('MOCK'))).toBe(true)
  })

  it('janelas, critério do ZARC e Kc do catálogo', () => {
    const [soja, milho] = conj.rotacoes[2].safras
    expect(soja).toMatchObject({ ref: 'soja', zarc: 'soja', de: 4, ate: 12, kc: [0.4, 1.15, 0.5] })
    expect(milho).toMatchObject({ nome: 'Milho safrinha', ref: 'milho', zarc: 'milho2', de: 13, ate: 25 })
    expect(conj.rotacoes[0].safras[1]).toMatchObject({ ref: 'milheto', zarc: 'coberturaMilheto', cobertura: true })
    // Algodão: sem portaria copiada no front, sem critério (nada inventado)
    expect(conj.rotacoes[3].safras[1]).toMatchObject({ ref: 'algodao', zarc: null, ate: 32 })
  })

  it('barras do calendário pelas datas, com pousio até agosto', () => {
    const b = conj.rotacoes[2].barras
    expect(b[0].label).toBe('Soja')
    expect(b[0].s).toBeCloseTo(1 + 14 / 31)
    expect(b.at(-1)).toMatchObject({ label: '', e: 12 })
  })

  it('marca como atual a rotação da safra mais recente do histórico', () => {
    const c = conjuntoDaApi(ROTACOES_FIXTURE, { '2024/25': { c1: 'soja', c2: 'sorgo' }, '2025/26': { c1: 'soja', c2: 'milho' } })
    expect(c.rotacoes.map(r => !!r.ct.atual)).toEqual([false, false, true, false])
    expect(conj.rotacoes.some(r => r.ct.atual)).toBe(false)
  })

  it('cultura desconhecida e sem perfil hídrico continua na tela, sem Kc e sem nada local no lugar', () => {
    const r: RotationRecommendations = structuredClone(ROTACOES_FIXTURE)
    r.rotations[1].crops[1].crop = { ...r.rotations[1].crops[1].crop, eco_port_code: 99999, common_names: ['teff'], water_requirements: null }
    const c = conjuntoDaApi(r)
    expect(c.rotacoes).toHaveLength(4)
    expect(c.rotacoes[1].safras[1]).toMatchObject({ nome: 'Teff', ref: 'eco:99999', zarc: null })
    expect(c.rotacoes[1].safras[1].kc).toBeUndefined()
    expect(c.rotacoes[1].ct.y2).toBe('-')
  })
})

describe('as rotações da API na conta da tela', () => {
  const res = resiliencia(climaDeMock(), 'medio', conj.rotacoes.map(r => r.safras))

  it('leva o risco, o Kc e os estágios da API', () => {
    const [soja, algodao] = res.rotacoes[3].safras
    expect(soja.calc.kc).toEqual([0.4, 1.15, 0.5])
    expect(algodao.risco).toMatchObject({ pct: 40, fase: 2, metodo: 'MOCK' })
    expect(conj.rotacoes[3].safras[1].raiz).toEqual({ ini: 0.3, max: 1.4 })
    expect(aptidao(3, res.rotacoes[3], conj.rotacoes).risco).toBe(60)
    expect(diagnostico(res.rotacoes[3]).decisivo?.nome).toBe('Algodão 2ª safra')
  })

  it('gera os estágios de qualquer cultura, alinhados às fases da API', () => {
    const est = estagios(conj.rotacoes[3].safras)
    const flor = est.find(e => e.ref === 'algodao' && e.k === 'flor')!
    const fase3 = res.rotacoes[3].safras[1].calc.decendios.filter(d => d.fase === 2)
    expect(flor.from).toBe(fase3[0].idx)
    expect(est.find(e => e.ref === 'algodao' && e.k === 'mat')!.from).toBe(fase3.at(-1)!.idx + 1)
  })
})

describe('rotações salvas (custom_rotations)', () => {
  const custom = (rank: number) => ({ ...SIMULACAO_FIXTURE.rotation, rank })
  it('entram pelo rank da API, antes da recomendada de mesmo rank, com a mais antiga primeiro', () => {
    const r: RotationRecommendations = { ...ROTACOES_FIXTURE, custom_rotations: [custom(2), custom(2), custom(9)] }
    const c = conjuntoDaApi(r, null, [{ id: 'b', em: 20 }, { id: 'a', em: 10 }, { id: 'z', em: 5 }])
    expect(c.rotacoes).toHaveLength(7)
    expect(c.rotacoes.map(x => x.salva?.id ?? '-')).toEqual(['-', 'a', 'b', '-', '-', '-', 'z'])
    expect(c.rotacoes[1].id).toBe('salva-a')
  })
  it('sem a salva correspondente, a custom fica de fora', () => {
    const c = conjuntoDaApi({ ...ROTACOES_FIXTURE, custom_rotations: [custom(1)] }, null, [])
    expect(c.rotacoes).toHaveLength(4)
  })
})
