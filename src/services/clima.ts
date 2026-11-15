// Clima por decêndio da API Entressafras (NASA POWER agregado), com cache em memória e no navegador.
// Diferente de geocoding.ts, aqui o erro é lançado: a tela precisa distinguir "carregando", "sem dado" e
// "falhou, tentar de novo".
import type { ClimaDecendios, Ponto } from '../types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'https://entressafras-backend-production.up.railway.app')
  .replace(/\/+$/, '')

export type MotivoErroClima = 'rede' | 'http' | 'parametros' | 'resposta_invalida'

export class ErroClima extends Error {
  motivo: MotivoErroClima
  status?: number
  constructor(motivo: MotivoErroClima, mensagem: string, status?: number) {
    super(mensagem)
    this.name = 'ErroClima'
    this.motivo = motivo
    this.status = status
  }
}

const ehAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError'

const TOTAL_DECENDIOS = 36

/** Formato mínimo que a tela precisa: 36 decêndios em ordem e os textos de fonte. */
export function climaValido(x: unknown): x is ClimaDecendios {
  const c = x as ClimaDecendios
  return !!c && typeof c === 'object'
    && typeof c.fonte === 'string' && typeof c.aviso_resolucao === 'string'
    && Array.isArray(c.safras)
    && Array.isArray(c.decendios) && c.decendios.length === TOTAL_DECENDIOS
    && c.decendios.every((d, i) => !!d && d.idx === i)
}

async function mensagem422(r: Response): Promise<string | null> {
  try {
    const { detail } = (await r.json()) as { detail?: { msg?: string }[] }
    return detail?.[0]?.msg ?? null
  } catch {
    return null
  }
}

/** Climatologia por decêndio para um ponto. Lança ErroClima; se cancelado, repassa o AbortError. */
export async function climaDecendios(p: Ponto, signal?: AbortSignal): Promise<ClimaDecendios> {
  const q = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon) })
  let r: Response
  try {
    r = await fetch(`${API_URL}/api/clima/decendios?${q}`, { signal })
  } catch (e) {
    if (ehAbort(e)) throw e
    throw new ErroClima('rede', 'Sem conexão com o serviço de clima')
  }
  if (r.status === 422) throw new ErroClima('parametros', (await mensagem422(r)) ?? 'Coordenadas inválidas', 422)
  if (!r.ok) throw new ErroClima('http', `O serviço de clima respondeu ${r.status}`, r.status)
  let corpo: unknown
  try {
    corpo = await r.json()
  } catch {
    throw new ErroClima('resposta_invalida', 'A resposta do serviço de clima não é JSON')
  }
  if (!climaValido(corpo)) throw new ErroClima('resposta_invalida', 'A resposta do serviço de clima está fora do formato esperado')
  return corpo
}

// ---------- Cache ----------
// Climatologia de ~10 safras muda raramente: vale guardar por uma semana. Chave por ponto arredondado a
// ~1 km; talhões vizinhos caem na mesma célula de ~50 km da NASA POWER, então o acerto é frequente.

export const CHAVE_CACHE = 'entressafras.clima.decendios.v1'
export const TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRADAS = 20

type Entrada = { em: number; dados: ClimaDecendios }
type Tabela = Record<string, Entrada>

const memoria = new Map<string, Entrada>()

export const chaveClima = (p: Ponto) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`

function lerTabela(): Tabela {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE)
    if (!bruto) return {}
    const t = JSON.parse(bruto) as unknown
    return t && typeof t === 'object' && !Array.isArray(t) ? (t as Tabela) : {}
  } catch {
    return {}
  }
}

function gravarTabela(t: Tabela): void {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(t))
  } catch {
    // Armazenamento indisponível (aba privada, cota): o cache em memória segue valendo.
  }
}

const vigente = (e: Entrada | undefined, agora: number): e is Entrada =>
  !!e && typeof e.em === 'number' && agora - e.em < TTL_MS

/** Dados em cache para a chave, ou null se não há ou expirou. */
export function lerCache(chave: string, agora = Date.now()): ClimaDecendios | null {
  const m = memoria.get(chave)
  if (vigente(m, agora)) return m.dados
  const e = lerTabela()[chave]
  if (!vigente(e, agora) || !climaValido(e.dados)) return null
  memoria.set(chave, e)
  return e.dados
}

/** Guarda na memória e no navegador, mantendo só as entradas mais recentes. */
export function gravarCache(chave: string, dados: ClimaDecendios, agora = Date.now()): void {
  const entrada: Entrada = { em: agora, dados }
  memoria.set(chave, entrada)
  if (memoria.size > MAX_ENTRADAS) {
    const antigas = [...memoria.entries()].sort((a, b) => a[1].em - b[1].em)
    for (const [k] of antigas.slice(0, memoria.size - MAX_ENTRADAS)) memoria.delete(k)
  }
  const t = lerTabela()
  t[chave] = entrada
  const recentes = Object.keys(t)
    .sort((a, b) => (t[b]?.em ?? 0) - (t[a]?.em ?? 0))
    .slice(0, MAX_ENTRADAS)
  gravarTabela(Object.fromEntries(recentes.map(k => [k, t[k]])))
}

export function apagarCache(chave: string): void {
  memoria.delete(chave)
  const t = lerTabela()
  if (chave in t) {
    delete t[chave]
    gravarTabela(t)
  }
}

/** Só para testes. */
export function limparMemoria(): void {
  memoria.clear()
}
