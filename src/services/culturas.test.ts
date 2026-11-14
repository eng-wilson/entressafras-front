import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CULTURAS_FIXTURE } from '../data/culturasFixture'
import { API_URL } from './clima'
import { buscarCulturas, detalheCultura, culturaValida, guardarCultura, lerCultura,
  limparMemoriaCulturas, apagarCultura, CHAVE_CACHE_CULTURAS, TTL_CULTURAS } from './culturas'

const soja = CULTURAS_FIXTURE[0]
beforeEach(() => { localStorage.clear(); limparMemoriaCulturas() })
afterEach(() => vi.unstubAllGlobals())
const resposta = (v: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => v })

describe('catálogo de culturas', () => {
  it('consulta por espécie e detalhe pelo código sem confundir espécies', async () => {
    const pagina = { total: 1, limit: 100, offset: 0, items: [{ eco_port_code: soja.eco_port_code, scientific_name: soja.scientific_name, common_names: [], category: [], life_span: [] }] }
    const fetch = vi.fn().mockResolvedValueOnce(resposta(pagina)).mockResolvedValueOnce(resposta(soja))
    vi.stubGlobal('fetch', fetch)
    expect(await buscarCulturas('Glycine max')).toEqual(pagina)
    expect(await detalheCultura(1150)).toEqual(soja)
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('q')).toBe('Glycine max')
    expect(fetch.mock.calls[1][0]).toBe(`${API_URL}/api/crops/1150`)
  })
  it('aceita respostas reais com campos null e rejeita faixas incoerentes ou tipo incorreto', () => {
    for (const c of CULTURAS_FIXTURE) expect(culturaValida(c)).toBe(true)
    expect(culturaValida({ ...soja, temperature: { ...soja.temperature, optimal_min: 100 } })).toBe(false)
    expect(culturaValida({ ...soja, rainfall: { ...soja.rainfall, optimal_min: '600' } })).toBe(false)
    expect(culturaValida({ ...soja, soil: null })).toBe(false)
  })
  it('rejeita código divergente, erro HTTP e resposta malformada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(resposta(soja)).mockResolvedValueOnce(resposta({}, false)).mockResolvedValueOnce(resposta({})))
    await expect(detalheCultura(2175)).rejects.toThrow('inválida')
    await expect(buscarCulturas('soja')).rejects.toThrow('500')
    await expect(buscarCulturas('soja')).rejects.toThrow('inválida')
  })
  it('preserva cancelamento e falha de rede', async () => {
    const cancelado = new DOMException('cancelado', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(cancelado).mockRejectedValueOnce(new TypeError('offline')))
    await expect(detalheCultura(1150)).rejects.toBe(cancelado)
    await expect(buscarCulturas('soja')).rejects.toThrow('offline')
  })
})
describe('cache de culturas', () => {
  it('persiste, lê e expira depois de sete dias', () => {
    guardarCultura(soja, 1000)
    limparMemoriaCulturas()
    expect(lerCultura(1150, 1001)).toEqual(soja)
    expect(lerCultura(1150, 1000 + TTL_CULTURAS)).toBeNull()
    expect(lerCultura(2175, 1001)).toBeNull()
  })
  it('tolera cache corrompido e invalida uma referência', () => {
    localStorage.setItem(CHAVE_CACHE_CULTURAS, '{invalid')
    expect(lerCultura(1150)).toBeNull()
    guardarCultura(soja)
    apagarCultura(1150)
    expect(lerCultura(1150)).toBeNull()
  })
  it('segue em memória quando o armazenamento falha', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    try { guardarCultura(soja); expect(lerCultura(1150)).toEqual(soja) } finally { spy.mockRestore() }
  })
})
