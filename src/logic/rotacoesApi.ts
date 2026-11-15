// Da resposta de POST /api/rotations/recommendations para o conjunto de rotações da tela (data/mock.ts).
// A API dá as culturas, as datas (calendário regional), o Kc e os estágios, o risco, os scores 0–100, a proteção do
// solo e o solo usado. O perfil local (data/perfis.ts, mock) dá só o que a API ainda não entrega: nome exibido,
// produção e preço, pragas e o score de água.
import type { BarDef, ConjuntoRotacoes, CTRow, RotacaoDef, SafraDef } from '../data/mock'
import { LEN } from '../data/mock'
import { PERFIS, type PerfilCultura } from '../data/perfis'
import { CULTURAS, REFERENCIAS_CULTURAS } from '../data/culturas'
import { NOMES_PT } from '../data/nomesCulturas'
import { COR_ROT, faixa } from './aptidao'
import { t } from '../i18n'
import type { CustomCropInput, Historico, Priorities, Priority, RevenueFields, Rotation, RotationCrop, RotationRecommendations, SoilProtection } from '../types'

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
  // Sem perfil local: o nome em português do catálogo local, depois o de NOMES_PT; sem eles, o nome científico (os
  // nomes comuns do EcoCrop vêm em inglês).
  const catalogo = perfil ? null : doCatalogo(c.crop.eco_port_code, c.crop.scientific_name)
  const nomeSem = catalogo ? CULTURAS[catalogo].nome : NOMES_PT[c.crop.eco_port_code] ?? c.crop.scientific_name
  return {
    nome: perfil ? (n === 1 && perfil.nome2 ? perfil.nome2 : perfil.nome) : nomeSem,
    ref: perfil?.id ?? catalogo ?? `eco:${c.crop.eco_port_code}`,
    de: decendioDaData(c.planting_date, ano),
    ate: decendioDaData(c.harvest_date, ano),
    ...(perfil?.cobertura ? { cobertura: true } : {}),
    ...(kc ? { kc } : {}),
    ...estagiosDe(c),
    risco: c.crop.risk,
    calendario: c.calendar,
    api: c,
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

/**
 * Prioridades da lateral → API. Sempre as quatro chaves: a API completa as ausentes com o padrão {1, 1, 1, 0} e
 * ignora as desconhecidas, então um envio parcial ligaria o que o agricultor desligou.
 */
export const prioridadesApi = (pr: Priority): Priorities => ({
  water_security: pr.risco ? 1 : 0, productivity: pr.prod ? 1 : 0, soil_protection: pr.solo ? 1 : 0, revenue: pr.fat ? 1 : 0,
})

/** "Cobertura viva em 208 de 366 dias; a troca de cultura muda de família botânica." */
export function textoProtecaoSolo(p: SoilProtection): string {
  const trocas = !p.transitions ? ''
    : p.transitions === 1
      ? (p.family_changes ? t('; a troca de cultura muda de família botânica') : t('; a troca de cultura não muda de família botânica'))
      : t('; {n} de {total} trocas de cultura mudam de família botânica', { n: p.family_changes, total: p.transitions })
  return t('Cobertura viva em {vivos} de {dias} dias{trocas}', { vivos: p.living_cover_days, dias: p.season_days, trocas })
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

/**
 * A rotação atual do talhão (safra mais recente do histórico) para custom_rotations: as duas culturas em código
 * EcoCrop, sem datas (a API usa o calendário regional). null se faltar uma das duas ou se não houver código.
 */
export function rotacaoAtualEcoCrop(h: Historico | null | undefined): CustomCropInput[] | null {
  const r = ultimaRotacao(h)
  const codigos = r?.map(id => REFERENCIAS_CULTURAS[id]?.codigo)
  return codigos && codigos.every((c): c is number => c != null) ? codigos.map(code => ({ code })) : null
}

/** Faturamento de referência da rotação em US$/ha (médias nacionais FAOSTAT, sem custos): bruto e com o desconto hídrico. */
export const faturamentoDaApi = (r: RevenueFields): { bruto: number | null; ajustado: number | null } => ({
  bruto: r.gross_revenue_usd_ha ?? null,
  ajustado: r.water_adjusted_revenue_usd_ha ?? null,
})

/** Mesmas culturas, na mesma ordem (as datas não contam). */
export const mesmasCulturas = (a: CustomCropInput[], b: CustomCropInput[]) =>
  a.length === b.length && a.every((c, i) => c.code === b[i].code)

/** Nome da 2ª coluna numa rotação de 1 cultura: o resto da safra fica em pousio (traduzido na exibição). */
export const POUSIO = 'Pousio'

function linha(a: SafraDef, b: SafraDef | undefined, pa: PerfilCultura | undefined, pb: PerfilCultura | undefined): CTRow {
  const sem = 'Sem dado'
  if (!b) return {
    c1: a.nome, c2: POUSIO,
    w1: sem, w2: '-',
    soil: sem, soilWhy: 'Sem dado sobre o efeito no solo',
    pest: sem, pestWhy: 'Sem dado sobre pragas para esta sequência.',
    y1: pa?.prod?.y ?? '-', y2: '-',
    u1: pa?.prod?.u,
    p1l: a.nome, p1: pa?.prod?.p ?? 'Não é vendida',
    p2l: POUSIO, p2: '-',
  }
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
 * Rotação extra que foi em custom_rotations (mesma ordem do pedido): uma salva no navegador ou, com `historico`,
 * a rotação atual do talhão.
 */
export type SalvaMeta = { id: string; em: number; historico?: boolean }

/**
 * Converte a resposta da API, na ordem do rank dela (é a ordem da tela). As rotações do agricultor
 * (custom_rotations) entram pela posição que a API deu. O rank delas é a posição que ocupariam entre as
 * recomendadas (1 = melhor que todas), então ficam antes da recomendada de mesmo rank; entre elas, a salva mais
 * antiga primeiro (L14).
 */
export function conjuntoDaApi(r: RotationRecommendations, historico?: Historico | null, salvas: SalvaMeta[] = []): ConjuntoRotacoes {
  const ano = r.agricultural_year
  const avisos = [...r.warnings]
  const atual = ultimaRotacao(historico)
  const rotacoes: RotacaoDef[] = []
  // A rotação atual só entra se nenhuma recomendada tiver as mesmas culturas (aí a recomendada já é marcada "Atual").
  const chave = (x: Rotation) => x.crops.map(c => c.crop.eco_port_code).join('-')
  const recomendadas = new Set(r.rotations.map(chave))
  const custom = (r.custom_rotations ?? []).flatMap((c, i) => {
    const meta = salvas[i]
    if (!meta || (meta.historico && recomendadas.has(chave(c as Rotation)))) return []
    return [{ rot: c as Rotation, salva: meta as SalvaMeta | undefined }]
  })
  const todas = [...r.rotations.map(rot => ({ rot, salva: undefined as SalvaMeta | undefined })), ...custom]
    .sort((a, b) => a.rot.rank - b.rot.rank || Number(!!b.salva) - Number(!!a.salva) || (a.salva?.em ?? 0) - (b.salva?.em ?? 0))
  // Cor pela ordem alfabética dos ids: trocar as prioridades reordena a lista, mas cada rotação mantém a cor.
  const idDe = (x: { rot: Rotation; salva?: SalvaMeta }) => (x.salva?.historico ? 'historico' : x.salva ? `salva-${x.salva.id}` : x.rot.id)
  const ids = todas.map(idDe).sort()
  for (const { rot, salva } of todas) {
    // Uma salva pode ter 1 cultura (seguida de pousio até 31/ago); as recomendadas têm sempre 2.
    const [ca, cb] = rot.crops as [RotationCrop, RotationCrop?]
    const a = safra(ca, 0, ano), b = cb ? safra(cb, 1, ano) : undefined
    const pa = PERFIS[ca.crop.eco_port_code], pb = cb ? PERFIS[cb.crop.eco_port_code] : undefined
    const ct = linha(a, b, pa, pb)
    // Saúde do solo vem da API: o índice de proteção planejada (cobertura viva e troca de família).
    ct.soil = faixa(rot.scores.soil_protection).rotulo
    ct.soilWhy = textoProtecaoSolo(rot.soil_protection)
    // Pela cultura do catálogo (não pelo perfil mock): girassol e feijão-caupi também têm de ser reconhecidos.
    if (salva?.historico || (atual && b && a.ref === atual[0] && b.ref === atual[1])) ct.atual = true
    const barras: BarDef[] = [{ s: mesDaData(ca.planting_date, ano), e: mesDaData(ca.harvest_date, ano, true), label: a.nome }]
    if (cb && b) barras.push({ s: mesDaData(cb.planting_date, ano), e: mesDaData(cb.harvest_date, ano, true), label: b.nome })
    const fim = barras[barras.length - 1].e
    if (fim < 12) barras.push({ s: fim, e: 12, label: '' })
    rotacoes.push({
      id: idDe({ rot, salva }), safras: b ? [a, b] : [a], ct,
      solo: 0,
      barras, maisPragas: pb?.pragas.nivel === 'Maior risco',
      cor: ids.indexOf(idDe({ rot, salva })) % COR_ROT.length, scores: rot.scores, protecaoSolo: rot.soil_protection,
      faturamento: faturamentoDaApi(rot),
      ...(salva?.historico ? { historico: true } : salva ? { salva: { id: salva.id, em: salva.em } } : {}),
    })
  }
  return {
    origem: 'api', ano, rotacoes, avisos,
    solo: r.soil, propriedadesSolo: r.soil_properties ?? null, prioridades: r.priorities,
  }
}

/** "Soja depois milho safrinha". */
export const nomeRotacao = (r: RotacaoDef) => t('{a} depois {b}', { a: t(r.ct.c1), b: minuscula(t(r.ct.c2)) })
