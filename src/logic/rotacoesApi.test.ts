import { describe, expect, it } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { SIMULACAO_FIXTURE } from '../data/simulacaoFixture'
import { climaDeMock } from '../data/climaFixture'
import { conjuntoDaApi, decendioDaData, historicoEcoCrop, lucroDaApi, mesDaData, mesmasCulturas, nomeRotacao, prioridadesApi, rotacaoAtualEcoCrop, textoProtecaoSolo } from './rotacoesApi'
import { resiliencia } from './resiliencia'
import { diagnostico } from './diagnostico'
import { aptidao } from './aptidao'
import { estagios } from './estagios'
import type { CustomRotation, RotationRecommendations } from '../types'

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

  it('janelas e Kc do catálogo', () => {
    const [soja, milho] = conj.rotacoes[2].safras
    expect(soja).toMatchObject({ ref: 'soja', de: 4, ate: 12, kc: [0.4, 1.15, 0.5] })
    expect(milho).toMatchObject({ nome: 'Milho safrinha', ref: 'milho', de: 13, ate: 25 })
    expect(conj.rotacoes[0].safras[1]).toMatchObject({ ref: 'milheto', cobertura: true })
    expect(conj.rotacoes[3].safras[1]).toMatchObject({ ref: 'algodao', ate: 32 })
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
    r.rotations[1].crops[1].crop = { ...r.rotations[1].crops[1].crop, eco_port_code: 99999, scientific_name: 'Eragrostis tef', common_names: ['teff'], water_requirements: null }
    const c = conjuntoDaApi(r)
    expect(c.rotacoes).toHaveLength(4)
    // Fora do catálogo local: nome científico (os nomes comuns do EcoCrop vêm em inglês)
    expect(c.rotacoes[1].safras[1]).toMatchObject({ nome: 'Eragrostis tef', ref: 'eco:99999' })
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

describe('contrato de 15/11/2026: prioridades, histórico, scores e proteção do solo', () => {
  it('histórico do talhão em códigos EcoCrop, do mais antigo ao mais recente, só as 3 últimas safras', () => {
    expect(historicoEcoCrop({
      '2022/23': { c1: 'soja', c2: 'milho' },
      '2023/24': { c1: 'soja', c2: 'nao_plantei' },
      '2024/25': { c1: 'soja', c2: 'outra:girassol' },
      '2025/26': { c1: 'soja', c2: 'sorgo' },
    })).toEqual([1150, 1150, 1150, 48747])
    expect(historicoEcoCrop(null)).toEqual([])
  })

  it('prioridades da lateral → API; economia de água não tem equivalente', () => {
    expect(prioridadesApi({ risco: true, agua: true, solo: false, prod: true }))
      .toEqual({ water_security: 1, productivity: 1, soil_protection: 0 })
  })

  it('cada rotação mantém a cor quando a API só reordena', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations.reverse().forEach((x, i) => { x.rank = i + 1 })
    const reordenado = conjuntoDaApi(r)
    for (const rot of conj.rotacoes) expect(reordenado.rotacoes.find(x => x.id === rot.id)!.cor).toBe(rot.cor)
  })

  it('resiliência, produtividade e saúde do solo vêm dos scores da API (escala absoluta)', () => {
    const r = conj.rotacoes[3]
    expect(aptidao(3, null, conj.rotacoes)).toMatchObject({
      risco: Math.round(r.scores!.water_security!),
      prod: Math.round(r.scores!.productivity!),
      solo: Math.round(r.scores!.soil_protection),
    })
    expect(r.ct.soilWhy).toBe(textoProtecaoSolo(r.protecaoSolo!))
    expect(conj.solo?.texture_class).toBe('medium')
  })

  it('score ausente (risco desconhecido) fica sem nota, sem estimativa local', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations[0].scores = { ...r.rotations[0].scores, water_security: null, productivity: null }
    const c = conjuntoDaApi(r)
    expect(aptidao(0, null, c.rotacoes)).toMatchObject({ risco: null, prod: null })
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

describe('rotação atual do talhão (última safra do histórico) na comparação', () => {
  const hist = { '2024/25': { c1: 'soja', c2: 'sorgo' }, '2025/26': { c1: 'soja', c2: 'milho' } }
  const custom = (codes: [number, number], rank: number) => {
    const base = structuredClone(ROTACOES_FIXTURE.rotations[0])
    base.rank = rank
    base.crops = [structuredClone(base.crops[0]), structuredClone(base.crops[1])]
    base.crops[0].crop.eco_port_code = codes[0]
    base.crops[1].crop.eco_port_code = codes[1]
    // Só os campos que conjuntoDaApi lê (rank, culturas, notas)
    return base as unknown as CustomRotation
  }

  it('vai em custom_rotations com os códigos EcoCrop da safra mais recente, sem datas', () => {
    expect(rotacaoAtualEcoCrop(hist)).toEqual([{ code: 1150 }, { code: 2175 }])
    expect(rotacaoAtualEcoCrop({ '2025/26': { c1: 'soja', c2: 'nao_plantei' } })).toBeNull()
    expect(rotacaoAtualEcoCrop(null)).toBeNull()
    expect(mesmasCulturas([{ code: 1150 }, { code: 2175 }], [{ code: 1150, planting_date: '2027-10-01' }, { code: 2175 }])).toBe(true)
  })

  it('entra na lista como "Atual", sem ser salva, na posição que a API deu', () => {
    const r: RotationRecommendations = { ...ROTACOES_FIXTURE, custom_rotations: [custom([2175, 1150], 2)] }
    const c = conjuntoDaApi(r, { '2025/26': { c1: 'milho', c2: 'soja' } }, [{ id: 'historico', em: 0, historico: true }])
    expect(c.rotacoes).toHaveLength(5)
    const atual = c.rotacoes.find(x => x.historico)!
    expect(atual).toMatchObject({ id: 'historico', ct: { atual: true } })
    expect(atual.salva).toBeUndefined()
    expect(c.rotacoes.indexOf(atual)).toBe(1)
  })

  it('se uma recomendada já tem as mesmas culturas, a cópia sai e a recomendada fica marcada "Atual"', () => {
    const [a, b] = ROTACOES_FIXTURE.rotations[2].crops.map(x => x.crop.eco_port_code) as [number, number]
    const r: RotationRecommendations = { ...ROTACOES_FIXTURE, custom_rotations: [custom([a, b], 3)] }
    const c = conjuntoDaApi(r, hist, [{ id: 'historico', em: 0, historico: true }])
    expect(c.rotacoes).toHaveLength(4)
    expect(c.rotacoes.some(x => x.historico)).toBe(false)
    expect(c.rotacoes[2].ct.atual).toBe(true)
  })
})

describe('lucro estimado (contrato provisório)', () => {
  it('vem da API quando enviado; sem o campo, fica ausente (nada estimado no front)', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations[0].economics = { profit_brl_per_ha: 1234.5 }
    expect(lucroDaApi(r.rotations[0])).toBe(1234.5)
    const c = conjuntoDaApi(r)
    expect(c.rotacoes[0].lucro).toBe(1234.5)
    expect(c.rotacoes[1].lucro).toBeNull()
  })
})
