// Rotações recomendadas pela API Entressafras (POST /api/rotations/recommendations), com cache em memória e no
// navegador. Como em clima.ts, o erro é lançado: a tela distingue "carregando", "falhou, tentar de novo" e "ok".
// O backend avisa em `warnings` que o ranking e o risco ainda são MOCK; o contrato é final.
import type { Ponto, Priorities, RotationRecommendations, SoilType, Textura } from '../types'
import { API_URL } from './clima'

export type MotivoErroRotacoes = 'rede' | 'http' | 'parametros' | 'resposta_invalida'

export class ErroRotacoes extends Error {
  motivo: MotivoErroRotacoes
  status?: number
  constructor(motivo: MotivoErroRotacoes, mensagem: string, status?: number) {
    super(mensagem)
    this.name = 'ErroRotacoes'
    this.motivo = motivo
    this.status = status
  }
}

/** Textura do cadastro → tipo de solo da API. Sem textura informada, null: a API estima o solo pelo local (SoilGrids). */
export const SOLO_API: Record<Textura, SoilType> = { arenoso: 'sandy', medio: 'medium', argiloso: 'clayey' }
export const soloDaTextura = (t: Textura | null): SoilType | null => (t ? SOLO_API[t] : null)

const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const numOuNulo = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const DATA = /^\d{4}-\d{2}-\d{2}$/
const SOLOS = ['sandy', 'medium', 'clayey']
const ESTAGIOS = ['initial', 'development', 'mid_season', 'late_season']

function kcValido(w: unknown): boolean {
  if (w === null) return true
  if (!objeto(w) || !objeto(w.crop_coefficient) || !objeto(w.stage_length_days)) return false
  const kc = w.crop_coefficient
  return ['initial', 'mid_season', 'late_season'].every(k => finito(kc[k]) && (kc[k] as number) > 0)
    && finito(w.stage_length_days.total)
}

function culturaValida(c: unknown): boolean {
  if (!objeto(c) || !Number.isInteger(c.eco_port_code) || typeof c.scientific_name !== 'string') return false
  if (!Array.isArray(c.common_names) || !kcValido(c.water_requirements ?? null)) return false
  const r = c.risk
  return objeto(r) && numOuNulo(r.risk_percentage) && numOuNulo(r.estimated_yield_loss_pct) && finito(r.loss_threshold_pct)
    && (r.critical_stage === null || ESTAGIOS.includes(r.critical_stage as string))
    && objeto(r.mean_isna) && ESTAGIOS.every(k => numOuNulo((r.mean_isna as Record<string, unknown>)[k]))
    && Number.isInteger(r.valid_years) && typeof r.method === 'string'
}

const escala = (v: unknown) => v === null || (finito(v) && v >= 0 && v <= 100)
function rotacaoValida(r: unknown): boolean {
  if (!objeto(r) || typeof r.id !== 'string' || !Number.isInteger(r.rank) || !Array.isArray(r.crops) || r.crops.length !== 2) return false
  const sc = r.scores, sp = r.soil_protection
  return objeto(sc) && escala(sc.productivity) && escala(sc.water_security) && finito(sc.soil_protection) && escala(sc.overall)
    && objeto(sp) && finito(sp.score) && Number.isInteger(sp.living_cover_days) && Number.isInteger(sp.season_days)
    && finito(sp.cover_fraction) && finito(sp.family_change_fraction) && Array.isArray(sp.botanical_families)
    && r.crops.every(c => objeto(c) && culturaValida(c.crop)
      && typeof c.planting_date === 'string' && DATA.test(c.planting_date)
      && typeof c.harvest_date === 'string' && DATA.test(c.harvest_date)
      && c.planting_date < c.harvest_date
      && objeto(c.calendar) && typeof c.calendar.source === 'string' && Number.isInteger(c.calendar.cycle_days))
    && (r.crops[0] as { harvest_date: string }).harvest_date < (r.crops[1] as { planting_date: string }).planting_date
}

/** Formato mínimo que a tela precisa: solo, prioridades e até 4 rotações de 2 culturas com scores e datas em ordem. */
export function rotacoesValidas(x: unknown): x is RotationRecommendations {
  if (!objeto(x) || !Number.isInteger(x.agricultural_year) || !Array.isArray(x.rotations) || !Array.isArray(x.warnings)) return false
  if (!objeto(x.assumptions) || !x.warnings.every(w => typeof w === 'string')) return false
  if (!objeto(x.soil) || !SOLOS.includes(x.soil.texture_class as string) || !finito(x.soil.available_water_mm_per_m)) return false
  if (!objeto(x.priorities)) return false
  if (x.rotations.length < 1 || x.rotations.length > 4) return false
  return x.rotations.every(rotacaoValida)
}

const ehAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError'

/**
 * O que a tela envia: o ponto, a textura só quando o agricultor a informou (senão a API estima), o histórico em
 * códigos EcoCrop (mais antigo primeiro) e as prioridades da lateral.
 */
export type PedidoRotacoes = { ponto: Ponto; solo: SoilType | null; historico: number[]; prioridades: Priorities; ano?: number }

/** Rotações recomendadas para o ponto e o solo. Lança ErroRotacoes; se cancelado, repassa o AbortError. */
export async function recomendarRotacoes(p: PedidoRotacoes, signal?: AbortSignal): Promise<RotationRecommendations> {
  const corpo = {
    location: { lat: p.ponto.lat, lon: p.ponto.lon },
    ...(p.solo ? { soil_type: p.solo } : {}),
    ...(p.historico.length ? { crop_history: p.historico } : {}),
    priorities: p.prioridades,
    ...(p.ano ? { agricultural_year: p.ano } : {}),
  }
  let r: Response
  try {
    r = await fetch(`${API_URL}/api/rotations/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal,
    })
  } catch (e) {
    if (ehAbort(e)) throw e
    throw new ErroRotacoes('rede', 'Sem conexão com o serviço de rotações')
  }
  if (r.status === 422) throw new ErroRotacoes('parametros', 'Local ou solo inválido para recomendar rotações', 422)
  if (!r.ok) throw new ErroRotacoes('http', `O serviço de rotações respondeu ${r.status}`, r.status)
  let dados: unknown
  try {
    dados = await r.json()
  } catch {
    throw new ErroRotacoes('resposta_invalida', 'A resposta do serviço de rotações não é JSON')
  }
  if (!rotacoesValidas(dados)) throw new ErroRotacoes('resposta_invalida', 'A resposta do serviço de rotações está fora do formato esperado')
  return dados
}

// ---------- Cache ----------
// O "ano que vem" muda e o backend ainda evolui: um dia basta. Chave: ponto, solo, histórico e prioridades.
// v2: formato com scores, proteção do solo, solo do SoilGrids e calendário.
export const CHAVE_CACHE_ROTACOES = 'entressafras.rotacoes.v2'
export const TTL_ROTACOES = 24 * 60 * 60 * 1000
const MAX_ENTRADAS = 20

type Entrada = { em: number; dados: RotationRecommendations }
const memoria = new Map<string, Entrada>()

const bits = (q: Priorities) => `${q.water_security}${q.productivity}${q.soil_protection}`
export const chaveRotacoes = (p: PedidoRotacoes) =>
  `${p.ponto.lat.toFixed(2)},${p.ponto.lon.toFixed(2)},${p.solo ?? 'auto'},${p.historico.join('-')},${bits(p.prioridades)},${p.ano ?? ''}`

function tabela(): Record<string, Entrada> {
  try {
    const t: unknown = JSON.parse(localStorage.getItem(CHAVE_CACHE_ROTACOES) ?? '{}')
    return objeto(t) ? (t as Record<string, Entrada>) : {}
  } catch {
    return {}
  }
}
function salvar(t: Record<string, Entrada>) {
  try { localStorage.setItem(CHAVE_CACHE_ROTACOES, JSON.stringify(t)) } catch { /* Cache em memória preservado. */ }
}
const vigente = (e: Entrada | undefined, agora: number): e is Entrada =>
  !!e && finito(e.em) && agora >= e.em && agora - e.em < TTL_ROTACOES

export function lerRotacoes(chave: string, agora = Date.now()): RotationRecommendations | null {
  const m = memoria.get(chave)
  if (vigente(m, agora)) return m.dados
  const e = tabela()[chave]
  if (!vigente(e, agora) || !rotacoesValidas(e.dados)) return null
  memoria.set(chave, e)
  return e.dados
}

export function guardarRotacoes(chave: string, dados: RotationRecommendations, agora = Date.now()) {
  const entrada = { em: agora, dados }
  memoria.set(chave, entrada)
  const t = { ...tabela(), [chave]: entrada }
  salvar(Object.fromEntries(Object.entries(t).filter(([, e]) => vigente(e, agora))
    .sort((a, b) => b[1].em - a[1].em).slice(0, MAX_ENTRADAS)))
}

export function apagarRotacoes(chave: string) {
  memoria.delete(chave)
  const t = tabela()
  if (chave in t) { delete t[chave]; salvar(t) }
}

/** Só para testes. */
export function limparMemoriaRotacoes() { memoria.clear() }
