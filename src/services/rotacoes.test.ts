import { afterEach, describe, expect, it, vi } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import {
  CHAVE_CACHE_ROTACOES, ErroRotacoes, TTL_ROTACOES, apagarRotacoes, chaveRotacoes, guardarRotacoes, lerRotacoes,
  limparMemoriaRotacoes, recomendarRotacoes, rotacoesValidas, soloDaTextura,
} from './rotacoes'

const ponto = { lat: -12.55, lon: -55.72 }
const resposta = (corpo: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  limparMemoriaRotacoes()
})

describe('recomendarRotacoes', () => {
  it('envia o solo e o ponto por POST e valida a resposta', async () => {
    const f = resposta(ROTACOES_FIXTURE)
    vi.stubGlobal('fetch', f)
    const r = await recomendarRotacoes({ ponto, solo: 'clayey' })
    expect(r.rotations).toHaveLength(4)
    const [url, init] = f.mock.calls[0]
    expect(url).toMatch(/\/api\/rotations\/recommendations$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ soil_type: 'clayey', location: ponto })
  })

  it('distingue rede, 422, HTTP e formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(recomendarRotacoes({ ponto, solo: 'medium' })).rejects.toMatchObject({ motivo: 'rede' })
    vi.stubGlobal('fetch', resposta({ detail: [] }, 422))
    await expect(recomendarRotacoes({ ponto, solo: 'medium' })).rejects.toMatchObject({ motivo: 'parametros' })
    vi.stubGlobal('fetch', resposta({}, 503))
    await expect(recomendarRotacoes({ ponto, solo: 'medium' })).rejects.toMatchObject({ motivo: 'http', status: 503 })
    vi.stubGlobal('fetch', resposta({ rotations: [] }))
    await expect(recomendarRotacoes({ ponto, solo: 'medium' })).rejects.toBeInstanceOf(ErroRotacoes)
  })
})

describe('rotacoesValidas', () => {
  it('aceita a resposta real', () => expect(rotacoesValidas(ROTACOES_FIXTURE)).toBe(true))
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
  it('guarda por ponto e solo durante um dia', () => {
    const chave = chaveRotacoes({ ponto, solo: 'medium' })
    expect(chave).not.toBe(chaveRotacoes({ ponto, solo: 'sandy' }))
    guardarRotacoes(chave, ROTACOES_FIXTURE, 1000)
    limparMemoriaRotacoes()
    expect(lerRotacoes(chave, 1000 + TTL_ROTACOES - 1)).toEqual(ROTACOES_FIXTURE)
    limparMemoriaRotacoes()
    expect(lerRotacoes(chave, 1000 + TTL_ROTACOES)).toBeNull()
  })
  it('ignora entrada corrompida e apaga sob demanda', () => {
    const chave = chaveRotacoes({ ponto, solo: 'medium' })
    localStorage.setItem(CHAVE_CACHE_ROTACOES, JSON.stringify({ [chave]: { em: Date.now(), dados: { x: 1 } } }))
    expect(lerRotacoes(chave)).toBeNull()
    guardarRotacoes(chave, ROTACOES_FIXTURE)
    apagarRotacoes(chave)
    expect(lerRotacoes(chave)).toBeNull()
  })
  it('textura sem informação vira solo médio', () => {
    expect(soloDaTextura(null)).toBe('medium')
    expect(soloDaTextura('arenoso')).toBe('sandy')
  })
})
