import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  API_URL, CHAVE_CACHE, ErroClima, TTL_MS, apagarCache, chaveClima, climaDecendios, gravarCache, lerCache, limparMemoria,
} from './clima'
import { climaDeMock } from '../data/climaFixture'

const resposta = (corpo: unknown, status = 200) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => corpo })

const P = { lat: -12.54285, lon: -55.717 }

const motivo = async (p: Promise<unknown>) => {
  try {
    await p
    return null
  } catch (e) {
    return e instanceof ErroClima ? e.motivo : e
  }
}

beforeEach(() => {
  localStorage.clear()
  limparMemoria()
})
afterEach(() => vi.unstubAllGlobals())

describe('climaDecendios', () => {
  it('monta a URL e devolve a resposta válida', async () => {
    const fetchMock = resposta(climaDeMock())
    vi.stubGlobal('fetch', fetchMock)
    const r = await climaDecendios(P)
    expect(r.decendios).toHaveLength(36)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url.startsWith(`${API_URL}/api/clima/decendios?`)).toBe(true)
    expect(url).toContain('lat=-12.54285')
    expect(url).toContain('lon=-55.717')
  })
  it('422 → parametros, com a mensagem do backend', async () => {
    vi.stubGlobal('fetch', resposta({ detail: [{ msg: 'Input should be less than or equal to 90' }] }, 422))
    await expect(climaDecendios({ lat: 95, lon: 0 })).rejects.toMatchObject({ motivo: 'parametros', status: 422, message: /90/ })
  })
  it('HTTP 500 → http', async () => {
    vi.stubGlobal('fetch', resposta({}, 500))
    expect(await motivo(climaDecendios(P))).toBe('http')
  })
  it('falha de rede → rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    expect(await motivo(climaDecendios(P))).toBe('rede')
  })
  it('cancelamento repassa o AbortError', async () => {
    const abort = Object.assign(new Error('abortado'), { name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(climaDecendios(P)).rejects.toBe(abort)
  })
  it('35 decêndios ou idx fora de ordem → resposta_invalida', async () => {
    const c = climaDeMock()
    vi.stubGlobal('fetch', resposta({ ...c, decendios: c.decendios.slice(1) }))
    expect(await motivo(climaDecendios(P))).toBe('resposta_invalida')
    const trocado = c.decendios.slice()
    ;[trocado[0], trocado[1]] = [trocado[1], trocado[0]]
    vi.stubGlobal('fetch', resposta({ ...c, decendios: trocado }))
    expect(await motivo(climaDecendios(P))).toBe('resposta_invalida')
  })
})

describe('cache', () => {
  const chave = chaveClima(P)
  it('chave arredonda a 2 casas', () => {
    expect(chave).toBe('-12.54,-55.72')
  })
  it('grava e lê, inclusive depois de limpar a memória', () => {
    const c = climaDeMock()
    gravarCache(chave, c, 1000)
    expect(lerCache(chave, 2000)).toEqual(c)
    limparMemoria()
    expect(lerCache(chave, 2000)).toEqual(c)
  })
  it('expira pelo TTL', () => {
    gravarCache(chave, climaDeMock(), 1000)
    expect(lerCache(chave, 1000 + TTL_MS)).toBeNull()
    limparMemoria()
    expect(lerCache(chave, 1000 + TTL_MS)).toBeNull()
  })
  it('JSON corrompido → null, sem lançar', () => {
    localStorage.setItem(CHAVE_CACHE, '{nope')
    expect(lerCache(chave)).toBeNull()
  })
  it('apagar remove da memória e do navegador', () => {
    gravarCache(chave, climaDeMock())
    apagarCache(chave)
    expect(lerCache(chave)).toBeNull()
    expect(localStorage.getItem(CHAVE_CACHE)).toBe('{}')
  })
  it('mantém só as 20 entradas mais recentes', () => {
    const c = climaDeMock()
    for (let i = 0; i < 22; i++) gravarCache(`k${i}`, c, i)
    const t = JSON.parse(localStorage.getItem(CHAVE_CACHE)!) as Record<string, unknown>
    expect(Object.keys(t)).toHaveLength(20)
    expect(t.k0).toBeUndefined()
    expect(t.k21).toBeDefined()
  })
})
