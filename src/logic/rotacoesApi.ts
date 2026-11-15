// Da resposta de POST /api/rotations/recommendations para o conjunto de rotações da tela (data/mock.ts).
// A API dá as culturas, as datas de plantio e colheita e o Kc; o perfil local (data/perfis.ts, mock) dá o resto.
import type { BarDef, ConjuntoRotacoes, CTRow, RotacaoDef, SafraDef } from '../data/mock'
import { LEN } from '../data/mock'
import { PERFIS, type PerfilCultura } from '../data/perfis'
import type { Historico, RotationCrop, RotationRecommendations } from '../types'

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

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Kc do catálogo da API; sem perfil hídrico na API, sem Kc (o consumo fica sem dado, nada local no lugar). */
function kcDe(c: RotationCrop): [number, number, number] | null {
  const w = c.crop.water_requirements?.crop_coefficient
  return w ? [w.initial, w.mid_season, w.late_season] : null
}

function safra(c: RotationCrop, n: 0 | 1, ano: number): SafraDef {
  const perfil = PERFIS[c.crop.eco_port_code]
  const kc = kcDe(c)
  const nomeApi = maiuscula(c.crop.common_names[0] ?? c.crop.scientific_name)
  return {
    nome: perfil ? (n === 1 && perfil.nome2 ? perfil.nome2 : perfil.nome) : nomeApi,
    ref: perfil?.id ?? `eco:${c.crop.eco_port_code}`,
    zarc: perfil ? (n === 1 && perfil.zarc2 !== undefined ? perfil.zarc2 : perfil.zarc) : null,
    de: decendioDaData(c.planting_date, ano),
    ate: decendioDaData(c.harvest_date, ano),
    ...(perfil?.cobertura ? { cobertura: true } : {}),
    ...(kc ? { kc } : {}),
    ...estagiosDe(c),
    risco: c.crop.risk,
  }
}

/** Fases (I a IV) pela duração dos estágios FAO-56 e profundidade das raízes, quando o catálogo traz. */
function estagiosDe(c: RotationCrop): Pick<SafraDef, 'fases' | 'raiz'> {
  const w = c.crop.water_requirements
  if (!w) return {}
  const d = w.stage_length_days
  const soma = d.initial + d.development + d.mid_season + d.late_season
  const out: Pick<SafraDef, 'fases' | 'raiz'> = {}
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
    w1: pa?.agua ?? sem, w2: pb?.agua ?? sem,
    soil: pb?.solo.efeito ?? sem, soilWhy: pb?.solo.porque ?? 'Sem dado sobre o efeito no solo',
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
  for (const rot of [...r.rotations].sort((a, b) => a.rank - b.rank)) {
    const [ca, cb] = rot.crops
    const a = safra(ca, 0, ano), b = safra(cb, 1, ano)
    const pa = PERFIS[ca.crop.eco_port_code], pb = PERFIS[cb.crop.eco_port_code]
    const ct = linha(a, b, pa, pb)
    if (atual && pa?.id === atual[0] && pb?.id === atual[1]) ct.atual = true
    const barras: BarDef[] = [
      { s: mesDaData(ca.planting_date, ano), e: mesDaData(ca.harvest_date, ano, true), label: a.nome },
      { s: mesDaData(cb.planting_date, ano), e: mesDaData(cb.harvest_date, ano, true), label: b.nome },
    ]
    const fim = barras[1].e
    if (fim < 12) barras.push({ s: fim, e: 12, label: '' })
    rotacoes.push({
      id: rot.id, safras: [a, b], ct,
      agua: pb?.score.agua ?? 0, solo: pb?.score.solo ?? 0,
      barras, maisPragas: pb?.pragas.nivel === 'Maior risco',
    })
  }
  return { origem: 'api', ano, rotacoes, avisos }
}

/** "Soja depois milho safrinha". */
export const nomeRotacao = (r: RotacaoDef) => `${r.ct.c1} depois ${minuscula(r.ct.c2)}`
