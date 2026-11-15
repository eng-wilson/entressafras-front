// Resiliência climática de cada safra: o risco hídrico que a API Entressafras calcula para a cultura
// (POST /api/rotations/recommendations, campo `risk`). O front NÃO calcula risco: regra do projeto, quando um
// endpoint resolve algo que a tela mostra, vale só o dado da API (o antigo balanço hídrico ZARC do front foi
// removido). Aqui só se organiza o que veio: a nota da safra, as fases no calendário e o consumo de água.
//
// O consumo (Kc × ET0) continua no front porque a API não o entrega pronto; os dois fatores vêm da API
// (Kc do catálogo, ET0 do clima por decêndio).
import type { ClimaDecendios, CropCalendarInfo, Decendio, Textura } from '../types'
import { MONTHS_SHORT, type SafraDef } from '../data/mock'
import { FASES, type CulturaRef } from '../data/zarc'
import { diasDe, mesDe } from './periodo'

export type Fase = 0 | 1 | 2 | 3
export type Fracoes = [number, number, number, number]

/** Fase (0 = I … 3 = IV) no ponto t (0–1) do ciclo, com a fração do ciclo em cada fase. */
export function faseNoCiclo(t: number, fases: Fracoes = FASES): Fase {
  let acc = 0
  for (let f = 0; f < 4; f++) {
    acc += fases[f]
    if (t < acc) return f as Fase
  }
  return 3
}

/** Kc no ponto t (0–1): constante na fase I, sobe na II, constante na III, desce na IV (forma da FAO-56). */
export function kcNoCiclo(kc: [number, number, number], t: number, fases: Fracoes = FASES): number {
  const [ini, meio, fim] = kc
  const [a, b, m] = fases
  if (t < a) return ini
  if (t < a + b) return ini + ((meio - ini) * (t - a)) / b
  if (t < a + b + m) return meio
  return meio + ((fim - meio) * (t - a - b - m)) / (1 - a - b - m)
}

const ESTAGIO_FASE = { initial: 0, development: 1, mid_season: 2, late_season: 3 } as const

/** Risco hídrico de uma cultura, como a API o entrega. */
export type RiscoApi = {
  /** % das safras históricas com perda por falta de água acima do limiar. */
  pct: number
  /** Perda média de produtividade por falta de água, %. */
  perda: number | null
  /** Perda a partir da qual a safra conta como crítica, %. */
  limiar: number
  /** Fase com o maior déficit (Ky × déficit); null = sem fase crítica. */
  fase: Fase | null
  /** ISNA médio por fase (I a IV), da API. */
  isna: [number | null, number | null, number | null, number | null]
  anosValidos: number
  /** Método do servidor; 'MOCK' = valor provisório, não calculado com o clima. */
  metodo: string
  /** ISNA do ciclo inteiro, da API (null se não veio). */
  isnaCiclo: number | null
}

/** Risco da API na régua do ZARC (só a escala de leitura): 30% → 7 de 10 anos sem perda crítica. */
export const anosDoRisco = (pct: number) => Math.min(10, Math.max(0, Math.round((100 - pct) / 10)))

/** Um decêndio da janela da safra. Campos de clima null enquanto o clima não chega (nunca 0). */
export type CalcDecendio = {
  idx: number
  rotulo: string
  fase: Fase
  chuvaMedia: number | null
  chuvaP20: number | null
  et0: number | null
  /** Kc da API no decêndio; null se a cultura não tem perfil hídrico. */
  kc: number | null
  /** Kc × ET0, mm. */
  consumo: number | null
}

export type ResSafra = {
  nome: string
  ref: CulturaRef | string
  cobertura: boolean
  de: number
  ate: number
  /** Nota da safra pelo risco da API, na escala de 10 anos (anosDoRisco); null = a API não trouxe o risco. */
  anos: number | null
  risco: RiscoApi | null
  /** Consumo de água da cultura no ciclo (Kc × ET0), mm; null sem clima ou sem Kc. */
  consumo: number | null
  /** Chuva média na janela da safra, mm; null sem clima. */
  chuva: number | null
  /** Dados de entrada exibidos na memória de cálculo. */
  calc: {
    kc: [number, number, number] | null
    /** Fração do ciclo em cada fase (I a IV) e de onde veio (estágios FAO-56 da API ou a proporção padrão). */
    fases: Fracoes
    fonteFases: 'api' | 'local'
    decendios: CalcDecendio[]
    /** Origem das datas e do ciclo (API); null no conjunto local. */
    calendario: CropCalendarInfo | null
  }
}
/** anos: o da safra mais arriscada (a API dá o risco por cultura); null se alguma safra não tem risco. */
export type ResRotacao = { anos: number | null; safras: ResSafra[] }
export type Resiliencia = {
  rotacoes: ResRotacao[]
  /** Período do clima histórico ('' sem clima). */
  periodo: string
  nSafras: number
  fonte: string
  aviso: string
  celula: { lat: number; lon: number } | null
  textura: Textura | null
}

function riscoApi(s: SafraDef): RiscoApi | null {
  const r = s.risco
  if (!r || r.risk_percentage == null) return null
  const m = r.mean_isna
  return {
    pct: r.risk_percentage, perda: r.estimated_yield_loss_pct, limiar: r.loss_threshold_pct,
    fase: r.critical_stage ? ESTAGIO_FASE[r.critical_stage] : null,
    isna: [m.initial, m.development, m.mid_season, m.late_season], anosValidos: r.valid_years, metodo: r.method,
    isnaCiclo: r.mean_season_isna ?? null,
  }
}

const rotuloPadrao = (idx: number) => `${diasDe(idx)} ${MONTHS_SHORT[mesDe(idx)].toLowerCase()}`
const somaOuNulo = (v: (number | null)[]) =>
  v.length && v.every(x => x != null) ? Math.round((v as number[]).reduce((a, b) => a + b, 0)) : null

function safra(s: SafraDef, dec: Decendio[] | null): ResSafra {
  const fases = s.fases ?? FASES
  const kc = s.kc ?? null
  const decendios: CalcDecendio[] = []
  for (let i = s.de; i <= s.ate; i++) {
    const t = (i - s.de + 0.5) / (s.ate - s.de + 1)
    const d = dec?.[i]
    const k = kc ? kcNoCiclo(kc, t, fases) : null
    const et0 = d?.et0_media ?? null
    decendios.push({
      idx: i, rotulo: d?.rotulo ?? rotuloPadrao(i), fase: faseNoCiclo(t, fases),
      chuvaMedia: d?.chuva_media ?? null, chuvaP20: d?.chuva_p20 ?? null, et0,
      kc: k, consumo: k != null && et0 != null ? k * et0 : null,
    })
  }
  const risco = riscoApi(s)
  return {
    nome: s.nome, ref: s.ref, cobertura: !!s.cobertura, de: s.de, ate: s.ate,
    anos: risco ? anosDoRisco(risco.pct) : null, risco,
    consumo: somaOuNulo(decendios.map(d => d.consumo)),
    chuva: somaOuNulo(decendios.map(d => d.chuvaMedia)),
    calc: { kc, fases, fonteFases: s.fases ? 'api' : 'local', decendios, calendario: s.calendario ?? null },
  }
}

/** Resiliência das rotações; o clima é opcional (só entra no consumo e na chuva da janela). */
export function resiliencia(clima: ClimaDecendios | null, textura: Textura | null, rotacoesDef: SafraDef[][]): Resiliencia {
  const rotacoes: ResRotacao[] = rotacoesDef.map(defs => {
    const safras = defs.map(s => safra(s, clima?.decendios ?? null))
    const anos = safras.some(s => s.anos == null) ? null : Math.min(...safras.map(s => s.anos as number))
    return { anos, safras }
  })
  const h = clima?.safras ?? []
  return {
    rotacoes,
    periodo: h.length ? `${h[0]} a ${h.at(-1)}` : '',
    nSafras: h.length,
    fonte: clima?.fonte ?? '',
    aviso: clima?.aviso_resolucao ?? '',
    celula: clima ? { lat: clima.celula.lat, lon: clima.celula.lon } : null,
    textura,
  }
}
