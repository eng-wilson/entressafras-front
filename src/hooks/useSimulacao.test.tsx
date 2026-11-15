import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SIMULACAO_FIXTURE } from '../data/simulacaoFixture'
import { limparMemoriaSimulacao } from '../services/simulacao'
import type { CustomCropInput } from '../types'
import { useSimulacao, type BaseSimulacao } from './useSimulacao'

const base: BaseSimulacao = { ponto: { lat: -12.55, lon: -55.72 }, solo: 'medium', ano: 2027 }
const soja = { code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' }
const sorgo = (plantio: string, colheita: string) => ({ code: 48747, planting_date: plantio, harvest_date: colheita })
const inicial: CustomCropInput[] = [soja, sorgo('2028-02-21', '2028-06-10')]
const ok = () => new Response(JSON.stringify(SIMULACAO_FIXTURE), { status: 200, headers: { 'Content-Type': 'application/json' } })
const corpo = (f: ReturnType<typeof vi.fn>, n: number) => JSON.parse(f.mock.calls[n][1].body)

beforeEach(() => limparMemoriaSimulacao())
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('com menos de 2 culturas não simula', () => {
  const f = vi.fn(); vi.stubGlobal('fetch', f)
  const { result } = renderHook(() => useSimulacao(base, null))
  expect(result.current.status).toBe('incompleto')
  expect(f).not.toHaveBeenCalled()
})

it('1ª chamada com sweep; mover a 2ª mostra a prévia, mantém a faixa dela e recalcula a da 1ª', async () => {
  const f = vi.fn().mockImplementation(async () => ok())
  vi.stubGlobal('fetch', f)
  const { result, rerender } = renderHook(({ c }) => useSimulacao(base, c), { initialProps: { c: inicial } })
  await waitFor(() => expect(result.current.status).toBe('ok'))
  expect(corpo(f, 0).sweep).toBe(true)
  expect(result.current.sweeps.every(Boolean)).toBe(true)

  // A 2ª cultura no decêndio seguinte (1–10 mar), mesmo ciclo em dias: é um ponto do second_planting_sweep.
  const ponto = SIMULACAO_FIXTURE.second_planting_sweep!.points[1].crops[1]
  rerender({ c: [soja, sorgo(ponto.planting_date, ponto.harvest_date)] })
  expect(result.current.status).toBe('simulando')
  expect(result.current.previa?.crops[1].planting_date).toBe(ponto.planting_date)
  expect(result.current.sweeps[1]).not.toBeNull() // a faixa da 2ª continua valendo
  expect(result.current.sweeps[0]).toBeNull() // a da 1ª pressupunha o sorgo em 21/02
  await waitFor(() => expect(f).toHaveBeenCalledTimes(2))
  expect(corpo(f, 1).sweep).toBe(true)
  await waitFor(() => expect(result.current.sweeps[0]).not.toBeNull())
})

it('mover a 1ª mantém a faixa dela e recalcula a da 2ª', async () => {
  const f = vi.fn().mockImplementation(async () => ok())
  vi.stubGlobal('fetch', f)
  const { result, rerender } = renderHook(({ c }) => useSimulacao(base, c), { initialProps: { c: inicial } })
  await waitFor(() => expect(result.current.status).toBe('ok'))
  const p = SIMULACAO_FIXTURE.first_planting_sweep!.points[3].crops[0]
  rerender({ c: [{ code: 1150, planting_date: p.planting_date, harvest_date: p.harvest_date }, inicial[1]] })
  expect(result.current.sweeps[0]).not.toBeNull()
  expect(result.current.sweeps[1]).toBeNull()
  expect(result.current.previa?.crops[0].planting_date).toBe(p.planting_date)
})

it('mudar o ciclo invalida as duas faixas e pede o sweep de novo', async () => {
  const f = vi.fn().mockImplementation(async () => ok())
  vi.stubGlobal('fetch', f)
  const { result, rerender } = renderHook(({ c }) => useSimulacao(base, c), { initialProps: { c: inicial } })
  await waitFor(() => expect(result.current.status).toBe('ok'))
  rerender({ c: [soja, sorgo('2028-02-21', '2028-06-20')] })
  expect(result.current.sweeps).toEqual([null, null])
  await waitFor(() => expect(f).toHaveBeenCalledTimes(2))
  expect(corpo(f, 1).sweep).toBe(true)
})

it('arrasto rápido: só o último pedido sai (debounce)', async () => {
  const f = vi.fn().mockImplementation(async () => ok())
  vi.stubGlobal('fetch', f)
  const { result, rerender } = renderHook(({ c }) => useSimulacao(base, c), { initialProps: { c: inicial } })
  await waitFor(() => expect(result.current.status).toBe('ok'))
  rerender({ c: [soja, sorgo('2028-03-01', '2028-06-18')] })
  rerender({ c: [soja, sorgo('2028-03-11', '2028-06-28')] })
  rerender({ c: [soja, sorgo('2028-03-21', '2028-07-08')] })
  await waitFor(() => expect(f).toHaveBeenCalledTimes(2))
  expect(corpo(f, 1).rotation.crops[1].planting_date).toBe('2028-03-21')
})

it('422 vira erro com o detail; "Tentar de novo" repete', async () => {
  const f = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'custom rotation: unknown crop 1150' }), { status: 422 }))
    .mockImplementation(async () => ok())
  vi.stubGlobal('fetch', f)
  const { result } = renderHook(() => useSimulacao(base, inicial))
  await waitFor(() => expect(result.current.status).toBe('erro'))
  expect(result.current.erro).toEqual({ motivo: 'parametros', detalhe: 'custom rotation: unknown crop 1150' })
  act(() => result.current.recarregar())
  await waitFor(() => expect(result.current.status).toBe('ok'))
})
