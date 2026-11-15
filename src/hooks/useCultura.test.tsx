import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useCultura } from './useCultura'
import { guardarCultura, limparMemoriaCulturas } from '../services/culturas'
import { CULTURAS_FIXTURE } from '../data/culturasFixture'

const soja = CULTURAS_FIXTURE.find(c => c.eco_port_code === 1150)!
const milho = CULTURAS_FIXTURE.find(c => c.eco_port_code === 2175)!
const resposta = (v: unknown) => ({ ok: true, json: async () => v })
const pagina = (c: typeof soja) => ({ total: 1, limit: 100, offset: 0, items: [{
  eco_port_code: c.eco_port_code, scientific_name: c.scientific_name, common_names: [], category: [], life_span: [],
}] })
beforeEach(() => { localStorage.clear(); limparMemoriaCulturas() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('usa cache validado sem rede', () => {
  guardarCultura(soja)
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useCultura('soja'))
  expect(result.current.dados).toEqual(soja)
  expect(fetch).not.toHaveBeenCalled()
})
it('cultura sem correspondência fica sem referência sem inventar código', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useCultura('crotalaria_ochroleuca'))
  expect(result.current.status).toBe('sem_referencia')
  expect(fetch).not.toHaveBeenCalled()
})
it('resposta antiga de soja não substitui milho após troca de cultura', async () => {
  let resolver!: (valor: unknown) => void
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(resposta(pagina(soja)))
    .mockImplementationOnce(() => new Promise(r => { resolver = r }))
    .mockResolvedValueOnce(resposta(pagina(milho))).mockResolvedValueOnce(resposta(milho)))
  const { result, rerender } = renderHook(({ id }) => useCultura(id), { initialProps: { id: 'soja' } })
  await waitFor(() => expect(resolver).toBeDefined())
  rerender({ id: 'milho' })
  expect(result.current.status).toBe('carregando')
  await waitFor(() => expect(result.current.dados?.eco_port_code).toBe(2175))
  await act(async () => { resolver(resposta(soja)) })
  expect(result.current.dados?.eco_port_code).toBe(2175)
})
it('ignora nomes similares quando a busca não confirma código e espécie', async () => {
  const fetch = vi.fn().mockResolvedValue(resposta(pagina(milho)))
  vi.stubGlobal('fetch', fetch)
  const { result } = renderHook(() => useCultura('soja'))
  await waitFor(() => expect(result.current.status).toBe('sem_referencia'))
  expect(fetch).toHaveBeenCalledTimes(1)
})
