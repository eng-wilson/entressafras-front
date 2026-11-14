import { describe, it, expect, vi, afterEach } from 'vitest'
import { buscar, reverso } from './geocoding'

const resposta = (corpo: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => corpo })

afterEach(() => vi.unstubAllGlobals())

describe('buscar', () => {
  it('converte lat/lon do Nominatim', async () => {
    vi.stubGlobal('fetch', resposta([{ lat: '-12.5', lon: '-55.7' }]))
    expect(await buscar('Sorriso')).toEqual({ lat: -12.5, lon: -55.7 })
  })
  it('nada encontrado → null', async () => {
    vi.stubGlobal('fetch', resposta([]))
    expect(await buscar('xyz')).toBeNull()
  })
  it('falha de rede → null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await buscar('Sorriso')).toBeNull()
  })
})

describe('reverso', () => {
  it('"Cidade, UF" pelo código ISO', async () => {
    vi.stubGlobal('fetch', resposta({ address: { town: 'Sorriso', state: 'Mato Grosso', 'ISO3166-2-lvl4': 'BR-MT' } }))
    expect(await reverso({ lat: -12.5, lon: -55.7 })).toBe('Sorriso, MT')
  })
  it('sem ISO usa a tabela de estados', async () => {
    vi.stubGlobal('fetch', resposta({ address: { city: 'Rio Verde', state: 'Goiás' } }))
    expect(await reverso({ lat: -17.9, lon: -51 })).toBe('Rio Verde, GO')
  })
  it('HTTP com erro → null', async () => {
    vi.stubGlobal('fetch', resposta({}, false))
    expect(await reverso({ lat: 0, lon: 0 })).toBeNull()
  })
})
