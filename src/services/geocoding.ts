// Busca de lugares e nome da cidade pelo OpenStreetMap Nominatim (sem chave).
// Política de uso: no máximo 1 requisição por segundo; aqui só há chamadas pontuais do usuário.
import type { Ponto } from '../types'

const BASE = 'https://nominatim.openstreetmap.org'

const UF: Record<string, string> = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', Pará: 'PA', Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondônia: 'RO', Roraima: 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
}

/** Primeiro lugar no Brasil que casa com o texto; null se nada ou se falhar. */
export async function buscar(q: string): Promise<Ponto | null> {
  try {
    const r = await fetch(`${BASE}/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`)
    if (!r.ok) return null
    const [lugar] = (await r.json()) as { lat: string; lon: string }[]
    return lugar ? { lat: Number(lugar.lat), lon: Number(lugar.lon) } : null
  } catch {
    return null
  }
}

type Endereco = { city?: string; town?: string; village?: string; municipality?: string; state?: string; 'ISO3166-2-lvl4'?: string }

/** "Cidade, UF" para um ponto; null se falhar. */
export async function reverso(p: Ponto): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/reverse?format=json&zoom=10&accept-language=pt-BR&lat=${p.lat}&lon=${p.lon}`)
    if (!r.ok) return null
    const { address: a } = (await r.json()) as { address?: Endereco }
    if (!a) return null
    const cidade = a.city ?? a.town ?? a.municipality ?? a.village
    const uf = a['ISO3166-2-lvl4']?.replace(/^BR-/, '') ?? (a.state ? UF[a.state] ?? a.state : undefined)
    if (!cidade) return uf ?? null
    return uf ? `${cidade}, ${uf}` : cidade
  } catch {
    return null
  }
}
