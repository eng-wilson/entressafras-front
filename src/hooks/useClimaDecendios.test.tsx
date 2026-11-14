import { renderHook, waitFor, act, cleanup } from '@testing-library/react'
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useClimaDecendios } from './useClimaDecendios'
import { gravarCache, chaveClima, limparMemoria } from '../services/clima'
import { climaDeMock } from '../data/climaFixture'
const ponto = { lat: -12.54, lon: -55.72 }
beforeEach(() => { localStorage.clear(); limparMemoria() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('usa cache quente sem consultar a rede', () => {
 const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
 gravarCache(chaveClima(ponto), climaDeMock())
 const { result } = renderHook(() => useClimaDecendios(ponto))
 expect(result.current.status).toBe('ok'); expect(fetch).not.toHaveBeenCalled()
})
it('permite recuperar de erro de rede', async () => {
 const fetch = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({ ok: true, status: 200, json: async () => climaDeMock() })
 vi.stubGlobal('fetch', fetch)
 const { result } = renderHook(() => useClimaDecendios(ponto))
 await waitFor(() => expect(result.current.status).toBe('erro'))
 act(() => result.current.recarregar())
 await waitFor(() => expect(result.current.status).toBe('ok'))
 expect(fetch).toHaveBeenCalledTimes(2)
})
it('resposta antiga nao substitui o novo ponto', async () => {
 let resolver!: (r: unknown) => void
 const fetch = vi.fn().mockImplementationOnce(() => new Promise(r => { resolver = r })).mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...climaDeMock(), fonte: 'novo' }) })
 vi.stubGlobal('fetch', fetch)
 const { result, rerender } = renderHook(({ p }) => useClimaDecendios(p), { initialProps: { p: ponto } })
 rerender({ p: { lat: -20, lon: -40 } })
 await waitFor(() => expect(result.current.dados?.fonte).toBe('novo'))
 await act(async () => { resolver({ ok: true, status: 200, json: async () => climaDeMock() }) })
 expect(result.current.dados?.fonte).toBe('novo')
})
