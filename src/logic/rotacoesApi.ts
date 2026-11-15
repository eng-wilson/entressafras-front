// Da resposta de POST /api/rotations/recommendations para o conjunto de rotações da tela (data/mock.ts).
// A API dá as culturas, as datas (calendário regional), o Kc e os estágios, o risco, os scores 0–100, a proteção do
// solo e o solo usado. O perfil local (data/perfis.ts, mock) dá só o que a API ainda não entrega: nome exibido,
// produção e preço, pragas e o score de água.
import type { BarDef, ConjuntoRotacoes, CTRow, RotacaoDef, SafraDef } from '../data/mock'
import { LEN } from '../data/mock'
import { PERFIS, type PerfilCultura } from '../data/perfis'
import { CULTURAS, REFERENCIAS_CULTURAS } from '../data/culturas'
import { faixa } from './aptidao'
import type { Historico, Priorities, Priority, RotationCrop, RotationRecommendations, SoilProtection } from '../types'

const data = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}
/** Meses inteiros desde setembro do ano agrícola (0 = setembro). */
const mesesDesdeSetembro = (iso: string, ano: number) => {
  const { y, m } = data(iso)
  return (y - ano) * 12 + (m - 9)
}

/** Decêndio (0–35) de uma data no ano agrícola que começa em setembro de `ano`; fora do ano, o limite. */
export function decendioDaData(iso: string, ano: number): number {
  const { d } = data(iso)
  const i = mesesDesdeSetembro(iso, ano) * 3 + (d <= 10 ? 0 : d <= 20 ? 1 : 2)
  return Math.min(35, Math.max(0, i))
}

/** Posição da data em meses desde 1º de setembro (0–12), para as barras do calendário. */
export function mesDaData(iso: string, ano: number, fim = false): number {
  const { d } = data(iso)
  const m = mesesDesdeSetembro(iso, ano)
  const len = LEN[((m % 12) + 12) % 12]
  return Math.min(12, Math.max(0, m + (fim ? d : d - 1) / len))
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Kc do catálogo da API; sem perfil hídrico na API, sem Kc (o consumo fica sem dado, nada local no lugar). */
function kcDe(c: RotationCrop): [number, number, number] | null {
  const w = c.crop.water_requirements?.crop_coefficient
  return w ? [w.initial, w.mid_season, w.late_season] : null
}

/** Cultura do catálogo local (nome em português e requisitos) pelo código EcoCrop e pela espécie; null se não houver. */
function doCatalogo(codigo: number, especie: string): string | null {
  const ids = Object.entries(REFERENCIAS_CULTURAS)
    .filter(([, r]) => r.codigo === codigo && r.especie === especie && !r.cultivar)
    .map(([id]) => id)
  return ids[0] ?? null
}

function safra(c: RotationCrop, n: 0 | 1, ano: number): SafraDef {
  const perfil = PERFIS[c.crop.eco_port_code]
  const kc = kcDe(c)
  // Sem perfil local: o nome em português do catálogo local; sem ele, o nome científico (os nomes comuns do EcoCrop
  // vêm em inglês).
  const catalogo = perfil ? null : doCatalogo(c.crop.eco_port_code, c.crop.scientific_name)
  const nomeSem = catalogo ? CULTURAS[catalogo].nome : c.crop.scientific_name
  return {
    nome: perfil ? (n === 1 && perfil.nome2 ? perfil.nome2 : perfil.nome) : nomeSem,
    ref: perfil?.id ?? catalogo ?? `eco:${c.crop.eco_port_code}`,
    zarc: perfil ? (n === 1 && perfil.zarc2 !== undefined ? perfil.zarc2 : perfil.zarc) : null,
    de: decendioDaData(c.planting_date, ano),
    ate: decendioDaData(c.harvest_date, ano),
    ...(perfil?.cobertura ? { cobertura: true } : {}),
    ...(kc ? { kc } : {}),
    ...estagiosDe(c),
    risco: c.crop.risk,
    calendario: c.calendar,
  }
}

/**
 * Histórico do talhão em códigos EcoCrop, do mais antigo ao mais recente (1ª e 2ª safra de cada ano), para o índice
 * de proteção do solo da API. Só as 3 safras mais recentes; "não plantei", "outra" e culturas sem código ficam de fora.
 */
export function historicoEcoCrop(h: Historico | null | undefined): number[] {
  if (!h) return []
  const out: number[] = []
  for (const ano of Object.keys(h).sort().slice(-3)) {
    for (const id of [h[ano].c1, h[ano].c2]) {
      const codigo = id ? REFERENCIAS_CULTURAS[id]?.codigo : undefined
      if (codigo) out.push(codigo)
    }
  }
  return out
}

/** Prioridades da lateral → API. "Economia de água" não tem equivalente na API e não entra no ranking. */
export const prioridadesApi = (pr: Priority): Priorities => ({
  water_security: pr.risco ? 1 : 0, productivity: pr.prod ? 1 : 0, soil_protection: pr.solo ? 1 : 0,
})

/** "Cobertura viva em 208 de 366 dias; a troca de cultura muda de família botânica." */
export function textoProtecaoSolo(p: SoilProtection): string {
  const trocas = !p.transitions ? ''
    : p.transitions === 1 ? `; a troca de cultura ${p.family_changes ? 'muda' : 'não muda'} de família botânica`
      : `; ${p.family_changes} de ${p.transitions} trocas de cultura mudam de família botânica`
  return `Cobertura viva em ${p.living_cover_days} de ${p.season_days} dias${trocas}`
}

/** Fases (I a IV) pela duração dos estágios FAO-56 e profundidade das raízes, quando o catálogo traz. */
function estagiosDe(c: RotationCrop): Pick<SafraDef, 'fases' | 'raiz' | 'ky'> {
  const w = c.crop.water_requirements
  if (!w) return {}
  const d = w.stage_length_days
  const soma = d.initial + d.development + d.mid_season + d.late_season
  const out: Pick<SafraDef, 'fases' | 'raiz' | 'ky'> = {}
  const y = w.yield_response_factor
  if (y) out.ky = [y.initial ?? null, y.development ?? null, y.mid_season ?? null, y.late_season ?? null]
  if (soma > 0 && [d.initial, d.development, d.mid_season, d.late_season].every(x => x >= 0)) {
    out.fases = [d.initial / soma, d.development / soma, d.mid_season / soma, d.late_season / soma]
  }
  const r = w.root_depth_m
  if (r && r.initial > 0 && r.max >= r.initial) out.raiz = { ini: r.initial, max: r.max }
  return out
}

/** Rotação que o agricultor fez na safra mais recente do histórico (ids do catálogo), se houver. */
function ultimaRotacao(h: Historico | null | undefined): [string, string] | null {
  if (!h) return null
  const chave = Object.keys(h).sort().at(-1)
  const r = chave ? h[chave] : null
  return r?.c1 && r?.c2 ? [r.c1, r.c2] : null
}

function linha(a: SafraDef, b: SafraDef, pa: PerfilCultura | undefined, pb: PerfilCultura | undefined): CTRow {
  const sem = 'Sem dado'
  return {
    c1: a.nome, c2: b.nome,
    // A tabela mostra o consumo calculado (Σ Kc × ET0, dados da API); estes textos ficam só para o conjunto local.
    w1: sem, w2: sem,
    soil: sem, soilWhy: 'Sem dado sobre o efeito no solo',
    pest: pb?.pragas.nivel ?? sem, pestWhy: pb?.pragas.porque ?? 'Sem dado sobre pragas para esta sequência.',
    y1: pa?.prod?.y ?? '-', y2: pb?.prod?.y ?? '-',
    u1: pa?.prod?.u, u2: pb?.prod?.u,
    p1l: a.nome, p1: pa?.prod?.p ?? 'Não é vendida',
    p2l: b.nome, p2: pb?.prod?.p ?? 'Não é vendida',
  }
}

/**
 * Converte a resposta da API, na ordem do rank dela (é a ordem da tela).
 */
export function conjuntoDaApi(r: RotationRecommendations, historico?: Historico | null): ConjuntoRotacoes {
  const ano = r.agricultural_year
  const avisos = [...r.warnings]
  const atual = ultimaRotacao(historico)
  const rotacoes: RotacaoDef[] = []
  // Cor pela ordem alfabética dos ids: trocar as prioridades reordena a lista, mas cada rotação mantém a cor.
  const ids = r.rotations.map(x => x.id).sort()
  for (const rot of [...r.rotations].sort((a, b) => a.rank - b.rank)) {
    const [ca, cb] = rot.crops
    const a = safra(ca, 0, ano), b = safra(cb, 1, ano)
    const pa = PERFIS[ca.crop.eco_port_code], pb = PERFIS[cb.crop.eco_port_code]
    const ct = linha(a, b, pa, pb)
    // Saúde do solo vem da API: o índice de proteção planejada (cobertura viva e troca de família).
    ct.soil = faixa(rot.scores.soil_protection).rotulo
    ct.soilWhy = textoProtecaoSolo(rot.soil_protection)
    if (atual && pa?.id === atual[0] && pb?.id === atual[1]) ct.atual = true
    const barras: BarDef[] = [
      { s: mesDaData(ca.planting_date, ano), e: mesDaData(ca.harvest_date, ano, true), label: a.nome },
      { s: mesDaData(cb.planting_date, ano), e: mesDaData(cb.harvest_date, ano, true), label: b.nome },
    ]
    const fim = barras[1].e
    if (fim < 12) barras.push({ s: fim, e: 12, label: '' })
    rotacoes.push({
      id: rot.id, safras: [a, b], ct,
      agua: pb?.score.agua ?? 0, solo: 0,
      barras, maisPragas: pb?.pragas.nivel === 'Maior risco',
      cor: ids.indexOf(rot.id) % 4, scores: rot.scores, protecaoSolo: rot.soil_protection,
    })
  }
  return {
    origem: 'api', ano, rotacoes, avisos,
    solo: r.soil, propriedadesSolo: r.soil_properties ?? null, prioridades: r.priorities,
  }
}

/** "Soja depois milho safrinha". */
export const nomeRotacao = (r: RotacaoDef) => `${r.ct.c1} depois ${minuscula(r.ct.c2)}`
