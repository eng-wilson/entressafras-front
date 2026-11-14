import type { CropDetail, CropPage } from '../types'
import { API_URL } from './clima'

const FAIXA = ['optimal_min', 'optimal_max', 'absolute_min', 'absolute_max']
const SOLOS = ['depth', 'texture', 'fertility', 'al_toxicity', 'salinity', 'drainage']
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
const numero = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const textos = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'string')
function faixa(v: unknown) {
  return objeto(v) && FAIXA.every(k => numero(v[k]))
    && (v.optimal_min == null || v.optimal_max == null || Number(v.optimal_min) <= Number(v.optimal_max))
    && (v.absolute_min == null || v.absolute_max == null || Number(v.absolute_min) <= Number(v.absolute_max))
    && (v.absolute_min == null || v.optimal_min == null || Number(v.absolute_min) <= Number(v.optimal_min))
    && (v.absolute_max == null || v.optimal_max == null || Number(v.optimal_max) <= Number(v.absolute_max))
}
export function culturaValida(v: unknown): v is CropDetail {
  if (!objeto(v) || !objeto(v.temperature) || !objeto(v.crop_cycle) || !objeto(v.soil)) return false
  const solo = v.soil
  return Number.isInteger(v.eco_port_code) && typeof v.scientific_name === 'string'
    && faixa(v.temperature) && numero(v.temperature.killing_rest) && numero(v.temperature.killing_early_growth)
    && faixa(v.rainfall) && faixa(v.soil_ph)
    && numero(v.crop_cycle.min_days) && numero(v.crop_cycle.max_days)
    && SOLOS.every(k => objeto(solo[k]) && textos(solo[k].optimal) && textos(solo[k].absolute))
}
async function consultar(caminho: string, signal?: AbortSignal): Promise<unknown> {
  const resposta = await fetch(`${API_URL}${caminho}`, { signal })
  if (!resposta.ok) throw new Error(`Catálogo indisponível (${resposta.status})`)
  return resposta.json()
}
export async function buscarCulturas(q: string, signal?: AbortSignal): Promise<CropPage> {
  const v = await consultar(`/api/crops?${new URLSearchParams({ q, limit: '100' })}`, signal)
  if (!objeto(v) || !Number.isInteger(v.total) || !Number.isInteger(v.limit) || !Number.isInteger(v.offset)
    || !Array.isArray(v.items) || !v.items.every(c => objeto(c) && Number.isInteger(c.eco_port_code)
      && typeof c.scientific_name === 'string' && textos(c.common_names) && textos(c.category) && textos(c.life_span))) {
    throw new Error('Resposta inválida do catálogo')
  }
  return v as CropPage
}
export async function detalheCultura(codigo: number, signal?: AbortSignal): Promise<CropDetail> {
  const v = await consultar(`/api/crops/${codigo}`, signal)
  if (!culturaValida(v) || v.eco_port_code !== codigo) throw new Error('Referência de cultura inválida')
  return v
}

export const CHAVE_CACHE_CULTURAS = 'entressafras.culturas.v1'
export const TTL_CULTURAS = 7 * 24 * 3600 * 1000
type Entrada = { em: number; dados: CropDetail }
const memoria = new Map<number, Entrada>()
function tabela(): Record<string, Entrada> {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CHAVE_CACHE_CULTURAS) ?? '{}')
    if (!objeto(valor) || Array.isArray(valor)) return {}
    return Object.fromEntries(Object.entries(valor).filter(([, e]) => objeto(e) && Number.isFinite(e.em) && culturaValida(e.dados))) as Record<string, Entrada>
  } catch { return {} }
}
function salvar(t: Record<string, Entrada>) {
  try { localStorage.setItem(CHAVE_CACHE_CULTURAS, JSON.stringify(t)) } catch { /* Cache em memória preservado. */ }
}
export function lerCultura(codigo: number, agora = Date.now()): CropDetail | null {
  const e = memoria.get(codigo) ?? tabela()[codigo]
  return e && agora >= e.em && agora - e.em < TTL_CULTURAS && e.dados.eco_port_code === codigo ? e.dados : null
}
export function guardarCultura(dados: CropDetail, agora = Date.now()) {
  memoria.set(dados.eco_port_code, { em: agora, dados })
  const recentes = [...memoria.entries()].sort((a, b) => b[1].em - a[1].em)
  for (const [k] of recentes.slice(20)) memoria.delete(k)
  const t: Record<string, Entrada> = { ...tabela(), [dados.eco_port_code]: { em: agora, dados } }
  salvar(Object.fromEntries(Object.entries(t).filter(([, e]) => agora >= e.em && agora - e.em < TTL_CULTURAS)
    .sort((a, b) => b[1].em - a[1].em).slice(0, 20)))
}
export function apagarCultura(codigo: number) {
  memoria.delete(codigo)
  const t = tabela(); delete t[codigo]; salvar(t)
}
export function limparMemoriaCulturas() { memoria.clear() }
