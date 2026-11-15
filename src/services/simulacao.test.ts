import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIMULACAO_FIXTURE } from '../data/simulacaoFixture'
import { ErroRotacoes } from './rotacoes'
import { detalhe422, limparMemoriaSimulacao, lerSimulacao, simulacaoValida, simularRotacao, type PedidoSimulacao } from './simulacao'

const pedido: PedidoSimulacao = {
  ponto: { lat: -12.55, lon: -55.72 }, solo: 'medium', ano: 2027, sweep: true,
  culturas: [{ code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' }, { code: 48747 }],
}
const resposta = (corpo: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
  limparMemoriaSimulacao()
})

describe('simularRotacao', () => {
  it('envia o pedido por POST, omite as datas livres e valida a resposta', async () => {
    const f = resposta(SIMULACAO_FIXTURE)
    vi.stubGlobal('fetch', f)
    const r = await simularRotacao(pedido)
    expect(r.rotation.rank).toBe(1)
    const [url, init] = f.mock.calls[0]
    expect(url).toMatch(/\/api\/rotations\/simulate$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      soil_type: 'medium', location: { lat: -12.55, lon: -55.72 }, agricultural_year: 2027, sweep: true,
      rotation: { crops: [{ code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' }, { code: 48747 }] },
    })
  })

  it('guarda em memória; o pedido sem sweep aproveita a resposta com sweep', async () => {
    const f = resposta(SIMULACAO_FIXTURE)
    vi.stubGlobal('fetch', f)
    await simularRotacao(pedido)
    await simularRotacao({ ...pedido, sweep: false })
    expect(f).toHaveBeenCalledTimes(1)
    expect(lerSimulacao({ ...pedido, sweep: false })).not.toBeNull()
  })

  it('distingue rede, 422 (com o detail), HTTP e formato inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(simularRotacao(pedido)).rejects.toMatchObject({ motivo: 'rede' })
    vi.stubGlobal('fetch', resposta({ detail: 'custom rotation: unknown crop 1' }, 422))
    await expect(simularRotacao(pedido)).rejects.toMatchObject({ motivo: 'parametros', message: 'custom rotation: unknown crop 1' })
    vi.stubGlobal('fetch', resposta({}, 503))
    await expect(simularRotacao(pedido)).rejects.toMatchObject({ motivo: 'http', status: 503 })
    vi.stubGlobal('fetch', resposta({ rotation: {} }))
    await expect(simularRotacao(pedido)).rejects.toBeInstanceOf(ErroRotacoes)
  })

  it('repassa o cancelamento', async () => {
    const abort = new DOMException('cancelado', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(simularRotacao(pedido)).rejects.toBe(abort)
  })
})

describe('validação', () => {
  it('aceita a resposta real e recusa culturas fora de ordem', () => {
    expect(simulacaoValida(SIMULACAO_FIXTURE)).toBe(true)
    expect(simulacaoValida({ ...SIMULACAO_FIXTURE, first_planting_sweep: null, second_planting_sweep: null })).toBe(true)
    const ruim = structuredClone(SIMULACAO_FIXTURE)
    ruim.rotation.crops[0].harvest_date = '2027-01-01'
    expect(simulacaoValida(ruim)).toBe(false)
  })
  it('lê o detail em texto ou na lista do pydantic', () => {
    expect(detalhe422({ detail: 'x' })).toBe('x')
    expect(detalhe422({ detail: [{ msg: 'a' }, { msg: 'b' }] })).toBe('a; b')
    expect(detalhe422(null)).toBe('')
  })
})
