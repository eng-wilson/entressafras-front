// Cenários de clima futuro da API Entressafras (GET /api/clima/scenarios): os 30 anos observados ajustados por
// deltas de projeção (+temperatura, −chuva, atraso do início das chuvas). A lista vem pronta da API, na ordem de
// exibição (historical sempre primeiro); o front não fixa nenhum delta. Cache em memória e no navegador (1 dia).
import type { ClimateScenarioInfo } from '../types'
import { API_URL, ErroClima } from './clima'

/** Clima atual (30 safras observadas): o padrão da API; com ele, os pedidos não levam climate_scenario. */
export const CENARIO_PADRAO = 'historical'

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export function cenarioValido(c: unknown): c is ClimateScenarioInfo {
  return objeto(c) && typeof c.id === 'string' && !!c.id && typeof c.label === 'string'
    && finito(c.delta_temp_c) && finito(c.rain_change_pct) && finito(c.onset_delay_days)
    && typeof c.description === 'string' && typeof c.source === 'string'
}

export const cenariosValidos = (x: unknown): x is ClimateScenarioInfo[] =>
  Array.isArray(x) && x.length > 0 && x.every(cenarioValido)

const ehAbort = (e: unknown) => !!e && typeof e === 'object' && (e as { name?: unknown }).name === 'AbortError'

export async function listarCenarios(signal?: AbortSignal): Promise<ClimateScenarioInfo[]> {
  let r: Response
  try {
    r = await fetch(`${API_URL}/api/clima/scenarios`, { signal })
  } catch (e) {
    if (ehAbort(e)) throw e
    throw new ErroClima('rede', 'Sem conexão com o serviço de clima')
  }
  if (!r.ok) throw new ErroClima('http', `O serviço de clima respondeu ${r.status}`, r.status)
  let corpo: unknown
  try {
    corpo = await r.json()
  } catch {
    throw new ErroClima('resposta_invalida', 'A lista de cenários não é JSON')
  }
  if (!cenariosValidos(corpo)) throw new ErroClima('resposta_invalida', 'A lista de cenários está fora do formato esperado')
  return corpo
}

// ---------- Cache ----------
export const CHAVE_CACHE_CENARIOS = 'entressafras.clima.cenarios.v1'
export const TTL_CENARIOS = 24 * 60 * 60 * 1000

type Entrada = { em: number; dados: ClimateScenarioInfo[] }
let memoria: Entrada | null = null

const vigente = (e: Entrada | null | undefined, agora: number): e is Entrada =>
  !!e && finito(e.em) && agora >= e.em && agora - e.em < TTL_CENARIOS

export function lerCenarios(agora = Date.now()): ClimateScenarioInfo[] | null {
  if (vigente(memoria, agora)) return memoria.dados
  try {
    const e = JSON.parse(localStorage.getItem(CHAVE_CACHE_CENARIOS) ?? 'null') as Entrada | null
    if (!vigente(e, agora) || !cenariosValidos(e.dados)) return null
    memoria = e
    return e.dados
  } catch {
    return null
  }
}

export function guardarCenarios(dados: ClimateScenarioInfo[], agora = Date.now()) {
  memoria = { em: agora, dados }
  try { localStorage.setItem(CHAVE_CACHE_CENARIOS, JSON.stringify(memoria)) } catch { /* Cache em memória preservado. */ }
}

/** Só para testes. */
export function limparMemoriaCenarios() { memoria = null }
