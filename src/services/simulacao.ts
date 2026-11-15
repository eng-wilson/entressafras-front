// Simulação da rotação do agricultor pela API Entressafras (POST /api/rotations/simulate). Mesmo padrão de
// rotacoes.ts: o erro é lançado e a tela distingue "simulando", "falhou, tentar de novo" e "ok". Cache só em
// memória: cada arrasto gera um pedido novo, e a resposta vale para o ponto, o solo e o ano do pedido.
import type { CustomCropInput, Ponto, Priorities, RotationSimulationResponse, SoilType } from '../types'
import { API_URL } from './clima'
import { ErroRotacoes, culturaValida } from './rotacoes'

const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const numOuNulo = (v: unknown) => v === null || finito(v)
const DATA = /^\d{4}-\d{2}-\d{2}$/
const data = (v: unknown): v is string => typeof v === 'string' && DATA.test(v)

function scoresValidos(s: unknown) {
  return objeto(s) && numOuNulo(s.productivity) && numOuNulo(s.water_security) && finito(s.soil_protection)
    && numOuNulo(s.overall)
}

function sweepValido(s: unknown, n: number) {
  if (s === null) return true
  if (!objeto(s) || (s.moved_crop !== 'first' && s.moved_crop !== 'second') || !Array.isArray(s.points)) return false
  if (!numOuNulo(s.best_decendio_idx) || !numOuNulo(s.worst_decendio_idx)) return false
  return s.points.every(p => objeto(p) && Number.isInteger(p.decendio_idx) && scoresValidos(p.scores)
    && Array.isArray(p.crops) && p.crops.length === n
    && p.crops.every(c => objeto(c) && Number.isInteger(c.code) && data(c.planting_date) && data(c.harvest_date)
      && numOuNulo(c.risk_percentage) && typeof c.in_calendar === 'boolean' && typeof c.temperature_ok === 'boolean'))
}

/**
 * Formato mínimo que o rascunho precisa: 1 ou 2 culturas com datas em ordem, rank, checks e as faixas do sweep. Com 1
 * cultura (seguida de pousio) não há sweep da 2ª.
 */
export function simulacaoValida(x: unknown): x is RotationSimulationResponse {
  if (!objeto(x) || !Number.isInteger(x.agricultural_year) || !Array.isArray(x.warnings)) return false
  const r = x.rotation
  if (!objeto(r) || typeof r.id !== 'string' || !Number.isInteger(r.rank) || !Number.isInteger(r.ranked_among)) return false
  if (typeof r.would_be_recommended !== 'boolean' || !Array.isArray(r.checks) || !r.checks.every(c => typeof c === 'string')) return false
  if (!scoresValidos(r.scores) || !objeto(r.soil_protection) || !finito(r.soil_protection.living_cover_days)
    || !finito(r.soil_protection.season_days)) return false
  if (!Array.isArray(r.crops) || r.crops.length < 1 || r.crops.length > 2) return false
  const cropsOk = r.crops.every(c => objeto(c) && culturaValida(c.crop) && data(c.planting_date) && data(c.harvest_date)
    && c.planting_date < c.harvest_date && objeto(c.calendar) && Number.isInteger(c.calendar.cycle_days))
  if (!cropsOk) return false
  const n = r.crops.length
  if (n === 1 && (x.second_planting_sweep ?? null) !== null) return false
  return sweepValido(x.first_planting_sweep ?? null, n) && sweepValido(x.second_planting_sweep ?? null, n)
}

/** Mensagem de um 422: o backend manda `detail` como texto (rotação impossível) ou a lista do pydantic. */
export function detalhe422(corpo: unknown): string {
  if (!objeto(corpo)) return ''
  const d = corpo.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(e => (objeto(e) && typeof e.msg === 'string' ? e.msg : '')).filter(Boolean).join('; ')
  return ''
}

export type PedidoSimulacao = {
  ponto: Ponto
  /** Textura informada; null = a API estima o solo pelo local, como na recomendação. */
  solo: SoilType | null
  ano: number
  /** As mesmas prioridades e histórico da recomendação, para o rank do rascunho ser comparável ao da lista. */
  prioridades?: Priorities
  historico?: number[]
  culturas: CustomCropInput[]
  sweep: boolean
}

export const corpoSimulacao = (p: PedidoSimulacao) => ({
  ...(p.solo ? { soil_type: p.solo } : {}),
  location: { lat: p.ponto.lat, lon: p.ponto.lon },
  agricultural_year: p.ano,
  ...(p.prioridades ? { priorities: p.prioridades } : {}),
  ...(p.historico?.length ? { crop_history: p.historico } : {}),
  rotation: { crops: p.culturas.map(c => ({ code: c.code, ...(c.planting_date ? { planting_date: c.planting_date } : {}), ...(c.harvest_date ? { harvest_date: c.harvest_date } : {}) })) },
  sweep: p.sweep,
})

// DOMException nem sempre é instância de Error (jsdom): basta o nome.
const ehAbort = (e: unknown) => !!e && typeof e === 'object' && (e as { name?: unknown }).name === 'AbortError'

// ---------- Cache em memória ----------
const MAX_ENTRADAS = 50
const memoria = new Map<string, RotationSimulationResponse>()
export const chaveSimulacao = (p: PedidoSimulacao) => JSON.stringify(corpoSimulacao(p))
function lembrar(chave: string, dados: RotationSimulationResponse) {
  memoria.delete(chave)
  memoria.set(chave, dados)
  if (memoria.size > MAX_ENTRADAS) memoria.delete(memoria.keys().next().value!)
}
/** Resposta já recebida para este pedido. Um pedido sem sweep também aproveita a resposta com sweep. */
export function lerSimulacao(p: PedidoSimulacao): RotationSimulationResponse | null {
  return memoria.get(chaveSimulacao(p)) ?? (p.sweep ? null : memoria.get(chaveSimulacao({ ...p, sweep: true })) ?? null)
}
/** Só para testes. */
export function limparMemoriaSimulacao() { memoria.clear() }

/**
 * Simula a rotação de 2 culturas. Lança ErroRotacoes: no 422, `message` traz o `detail` do backend (em inglês),
 * para a tela traduzir (logic/rascunho.ts, mensagemErro). Se cancelado, repassa o AbortError.
 */
export async function simularRotacao(p: PedidoSimulacao, signal?: AbortSignal): Promise<RotationSimulationResponse> {
  const chave = chaveSimulacao(p)
  const guardada = lerSimulacao(p)
  if (guardada) return guardada
  let r: Response
  try {
    r = await fetch(`${API_URL}/api/rotations/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: chave,
      signal,
    })
  } catch (e) {
    if (ehAbort(e)) throw e
    throw new ErroRotacoes('rede', 'Sem conexão com o serviço de rotações')
  }
  if (r.status === 422) {
    let corpo: unknown = null
    try { corpo = await r.json() } catch { /* corpo vazio: só o status */ }
    throw new ErroRotacoes('parametros', detalhe422(corpo), 422)
  }
  if (!r.ok) throw new ErroRotacoes('http', `O serviço de rotações respondeu ${r.status}`, r.status)
  let dados: unknown
  try {
    dados = await r.json()
  } catch {
    throw new ErroRotacoes('resposta_invalida', 'A resposta da simulação não é JSON')
  }
  if (!simulacaoValida(dados)) throw new ErroRotacoes('resposta_invalida', 'A resposta da simulação está fora do formato esperado')
  lembrar(chave, dados)
  return dados
}
