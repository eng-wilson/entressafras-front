// Rascunho da rotação do agricultor ("Nova rotação", fieldshift-nova-rotacao/HANDOFF-SPEC.md), simulado pela API
// (POST /api/rotations/simulate). Aqui só a geometria da entrada do usuário: decêndios ↔ datas, limites do
// arrasto e o pedido. Status, risco, ranking e janela de plantio vêm da resposta (regra "só dados da API").
// Lacunas e decisões: fieldshift-nova-rotacao/LACUNAS-SIMULATE.md.
import { MONTHS_SHORT } from '../data/mock'
import { PERFIS } from '../data/perfis'
import { NOMES_PT } from '../data/nomesCulturas'
import type { CropSummary, CustomCropInput, RotationSimulationResponse, SweepPoint } from '../types'
import { classeAnos } from './status'
import { anosDoRisco } from './resiliencia'
import { decendioDaData } from './rotacoesApi'

export const N_DEC = 36
/** A API simula rotações de exatamente 2 culturas (L1). */
export const MAX_CULTURAS = 2
/** O ciclo enviado precisa ficar entre 50% e 150% do ciclo de referência da cultura (422 fora disso). */
export const FAIXA_CICLO: [number, number] = [0.5, 1.5]
/** Decêndio de plantio quando a 1ª cultura entra sem referência: 11–20 out. */
const PLANTIO_PADRAO = 4
/** Duração provisória (decêndios) de uma cultura nova, até a API resolver o calendário. */
const DURACAO_PROVISORIA = 11

export type CulturaRascunho = {
  code: number
  /** Decêndio do plantio (0 = 1–10 set). */
  s: number
  /** Decêndio seguinte ao da colheita (exclusivo). */
  e: number
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

/** "21–31 out". */
export function faixaDecendio(idx: number, ano: number): string {
  const ini = (idx % 3) * 10 + 1
  const fim = +fimDecendio(idx, ano).slice(8)
  return `${ini}–${fim} ${MONTHS_SHORT[mesDoAno(idx)].toLowerCase()}`
}
/** "Plantio 21–31 out · colheita 11–20 fev". */
export const datasCultura = (c: CulturaRascunho, ano: number) =>
  `Plantio ${faixaDecendio(c.s, ano)} · colheita ${faixaDecendio(c.e - 1, ano)}`

// ---------- Nomes ----------
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Nome exibido pela posição na rotação (o perfil local dá "Milho safrinha" na 2ª); sem perfil, o da API. */
export function nomeCultura(code: number, pos: number, fallback?: string): string {
  const p = PERFIS[code]
  if (p) return pos === 1 && p.nome2 ? p.nome2 : p.nome
  if (NOMES_PT[code]) return NOMES_PT[code]
  return fallback ? maiuscula(fallback) : `Cultura ${code}`
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
  if (!nomes.length) return 'Nova rotação'
  return nomes.map((n, i) => (i === 0 ? n : minuscula(n))).join(' depois ')
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
 * Aplica um gesto de arrasto com o alvo em decêndios (plantio ou mover: novo `s`; colheita: novo `e`).
 * As culturas nunca se sobrepõem. Mover a 1ª leva a 2ª junto, mantendo o intervalo: é o mesmo movimento do
 * `first_planting_sweep` da API, então o resultado ao vivo é exato (L10).
 */
export function arrastar(r: Rascunho, i: number, gesto: Gesto, alvo: number, ano: number): ResultadoArrasto {
  const cs = r.culturas
  const c = cs[i]
  if (!c) return { rascunho: r, motivo: null }
  const ant = cs[i - 1], seg = cs[i + 1]
  let motivo: MotivoLimite | null = null
  const limitar = (v: number, lo: number, hi: number, mLo: MotivoLimite, mHi: MotivoLimite) => {
    if (v < lo) { motivo = mLo; return lo }
    if (v > hi) { motivo = mHi; return hi }
    return v
  }

  if (gesto === 'mover') {
    if (i === 0) {
      const ultimo = cs[cs.length - 1]
      const d = limitar(alvo - c.s, -c.s, N_DEC - ultimo.e, 'inicio', 'fim')
      return { rascunho: { ...r, culturas: cs.map(x => definido({ ...x, s: x.s + d, e: x.e + d })) }, motivo }
    }
    const d = limitar(alvo - c.s, (ant ? ant.e : 0) - c.s, (seg ? seg.s : N_DEC) - c.e, ant ? 'anterior' : 'inicio', seg ? 'seguinte' : 'fim')
    return { rascunho: { ...r, culturas: trocarEm(cs, i, definido({ ...c, s: c.s + d, e: c.e + d })) }, motivo }
  }

  const [min, max] = faixaCiclo(c)
  if (gesto === 'plantio') {
    // Menor s: depois da anterior e com ciclo até o máximo. Maior s: ciclo no mínimo e ao menos 1 decêndio.
    let lo = ant ? ant.e : 0, mLo: MotivoLimite = ant ? 'anterior' : 'inicio'
    while (lo < c.e - 1 && cicloDias(lo, c.e, ano) > max) { lo++; mLo = 'cicloMax' }
    let hi = c.e - 1, mHi: MotivoLimite = 'cicloMin'
    while (hi > lo && cicloDias(hi, c.e, ano) < min) hi--
    const s = limitar(alvo, lo, hi, mLo, mHi)
    return { rascunho: { ...r, culturas: trocarEm(cs, i, definido({ ...c, s })) }, motivo }
  }

  let lo = c.s + 1
  const mLo: MotivoLimite = 'cicloMin'
  while (lo < N_DEC && cicloDias(c.s, lo, ano) < min) lo++
  let hi = seg ? seg.s : N_DEC, mHi: MotivoLimite = seg ? 'seguinte' : 'fim'
  while (hi > lo && cicloDias(c.s, hi, ano) > max) { hi--; mHi = 'cicloMax' }
  const e = limitar(alvo, lo, Math.max(lo, hi), mLo, mHi)
  return { rascunho: { ...r, culturas: trocarEm(cs, i, definido({ ...c, e })) }, motivo }
}

/** Texto da dica laranja de limite. `nomes` na ordem das culturas. */
export function textoLimite(m: MotivoLimite, i: number, nomes: string[], c: CulturaRascunho): string {
  const [min, max] = faixaCiclo(c)
  switch (m) {
    case 'anterior': return `Limite: colheita de ${minuscula(nomes[i - 1] ?? '')}`
    case 'seguinte': return `Limite: plantio de ${minuscula(nomes[i + 1] ?? '')}`
    case 'cicloMin': return `Ciclo mínimo de ${minuscula(nomes[i])}: ${min} dias`
    case 'cicloMax': return `Ciclo máximo de ${minuscula(nomes[i])}: ${max} dias`
    case 'inicio': return 'Limite: início da safra (1 set)'
    case 'fim': return 'Limite: fim da safra (31 ago)'
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
  const nova: CulturaRascunho = { code, s: c.s, e: c.e, refCiclo: null, plantioLivre: c.plantioLivre, colheitaLivre: true }
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
/** Culturas do pedido; null com menos de 2 (a API só simula 2). */
export function pedidoCulturas(r: Rascunho, ano: number): CustomCropInput[] | null {
  if (r.culturas.length !== MAX_CULTURAS) return null
  return r.culturas.map(c => ({
    code: c.code,
    ...(c.plantioLivre ? {} : { planting_date: inicioDecendio(c.s, ano) }),
    ...(c.plantioLivre || c.colheitaLivre ? {} : { harvest_date: fimDecendio(c.e - 1, ano) }),
  }))
}

/** Culturas e ciclos: quando mudam, a faixa do sweep precisa ser recalculada. */
export const chaveEstrutura = (cs: CustomCropInput[]) =>
  cs.map(c => `${c.code}:${c.planting_date && c.harvest_date ? diasEntre(c.planting_date, c.harvest_date) : '-'}`).join('|')

/**
 * Leva para o rascunho as datas que a API resolveu para as culturas enviadas sem data (e o ciclo de
 * referência). Encaixa nos decêndios sem sobreposição; uma colheita depois de 31/ago vai para o fim da safra (L15).
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
    const s = c.plantioLivre ? decendioDaData(api.planting_date, ano) : c.s
    const passou = api.harvest_date > fimSafra
    const e = c.colheitaLivre ? (passou ? N_DEC : decendioDaData(api.harvest_date, ano) + 1) : c.e
    return {
      ...c, s, e,
      refCiclo: pedidoSemColheita ? api.calendar.cycle_days : c.refCiclo,
      plantioLivre: false, colheitaLivre: false, ajustado: c.colheitaLivre ? passou : c.ajustado,
    }
  })
  if (!mudou) return r
  // Encaixe: a 2ª começa no decêndio seguinte à colheita da 1ª, e cada barra tem ao menos 1 decêndio.
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
    const ref = diasEntre(inicioDecendio(a.s, ano), colheita[1]) + 1
    return ajustarCiclo({ ...r, culturas: trocarEm(r.culturas, 0, { ...a, refCiclo: ref, colheitaLivre: false, e: decendioDaData(colheita[1], ano) + 1 }) }, 0, ano)
  }
  return null
}

/** Coloca o ciclo da cultura `i` dentro da faixa e do espaço até a vizinha; null se não couber. */
function ajustarCiclo(r: Rascunho, i: number, ano: number): Rascunho | null {
  const c = r.culturas[i]
  const [min, max] = faixaCiclo(c)
  const teto = r.culturas[i + 1]?.s ?? N_DEC
  let e = Math.min(c.e, teto)
  while (e < teto && cicloDias(c.s, e, ano) < min) e++
  while (e > c.s + 1 && cicloDias(c.s, e, ano) > max) e--
  const dias = cicloDias(c.s, e, ano)
  if (dias < min || dias > max) return null
  return { ...r, culturas: trocarEm(r.culturas, i, { ...c, e, colheitaLivre: false }) }
}

// ---------- Leitura da simulação ----------
export type Classe = 'good' | 'warn' | 'risk' | 'none'
export const ROTULO_CLASSE: Record<Classe, string> = { good: 'Favorável', warn: 'Arriscado', risk: 'Desfavorável', none: 'Sem dado' }

/** Mesma régua da tela principal: anos bons em 10 pelo risco hídrico da API; sem risco, sem dado. */
export const classeDoRisco = (pct: number | null | undefined): Classe =>
  pct == null ? 'none' : classeAnos(anosDoRisco(pct))

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
    const p = sw?.points.find(pt => pt.crops.every((c, i) => c.code === enviado[i].code
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
 * pintar de verde significa que, plantando ali, a barra fica verde.
 * - 1ª cultura: o sweep move as duas juntas, então vale a pior das duas (é o status da rotação).
 * - 2ª cultura: a 1ª fica fixa; vale o risco da 2ª.
 * Temperatura fora dos limites da cultura reprova o plantio. Decêndios fora do sweep (a rotação passaria de
 * 31/ago) ficam sem cor.
 */
export function faixaDoSweep(resp: RotationSimulationResponse | null, i: number): FaixaCalendario | null {
  const sw = i === 0 ? resp?.first_planting_sweep : resp?.second_planting_sweep
  if (!sw) return null
  const pontos: Record<number, PontoFaixa> = {}
  for (const p of sw.points) {
    const c = p.crops[i]
    const propria = classeDoRisco(c.risk_percentage)
    const base = i === 0 ? piorClasse(p.crops.map(x => classeDoRisco(x.risk_percentage))).cls : propria
    pontos[p.decendio_idx] = { cls: c.temperature_ok ? base : 'risk', regional: c.in_calendar, temperaturaOk: c.temperature_ok }
  }
  return { pontos, melhor: sw.best_decendio_idx }
}

/** Selo "Ficaria em 3º" e cartão "3º de 14" (o rank compara com todos os candidatos, L6). */
export const seloRanking = (rank: number, recomendada: boolean) => (recomendada ? `Ficaria em ${rank}º` : 'Fora das 4 melhores')
export const posicaoRanking = (rank: number, entre: number) => `${rank}º de ${entre}`

/** Dias sem cultura entre a colheita da 1ª e o plantio da 2ª (datas reais, L11). */
export function diasSemCobertura(r: Rascunho, ano: number): number {
  let total = 0
  for (let i = 1; i < r.culturas.length; i++) {
    total += Math.max(0, diasEntre(fimDecendio(r.culturas[i - 1].e - 1, ano), inicioDecendio(r.culturas[i].s, ano)) - 1)
  }
  return total
}

// ---------- Textos da API em português (L4) ----------
export type Aviso = { titulo: string; texto: string }

/** Checks da API (inglês, texto livre) em português; `nomesApi[i]` é o nome que a API usa na mensagem. */
export function traduzirCheck(check: string, nomesApi: string[], nomes: string[]): Aviso {
  const nome = (n: string) => {
    const i = nomesApi.findIndex(x => x.toLowerCase() === n.trim().toLowerCase())
    return i >= 0 ? nomes[i] : maiuscula(n.trim())
  }
  let m = /^Both crops are (.+?): no botanical family change/.exec(check)
  if (m) return { titulo: 'Mesma família botânica', texto: `As duas culturas são ${m[1]}: pragas, doenças e nematoides passam de uma para a outra.` }
  m = /^(.+?): planting on (\d{4}-\d{2}-\d{2}) is (\d+) days from the regional calendar date \((\d{4}-\d{2}-\d{2})\)/.exec(check)
  if (m) return { titulo: 'Fora do calendário da região', texto: `${nome(m[1])}: plantio a ${m[3]} dias da data usual da região (${dataCurta(m[4])}). A recomendação aceita até 30.` }
  m = /^(.+?): mean temperature over the cycle is outside/.exec(check)
  if (m) return { titulo: 'Temperatura', texto: `${nome(m[1])}: a temperatura média do ciclo fica fora dos limites da cultura.` }
  m = /^(.+?) is harvested on (\d{4}-\d{2}-\d{2}), after the end of the agricultural year/.exec(check)
  if (m) return { titulo: 'Colheita depois da safra', texto: `${nome(m[1])}: colheita em ${dataCurta(m[2])}, depois do fim da safra (31 ago).` }
  return { titulo: 'Alerta agronômico', texto: check }
}

const dataCurta = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_SHORT[(+iso.slice(5, 7) + 3) % 12].toLowerCase()}`

/** Erro da simulação em português. `nomePorCodigo` dá o nome exibido de cada cultura. */
export function mensagemErro(motivo: string, detalhe: string, nomePorCodigo: (code: number) => string): string {
  if (motivo === 'rede') return 'Sem conexão com o serviço de simulação.'
  if (motivo === 'http' || motivo === 'resposta_invalida') return 'O serviço de simulação não respondeu como esperado.'
  let m = /crop (\d+) has no FAO-56 water requirements/.exec(detalhe)
  if (m) return `${nomePorCodigo(+m[1])} não tem dados de consumo de água para simular.`
  m = /crop (\d+) cycle of (\d+) days is outside .*reference cycle \((\d+) days\)/.exec(detalhe)
  if (m) return `${nomePorCodigo(+m[1])}: ciclo de ${m[2]} dias fora da faixa aceita (${Math.ceil(+m[3] * FAIXA_CICLO[0])} a ${Math.floor(+m[3] * FAIXA_CICLO[1])} dias).`
  if (/first crop must be planted inside the agricultural year/.test(detalhe)) return 'O plantio da 1ª cultura precisa ficar dentro da safra.'
  if (/second crop must be planted after the harvest/.test(detalhe)) return 'A 2ª cultura não cabe aqui: ela precisa ser plantada depois da colheita da 1ª.'
  if (/second crop must be planted by the end/.test(detalhe)) return 'A 2ª cultura precisa ser plantada antes do fim da safra.'
  if (/harvest_date must be after/.test(detalhe)) return 'A colheita precisa ser depois do plantio.'
  if (/unknown crop/.test(detalhe)) return 'Cultura desconhecida no catálogo da API.'
  return 'Não foi possível simular com estas culturas e datas.'
}
