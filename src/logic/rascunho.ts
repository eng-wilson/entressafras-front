// Rascunho da rotação do agricultor ("Nova rotação", fieldshift-nova-rotacao/HANDOFF-SPEC.md), simulado pela API
// (POST /api/rotations/simulate). Aqui só a geometria da entrada do usuário: decêndios ↔ datas, limites do
// arrasto e o pedido. Status, risco, ranking e janela de plantio vêm da resposta (regra "só dados da API").
// Lacunas e decisões: fieldshift-nova-rotacao/LACUNAS-SIMULATE.md.
import { PERFIS } from '../data/perfis'
import { NOMES_PT } from '../data/nomesCulturas'
import type { CropSummary, CustomCropInput, RotationSimulationResponse, SweepPoint } from '../types'
import { classeSeguranca } from './status'
import { segurancaDoRisco } from './resiliencia'
import { decendioDaData } from './rotacoesApi'
import { mesCurtoDe } from './periodo'
import { ordinal, t } from '../i18n'

export const N_DEC = 36
/** A API simula rotações de 1 cultura (seguida de pousio até 31/ago) ou 2 (L1). */
export const MAX_CULTURAS = 2
/** O ciclo enviado precisa ficar entre 50% e 150% do ciclo de referência da cultura (422 fora disso). */
export const FAIXA_CICLO: [number, number] = [0.5, 1.5]
/** Decêndio de plantio quando a 1ª cultura entra sem referência: 11–20 out. */
const PLANTIO_PADRAO = 4
/** Duração provisória (decêndios) de uma cultura nova, até a API resolver o calendário. */
const DURACAO_PROVISORIA = 11

export type CulturaRascunho = {
  code: number
  /** Decêndio do plantio (0 = 1–10 set). Derivado de `plantio` quando ele existe: só para desenhar. */
  s: number
  /** Decêndio seguinte ao da colheita (exclusivo). Derivado de `plantio` + `ciclo` quando existem. */
  e: number
  /**
   * Data exata do plantio (ISO). Com `ciclo`, é a fonte da verdade do pedido: a colheita é plantio + ciclo − 1,
   * a mesma conta do backend. Assim, soltar num decêndio gera exatamente o ponto do sweep. Sem ela, vale `s`.
   */
  plantio?: string
  /** Ciclo em dias (plantio e colheita inclusos). Sem ele, vale o intervalo `s`–`e`. */
  ciclo?: number
  /** Ciclo de referência em dias (calendário regional), quando já conhecido. */
  refCiclo: number | null
  /** Plantio ainda não definido pelo usuário: vai sem data e a API usa o calendário regional. */
  plantioLivre?: boolean
  /** Colheita ainda não definida: vai sem data e a API usa o ciclo de referência. */
  colheitaLivre?: boolean
  /** A colheita da API passava de 31/ago e foi trazida para o fim da safra (L15). */
  ajustado?: boolean
}
export type Rascunho = { culturas: CulturaRascunho[]; sel: number | null }

export const RASCUNHO_VAZIO: Rascunho = { culturas: [], sel: null }

// ---------- Decêndios ↔ datas ----------
const pad = (n: number) => String(n).padStart(2, '0')
const mesDoAno = (idx: number) => Math.floor(idx / 3)
/** Mês do calendário (1–12) e ano civil do decêndio no ano agrícola que começa em setembro de `ano`. */
function mesCivil(idx: number, ano: number) {
  const m = mesDoAno(idx)
  return { mes: ((8 + m) % 12) + 1, ano: ano + (m >= 4 ? 1 : 0) }
}
const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate()

/** Primeiro dia do decêndio (ISO): plantio. */
export function inicioDecendio(idx: number, ano: number): string {
  const { mes, ano: a } = mesCivil(idx, ano)
  return `${a}-${pad(mes)}-${pad((idx % 3) * 10 + 1)}`
}
/** Último dia do decêndio (ISO): colheita. */
export function fimDecendio(idx: number, ano: number): string {
  const { mes, ano: a } = mesCivil(idx, ano)
  const d = idx % 3 === 2 ? ultimoDia(a, mes) : (idx % 3) * 10 + 10
  return `${a}-${pad(mes)}-${pad(d)}`
}
const dia = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000
/** Dias de `a` até `b` (b − a). */
export const diasEntre = (a: string, b: string) => dia(b) - dia(a)
/** Ciclo em dias, contando o plantio e a colheita (como o backend). */
export const cicloDias = (s: number, e: number, ano: number) => diasEntre(inicioDecendio(s, ano), fimDecendio(e - 1, ano)) + 1
/** Data ISO `n` dias depois de `iso`. */
export const somarDias = (iso: string, n: number) => new Date((dia(iso) + n) * 86_400_000).toISOString().slice(0, 10)

export type Datas = { plantio: string; colheita: string; ciclo: number }
/** Datas exatas da cultura: as guardadas ou, sem elas, as dos decêndios `s`–`e`. */
export function datasDe(c: CulturaRascunho, ano: number): Datas {
  const plantio = c.plantio ?? inicioDecendio(c.s, ano)
  const ciclo = c.ciclo ?? diasEntre(plantio, fimDecendio(c.e - 1, ano)) + 1
  return { plantio, ciclo, colheita: somarDias(plantio, ciclo - 1) }
}
/** A cultura com estas datas exatas e os decêndios `s`/`e` recalculados para o desenho. */
export function comDatas(c: CulturaRascunho, plantio: string, ciclo: number, ano: number): CulturaRascunho {
  const colheita = somarDias(plantio, ciclo - 1)
  const s = decendioDaData(plantio, ano)
  const e = colheita > fimDecendio(N_DEC - 1, ano) ? N_DEC : decendioDaData(colheita, ano) + 1
  return { ...c, plantio, ciclo, s, e: Math.max(e, s + 1) }
}

/** "21–31 out". */
export function faixaDecendio(idx: number, ano: number): string {
  const ini = (idx % 3) * 10 + 1
  const fim = +fimDecendio(idx, ano).slice(8)
  return t('{dias} {mes}', { dias: `${ini}–${fim}`, mes: mesCurtoDe(mesDoAno(idx)) })
}
/** "21 out". */
export const dataCurta = (iso: string) => t('{dia} {mes}', { dia: +iso.slice(8, 10), mes: mesCurtoDe((+iso.slice(5, 7) + 3) % 12) })
/** "Plantio 21 out · colheita 20 fev" (datas exatas, as que vão para a API). */
export function datasCultura(c: CulturaRascunho, ano: number): string {
  const d = datasDe(c, ano)
  return t('Plantio {plantio} · colheita {colheita}', { plantio: dataCurta(d.plantio), colheita: dataCurta(d.colheita) })
}

// ---------- Nomes ----------
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Nome exibido pela posição na rotação (o perfil local dá "Milho safrinha" na 2ª); sem perfil, o da API. */
export function nomeCultura(code: number, pos: number, fallback?: string): string {
  const p = PERFIS[code]
  if (p) return pos === 1 && p.nome2 ? p.nome2 : p.nome
  if (NOMES_PT[code]) return NOMES_PT[code]
  return fallback ? maiuscula(fallback) : t('Cultura {code}', { code })
}

export type ItemCatalogo = { code: number; nome: string; comum: boolean }

/**
 * Menu de culturas: só as simuláveis da API. As que têm perfil local (as da região) vêm primeiro,
 * na ordem dele; as outras, em ordem alfabética.
 */
export function catalogoRascunho(itens: CropSummary[]): ItemCatalogo[] {
  const ordem = Object.keys(PERFIS).map(Number)
  return itens
    .map(c => ({ code: c.eco_port_code, nome: nomeCultura(c.eco_port_code, 0, c.common_names[0] ?? c.scientific_name), comum: !!PERFIS[c.eco_port_code] }))
    .sort((a, b) => (a.comum !== b.comum ? (a.comum ? -1 : 1)
      : a.comum ? ordem.indexOf(a.code) - ordem.indexOf(b.code) : a.nome.localeCompare(b.nome, 'pt')))
}

/** "Soja depois sorgo"; sem culturas, "Nova rotação". */
export function tituloRascunho(nomes: string[]): string {
  if (!nomes.length) return t('Nova rotação')
  return nomes.map((n, i) => (i === 0 ? t(n) : minuscula(t(n)))).reduce((a, b) => t('{a} depois {b}', { a, b }))
}

// ---------- Ciclo e limites do arrasto ----------
/** Faixa de ciclo (dias) aceita pela API para a cultura; sem referência, sem limite. */
export function faixaCiclo(c: CulturaRascunho): [number, number] {
  if (!c.refCiclo) return [1, Infinity]
  return [Math.ceil(FAIXA_CICLO[0] * c.refCiclo), Math.floor(FAIXA_CICLO[1] * c.refCiclo)]
}

export type Gesto = 'mover' | 'plantio' | 'colheita'
export type MotivoLimite = 'anterior' | 'seguinte' | 'cicloMin' | 'cicloMax' | 'inicio' | 'fim'
export type ResultadoArrasto = { rascunho: Rascunho; motivo: MotivoLimite | null }

const definido = (c: CulturaRascunho): CulturaRascunho => ({ ...c, plantioLivre: false, colheitaLivre: false, ajustado: false })
const trocarEm = (cs: CulturaRascunho[], i: number, c: CulturaRascunho) => cs.map((x, j) => (j === i ? c : x))

/**
 * Aplica um gesto de arrasto com o alvo em decêndios (plantio ou mover: novo `s`; colheita: novo `e`), em datas
 * exatas, com a mesma conta do sweep da API:
 * - mover: plantio no 1º dia do decêndio, ciclo igual. Cada cultura se move sozinha (a 1ª não leva a 2ª), como
 *   o `first_planting_sweep` e o `second_planting_sweep`; por isso o resultado é exatamente um ponto do sweep;
 * - plantio: plantio no 1º dia do decêndio, colheita igual (o ciclo muda);
 * - colheita: colheita no último dia do decêndio, plantio igual (o ciclo muda).
 * As culturas nunca se sobrepõem (colheita da 1ª antes do plantio da 2ª) e tudo termina até 31/ago.
 * Alvo igual ao decêndio atual não mexe nas datas (um clique não arredonda nada).
 */
export function arrastar(r: Rascunho, i: number, gesto: Gesto, alvo: number, ano: number): ResultadoArrasto {
  const cs = r.culturas
  const c = cs[i]
  if (!c) return { rascunho: r, motivo: null }
  const atual = gesto === 'colheita' ? c.e : c.s
  if (alvo === atual) return { rascunho: r, motivo: null }
  const d = datasDe(c, ano)
  const ant = cs[i - 1] ? datasDe(cs[i - 1], ano) : null
  const seg = cs[i + 1] ? datasDe(cs[i + 1], ano) : null
  const fimSafra = fimDecendio(N_DEC - 1, ano)
  const [min, max] = faixaCiclo(c)

  const candidato = (k: number): { plantio: string; ciclo: number } => {
    if (gesto === 'mover') return { plantio: inicioDecendio(k, ano), ciclo: d.ciclo }
    if (gesto === 'plantio') return { plantio: inicioDecendio(k, ano), ciclo: diasEntre(inicioDecendio(k, ano), d.colheita) + 1 }
    return { plantio: d.plantio, ciclo: diasEntre(d.plantio, fimDecendio(k - 1, ano)) + 1 }
  }
  const falha = (k: number): MotivoLimite | null => {
    const { plantio, ciclo } = candidato(k)
    if (ciclo < 1) return 'cicloMin'
    const colheita = somarDias(plantio, ciclo - 1)
    if (ant && plantio <= ant.colheita) return 'anterior'
    if (seg && colheita >= seg.plantio) return 'seguinte'
    if (colheita > fimSafra) return 'fim'
    if (gesto !== 'mover' && ciclo < min) return 'cicloMin'
    if (gesto !== 'mover' && ciclo > max) return 'cicloMax'
    return null
  }

  const ks = gesto === 'colheita' ? Array.from({ length: N_DEC }, (_, k) => k + 1) : Array.from({ length: N_DEC }, (_, k) => k)
  const validos = ks.filter(k => !falha(k))
  if (!validos.length) return { rascunho: r, motivo: null }
  const lo = validos[0], hi = validos[validos.length - 1]
  let k = alvo
  let motivo: MotivoLimite | null = null
  if (k < lo) { k = lo; motivo = lo > ks[0] ? falha(lo - 1) : gesto === 'colheita' ? 'cicloMin' : 'inicio' }
  else if (k > hi) { k = hi; motivo = hi < ks[ks.length - 1] ? falha(hi + 1) : 'fim' }
  else if (falha(k)) {
    motivo = falha(k)
    k = validos.reduce((m, v) => (Math.abs(v - alvo) < Math.abs(m - alvo) ? v : m), lo)
  }
  if (k === atual) return { rascunho: r, motivo }
  const { plantio, ciclo } = candidato(k)
  return { rascunho: { ...r, culturas: trocarEm(cs, i, definido(comDatas(c, plantio, ciclo, ano))) }, motivo }
}

/** Texto da dica laranja de limite. `nomes` na ordem das culturas. */
export function textoLimite(m: MotivoLimite, i: number, nomes: string[], c: CulturaRascunho): string {
  const [min, max] = faixaCiclo(c)
  switch (m) {
    case 'anterior': return t('Limite: colheita de {cultura}', { cultura: minuscula(t(nomes[i - 1] ?? '')) })
    case 'seguinte': return t('Limite: plantio de {cultura}', { cultura: minuscula(t(nomes[i + 1] ?? '')) })
    case 'cicloMin': return t('Ciclo mínimo de {cultura}: {n} dias', { cultura: minuscula(t(nomes[i])), n: min })
    case 'cicloMax': return t('Ciclo máximo de {cultura}: {n} dias', { cultura: minuscula(t(nomes[i])), n: max })
    case 'inicio': return t('Limite: início da safra (1 set)')
    case 'fim': return t('Limite: fim da safra (31 ago)')
  }
}

// ---------- Ações ----------
export function adicionar(r: Rascunho, code: number): Rascunho {
  const cs = r.culturas
  if (cs.length >= MAX_CULTURAS) return r
  const s = cs.length ? cs[cs.length - 1].e : PLANTIO_PADRAO
  if (s >= N_DEC) return r
  const nova: CulturaRascunho = { code, s, e: Math.min(N_DEC, s + DURACAO_PROVISORIA), refCiclo: null, plantioLivre: true, colheitaLivre: true }
  return { culturas: [...cs, nova], sel: cs.length }
}

/** Troca a cultura mantendo o plantio; a colheita vai sem data e a API aplica o ciclo da nova cultura. */
export function trocar(r: Rascunho, i: number, code: number): Rascunho {
  const c = r.culturas[i]
  if (!c || c.code === code) return r
  const nova: CulturaRascunho = { code, s: c.s, e: c.e, plantio: c.plantio, refCiclo: null, plantioLivre: c.plantioLivre, colheitaLivre: true }
  return { culturas: trocarEm(r.culturas, i, nova), sel: i }
}

/** Remove; a seleção passa para a anterior (ou a primeira). As vizinhas não se movem. */
export function remover(r: Rascunho, i: number): Rascunho {
  const culturas = r.culturas.filter((_, j) => j !== i)
  return { culturas, sel: culturas.length ? Math.max(0, i - 1) : null }
}

/** Não cabe mais nenhuma cultura: máximo da API ou safra cheia. */
export const cheio = (r: Rascunho) =>
  r.culturas.length >= MAX_CULTURAS || (r.culturas.length > 0 && r.culturas[r.culturas.length - 1].e >= N_DEC)

// ---------- Pedido e resposta ----------
/** Culturas do pedido (datas exatas); null sem nenhuma. Com 1, a API simula a cultura seguida de pousio. */
export function pedidoCulturas(r: Rascunho, ano: number): CustomCropInput[] | null {
  if (r.culturas.length === 0 || r.culturas.length > MAX_CULTURAS) return null
  return r.culturas.map(c => {
    if (c.plantioLivre) return { code: c.code }
    const d = datasDe(c, ano)
    return c.colheitaLivre ? { code: c.code, planting_date: d.plantio } : { code: c.code, planting_date: d.plantio, harvest_date: d.colheita }
  })
}

const cicloDoPedido = (c: CustomCropInput) => (c.planting_date && c.harvest_date ? diasEntre(c.planting_date, c.harvest_date) + 1 : '-')
/**
 * O que a faixa (sweep) da cultura `i` pressupõe: as culturas, o ciclo dela e as datas da outra. Mudou, a faixa
 * precisa ser recalculada. Mover a própria cultura `i` não muda a chave: a faixa dela continua valendo.
 */
export const chaveFaixa = (cs: CustomCropInput[], i: number) =>
  cs.map((c, j) => (j === i ? `${c.code}:${cicloDoPedido(c)}` : `${c.code}:${c.planting_date ?? '-'}:${c.harvest_date ?? '-'}`)).join('|')

/**
 * Leva para o rascunho as datas exatas que a API resolveu para as culturas enviadas sem data (e o ciclo de
 * referência). Uma colheita depois de 31/ago vai para o fim da safra (L15).
 */
export function aplicarResposta(r: Rascunho, enviado: CustomCropInput[], resp: RotationSimulationResponse): Rascunho {
  if (r.culturas.length !== resp.rotation.crops.length) return r
  if (!r.culturas.every((c, i) => c.code === enviado[i]?.code && c.code === resp.rotation.crops[i].crop.eco_port_code)) return r
  const ano = resp.agricultural_year
  const fimSafra = fimDecendio(N_DEC - 1, ano)
  let mudou = false
  const culturas = r.culturas.map((c, i) => {
    const pedidoSemColheita = !enviado[i].harvest_date
    if (!c.plantioLivre && !c.colheitaLivre && !(pedidoSemColheita && !c.refCiclo)) return c
    const api = resp.rotation.crops[i]
    mudou = true
    const atual = datasDe(c, ano)
    const plantio = c.plantioLivre ? api.planting_date : atual.plantio
    const passou = api.harvest_date > fimSafra
    const ciclo = c.colheitaLivre ? diasEntre(plantio, passou ? fimSafra : api.harvest_date) + 1 : atual.ciclo
    return {
      ...comDatas(c, plantio, ciclo, ano),
      refCiclo: pedidoSemColheita ? api.calendar.cycle_days : c.refCiclo,
      plantioLivre: false, colheitaLivre: false, ajustado: c.colheitaLivre ? passou : c.ajustado,
    }
  })
  if (!mudou) return r
  // Desenho: a barra da 2ª não invade o decêndio da colheita da 1ª (as datas exatas não mudam).
  for (let i = 1; i < culturas.length; i++) {
    const a = culturas[i - 1], b = culturas[i]
    if (b.s < a.e) culturas[i] = { ...b, s: a.e, e: Math.max(b.e, a.e + 1) }
  }
  return { ...r, culturas: culturas.map(c => ({ ...c, e: Math.min(N_DEC, Math.max(c.e, c.s + 1)) })) }
}

/**
 * Um 422 que o rascunho consegue corrigir sozinho: ciclo fora da faixa (o backend informa o ciclo de
 * referência) ou 1ª cultura colhida depois do plantio da 2ª (o backend informa a colheita). Devolve o rascunho
 * corrigido, ou null quando não há correção (a tela mostra o erro).
 */
export function corrigir422(r: Rascunho, mensagem: string, ano: number): Rascunho | null {
  const ciclo = /crop (\d+) cycle of \d+ days is outside .*reference cycle \((\d+) days\)/.exec(mensagem)
  if (ciclo) {
    const code = +ciclo[1], ref = +ciclo[2]
    const i = r.culturas.findIndex(c => c.code === code && c.refCiclo !== ref)
    if (i < 0) return null
    return ajustarCiclo({ ...r, culturas: trocarEm(r.culturas, i, { ...r.culturas[i], refCiclo: ref }) }, i, ano)
  }
  const colheita = /planted after the harvest of the first \((\d{4}-\d{2}-\d{2})\)/.exec(mensagem)
  if (colheita) {
    const a = r.culturas[0]
    if (!a || !a.colheitaLivre || a.plantioLivre) return null
    const { plantio } = datasDe(a, ano)
    const ref = diasEntre(plantio, colheita[1]) + 1
    return ajustarCiclo({ ...r, culturas: trocarEm(r.culturas, 0, { ...comDatas(a, plantio, ref, ano), refCiclo: ref, colheitaLivre: false }) }, 0, ano)
  }
  return null
}

/** Coloca o ciclo da cultura `i` (em dias) dentro da faixa e do espaço até a vizinha; null se não couber. */
function ajustarCiclo(r: Rascunho, i: number, ano: number): Rascunho | null {
  const c = r.culturas[i]
  const [min, max] = faixaCiclo(c)
  const d = datasDe(c, ano)
  const seg = r.culturas[i + 1] ? datasDe(r.culturas[i + 1], ano) : null
  const limite = seg ? somarDias(seg.plantio, -1) : fimDecendio(N_DEC - 1, ano)
  const ciclo = Math.min(Math.max(d.ciclo, min), max, diasEntre(d.plantio, limite) + 1)
  if (ciclo < min || ciclo > max) return null
  return { ...r, culturas: trocarEm(r.culturas, i, comDatas({ ...c, colheitaLivre: false }, d.plantio, ciclo, ano)) }
}

// ---------- Leitura da simulação ----------
export type Classe = 'good' | 'warn' | 'risk' | 'none'
export const ROTULO_CLASSE: Record<Classe, string> = { good: 'Favorável', warn: 'Arriscado', risk: 'Desfavorável', none: 'Sem dado' }

/** Mesma régua da tela principal: segurança hídrica (100 − risco da API); sem risco, sem dado. */
export const classeDoRisco = (pct: number | null | undefined): Classe =>
  pct == null ? 'none' : classeSeguranca(segurancaDoRisco(pct))

const ORDEM: Classe[] = ['risk', 'warn', 'good']
/** Pior classe entre as culturas com dado (a que não tem dado não entra); índice da cultura citada. */
export function piorClasse(cls: Classe[]): { cls: Classe; i: number } {
  for (const k of ORDEM) {
    const i = cls.indexOf(k)
    if (i >= 0) return { cls: k, i }
  }
  return { cls: 'none', i: cls.indexOf('none') }
}

/** Ponto do sweep com exatamente estas datas (para mostrar o resultado na hora, antes da resposta exata). */
export function pontoDoSweep(resp: RotationSimulationResponse | null, enviado: CustomCropInput[] | null): SweepPoint | null {
  if (!resp || !enviado || enviado.some(c => !c.planting_date || !c.harvest_date)) return null
  for (const sw of [resp.first_planting_sweep, resp.second_planting_sweep]) {
    const p = sw?.points.find(pt => pt.crops.length === enviado.length && pt.crops.every((c, i) => c.code === enviado[i].code
      && c.planting_date === enviado[i].planting_date && c.harvest_date === enviado[i].harvest_date))
    if (p) return p
  }
  return null
}

/** Um decêndio de plantio na faixa do calendário. */
export type PontoFaixa = {
  /** Cor do decêndio: a mesma régua da barra (classeDoRisco), para plantar ali. */
  cls: Classe
  /** Dentro de ±30 dias da data usual de plantio na região (GGCMI). Marca secundária: não é risco. */
  regional: boolean
  temperaturaOk: boolean
}
export type FaixaCalendario = { pontos: Record<number, PontoFaixa>; melhor: number | null }

/**
 * Cores dos decêndios no calendário para a cultura `i`, pelo sweep da API, com a MESMA régua da barra:
 * pintar de verde significa que, plantando ali (e soltando a barra), a barra dela fica verde. Cada sweep move só
 * a cultura `i` e deixa a outra nas datas atuais, como o arrasto; vale o risco da própria cultura.
 * Temperatura fora dos limites da cultura reprova o plantio. Decêndios fora do sweep (a rotação passaria de
 * 31/ago) ficam sem cor.
 */
export function faixaDoSweep(resp: RotationSimulationResponse | null, i: number): FaixaCalendario | null {
  const sw = i === 0 ? resp?.first_planting_sweep : resp?.second_planting_sweep
  if (!sw) return null
  const pontos: Record<number, PontoFaixa> = {}
  for (const p of sw.points) {
    const c = p.crops[i]
    pontos[p.decendio_idx] = { cls: c.temperature_ok ? classeDoRisco(c.risk_percentage) : 'risk', regional: c.in_calendar, temperaturaOk: c.temperature_ok }
  }
  return { pontos, melhor: sw.best_decendio_idx }
}

/** Selo "Ficaria em 3º" e cartão "3º de 14" (o rank compara com todos os candidatos, L6). */
export const seloRanking = (rank: number, recomendada: boolean) =>
  (recomendada ? t('Ficaria em {pos}', { pos: ordinal(rank, 'm') }) : t('Fora das 4 melhores'))
export const posicaoRanking = (rank: number, entre: number) => t('{pos} de {total}', { pos: ordinal(rank, 'm'), total: entre })

/** Dias sem cultura entre a colheita da 1ª e o plantio da 2ª (datas reais, L11). */
export function diasSemCobertura(r: Rascunho, ano: number): number {
  let total = 0
  for (let i = 1; i < r.culturas.length; i++) {
    total += Math.max(0, diasEntre(datasDe(r.culturas[i - 1], ano).colheita, datasDe(r.culturas[i], ano).plantio) - 1)
  }
  return total
}

/** Dias de pousio entre a colheita da última cultura e o fim da safra (31/ago), em datas reais. */
export function diasDePousio(r: Rascunho, ano: number): number {
  const ultima = r.culturas.at(-1)
  return ultima ? Math.max(0, diasEntre(datasDe(ultima, ano).colheita, fimDecendio(N_DEC - 1, ano))) : 0
}

// ---------- Textos da API em português (L4) ----------
export type Aviso = { titulo: string; texto: string }

/** Checks da API (inglês, texto livre) em português; `nomesApi[i]` é o nome que a API usa na mensagem. */
export function traduzirCheck(check: string, nomesApi: string[], nomes: string[]): Aviso {
  const nome = (n: string) => {
    const i = nomesApi.findIndex(x => x.toLowerCase() === n.trim().toLowerCase())
    return i >= 0 ? t(nomes[i]) : maiuscula(n.trim())
  }
  let m = /^Both crops are (.+?): no botanical family change/.exec(check)
  if (m) return { titulo: t('Mesma família botânica'), texto: t('As duas culturas são {familia}: pragas, doenças e nematoides passam de uma para a outra.', { familia: m[1] }) }
  m = /^(.+?): planting on (\d{4}-\d{2}-\d{2}) is (\d+) days from the regional calendar date \((\d{4}-\d{2}-\d{2})\)/.exec(check)
  if (m) return { titulo: t('Fora do calendário da região'), texto: t('{cultura}: plantio a {dias} dias da data usual da região ({data}). A recomendação aceita até 30.', { cultura: nome(m[1]), dias: m[3], data: dataCurta(m[4]) }) }
  m = /^(.+?): mean temperature over the cycle is outside/.exec(check)
  if (m) return { titulo: t('Temperatura'), texto: t('{cultura}: a temperatura média do ciclo fica fora dos limites da cultura.', { cultura: nome(m[1]) }) }
  m = /^(.+?) is harvested on (\d{4}-\d{2}-\d{2}), after the end of the agricultural year/.exec(check)
  if (m) return { titulo: t('Colheita depois da safra'), texto: t('{cultura}: colheita em {data}, depois do fim da safra (31 ago).', { cultura: nome(m[1]), data: dataCurta(m[2]) }) }
  return { titulo: t('Alerta agronômico'), texto: check }
}


/** Erro da simulação em português. `nomePorCodigo` dá o nome exibido de cada cultura. */
export function mensagemErro(motivo: string, detalhe: string, nomePorCodigo: (code: number) => string): string {
  if (motivo === 'rede') return t('Sem conexão com o serviço de simulação.')
  if (motivo === 'http' || motivo === 'resposta_invalida') return t('O serviço de simulação não respondeu como esperado.')
  let m = /crop (\d+) has no FAO-56 water requirements/.exec(detalhe)
  if (m) return t('{cultura} não tem dados de consumo de água para simular.', { cultura: t(nomePorCodigo(+m[1])) })
  m = /crop (\d+) cycle of (\d+) days is outside .*reference cycle \((\d+) days\)/.exec(detalhe)
  if (m) {
    return t('{cultura}: ciclo de {ciclo} dias fora da faixa aceita ({min} a {max} dias).',
      { cultura: t(nomePorCodigo(+m[1])), ciclo: m[2], min: Math.ceil(+m[3] * FAIXA_CICLO[0]), max: Math.floor(+m[3] * FAIXA_CICLO[1]) })
  }
  if (/first crop must be planted inside the agricultural year/.test(detalhe)) return t('O plantio da 1ª cultura precisa ficar dentro da safra.')
  if (/second crop must be planted after the harvest/.test(detalhe)) return t('A 2ª cultura não cabe aqui: ela precisa ser plantada depois da colheita da 1ª.')
  if (/second crop must be planted by the end/.test(detalhe)) return t('A 2ª cultura precisa ser plantada antes do fim da safra.')
  if (/harvest_date must be after/.test(detalhe)) return t('A colheita precisa ser depois do plantio.')
  if (/unknown crop/.test(detalhe)) return t('Cultura desconhecida no catálogo da API.')
  return t('Não foi possível simular com estas culturas e datas.')
}
