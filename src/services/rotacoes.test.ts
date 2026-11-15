/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import {
  AVISO_SALVAS_INVALIDAS, CHAVE_CACHE_ROTACOES, ErroRotacoes, TTL_ROTACOES, apagarRotacoes, chaveRotacoes, guardarRotacoes, lerRotacoes,
  limparMemoriaRotacoes, recomendarRotacoes, rotacoesValidas, soloDaTextura,
} from './rotacoes'

const ponto = { lat: -12.55, lon: -55.72 }
const todas = { water_security: 1, productivity: 1, soil_protection: 1 } as const
const pedido = (solo: 'sandy' | 'medium' | 'clayey' | null = 'medium', extra = {}) =>
  ({ ponto, solo, historico: [] as number[], prioridades: todas, ...extra })
const resposta = (corpo: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  limparMemoriaRotacoes()
})

describe('recomendarRotacoes', () => {
  it('envia ponto, solo, histórico e prioridades por POST e valida a resposta', async () => {
    const f = resposta(ROTACOES_FIXTURE)
    vi.stubGlobal('fetch', f)
    const r = await recomendarRotacoes(pedido('clayey', { historico: [1150, 2175], prioridades: { water_security: 1, productivity: 0, soil_protection: 1 } }))
    expect(r.rotations).toHaveLength(4)
    const [url, init] = f.mock.calls[0]
    expect(url).toMatch(/\/api\/rotations\/recommendations$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      location: ponto, soil_type: 'clayey', crop_history: [1150, 2175],
      priorities: { water_security: 1, productivity: 0, soil_protection: 1 },
    })
  })

  it('sem textura informada, não manda soil_type (a API estima pelo local); sem histórico, não manda crop_history', async () => {
    const f = resposta(ROTACOES_FIXTURE)
    vi.stubGlobal('fetch', f)
    await recomendarRotacoes(pedido(null))
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ location: ponto, priorities: todas })
  })

  it('distingue rede, 422, HTTP e formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(recomendarRotacoes(pedido('medium'))).rejects.toMatchObject({ motivo: 'rede' })
    vi.stubGlobal('fetch', resposta({ detail: [] }, 422))
    await expect(recomendarRotacoes(pedido('medium'))).rejects.toMatchObject({ motivo: 'parametros' })
    vi.stubGlobal('fetch', resposta({}, 503))
    await expect(recomendarRotacoes(pedido('medium'))).rejects.toMatchObject({ motivo: 'http', status: 503 })
    vi.stubGlobal('fetch', resposta({ rotations: [] }))
    await expect(recomendarRotacoes(pedido('medium'))).rejects.toBeInstanceOf(ErroRotacoes)
  })
})

describe('rotacoesValidas', () => {
  it('aceita a resposta no formato do contrato', () => expect(rotacoesValidas(ROTACOES_FIXTURE)).toBe(true))
  it('recusa resposta sem scores, sem proteção do solo, sem calendário ou sem solo', () => {
    for (const tirar of [
      (r: any) => delete r.rotations[0].scores,
      (r: any) => delete r.rotations[0].soil_protection,
      (r: any) => delete r.rotations[0].crops[1].calendar,
      (r: any) => delete r.soil,
    ]) {
      const r = structuredClone(ROTACOES_FIXTURE)
      tirar(r)
      expect(rotacoesValidas(r)).toBe(false)
    }
  })
  it('aceita método de risco desconhecido (não só MOCK)', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations[0].crops[0].crop.risk.method = 'FAO56_DAILY_KY'
    expect(rotacoesValidas(r)).toBe(true)
  })
  it('recusa datas fora de ordem ou culturas sem risco', () => {
    const datas = structuredClone(ROTACOES_FIXTURE)
    datas.rotations[0].crops[1].planting_date = '2027-12-01'
    expect(rotacoesValidas(datas)).toBe(false)
    const risco = structuredClone(ROTACOES_FIXTURE) as unknown as { rotations: { crops: { crop: { risk?: unknown } }[] }[] }
    delete risco.rotations[0].crops[0].crop.risk
    expect(rotacoesValidas(risco)).toBe(false)
  })
})

describe('cache', () => {
  it('guarda por ponto, solo, histórico e prioridades durante um dia', () => {
    const chave = chaveRotacoes(pedido('medium'))
    expect(chave).not.toBe(chaveRotacoes(pedido('sandy')))
    expect(chave).not.toBe(chaveRotacoes(pedido(null)))
    expect(chave).not.toBe(chaveRotacoes(pedido('medium', { historico: [1150] })))
    expect(chave).not.toBe(chaveRotacoes(pedido('medium', { prioridades: { ...todas, productivity: 0 } })))
    guardarRotacoes(chave, ROTACOES_FIXTURE, 1000)
    limparMemoriaRotacoes()
    expect(lerRotacoes(chave, 1000 + TTL_ROTACOES - 1)).toEqual(ROTACOES_FIXTURE)
    limparMemoriaRotacoes()
    expect(lerRotacoes(chave, 1000 + TTL_ROTACOES)).toBeNull()
  })
  it('ignora entrada corrompida e apaga sob demanda', () => {
    const chave = chaveRotacoes(pedido('medium'))
    localStorage.setItem(CHAVE_CACHE_ROTACOES, JSON.stringify({ [chave]: { em: Date.now(), dados: { x: 1 } } }))
    expect(lerRotacoes(chave)).toBeNull()
    guardarRotacoes(chave, ROTACOES_FIXTURE)
    apagarRotacoes(chave)
    expect(lerRotacoes(chave)).toBeNull()
  })
  it('textura sem informação não vira solo nenhum (a API estima)', () => {
    expect(soloDaTextura(null)).toBeNull()
    expect(soloDaTextura('arenoso')).toBe('sandy')
  })
})

describe('rotações do agricultor em custom_rotations', () => {
  const custom = [[{ code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' }, { code: 48747, planting_date: '2028-02-21', harvest_date: '2028-06-10' }]]
  it('manda as salvas com o ano delas e muda a chave do cache', async () => {
    const f = resposta(ROTACOES_FIXTURE)
    vi.stubGlobal('fetch', f)
    await recomendarRotacoes({ ...pedido('medium'), ano: 2027, custom })
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ agricultural_year: 2027, custom_rotations: [{ crops: custom[0] }] })
    expect(chaveRotacoes({ ...pedido('medium'), ano: 2027, custom })).not.toBe(chaveRotacoes({ ...pedido('medium'), ano: 2027 }))
  })
  it('422 por causa das salvas: repete sem elas e avisa', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'custom rotation: unknown crop 1' }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ROTACOES_FIXTURE), { status: 200 }))
    vi.stubGlobal('fetch', f)
    const r = await recomendarRotacoes({ ...pedido('medium'), ano: 2027, custom })
    expect(JSON.parse(f.mock.calls[1][1].body).custom_rotations).toBeUndefined()
    expect(r.custom_rotations).toEqual([])
    expect(r.warnings).toContain(AVISO_SALVAS_INVALIDAS)
  })
})
