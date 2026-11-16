// Diagnóstico da resiliência: onde, no ciclo, está o risco de cada rotação.
//
// Não calcula risco: usa o risco hídrico e a fase crítica (`critical_stage`) que a API entrega para cada cultura,
// e as fases no calendário (estágios FAO-56 da API) que resiliencia.ts organizou.
// Documentação: docs/PERIODOS_CRITICOS.md.
import { NOME_FASE } from '../data/fases'
import { janelaLabel, mesCurtoDe, mesDe } from './periodo'
import { pctFmt, t } from '../i18n'
import type { Fase, ResRotacao } from './resiliencia'
import { classeSeguranca } from './status'

/**
 * Fase crítica apontada pela API numa safra que não é favorável (segurança hídrica abaixo de 70, a régua do app).
 * Numa safra favorável, a fase crítica da API não vira período crítico na tela.
 */
export type PeriodoCritico = {
  /** Índice da safra em `rot.safras` (0 = 1ª safra). */
  safra: number
  nome: string
  fase: Fase
  nomeFase: string
  /** Primeiro e último decêndio da fase (0 = 1–10 set), inclusivos. */
  de: number
  ate: number
  /** "21 abr a 31 mai". */
  rotulo: string
  /** Risco hídrico da API, %: safras históricas com perda crítica. */
  pct: number
  /** Nível da safra pela segurança hídrica (100 − risco da API), na régua única do app. */
  cls: 'good' | 'warn' | 'risk'
  /** ISNA médio da fase, da API (0–1). */
  isna: number | null
  /** Consumo da cultura menos a chuva na fase, mm (ano médio e ano seco); null sem clima. Positivo = faltou chuva. */
  deficitMedio: number | null
  deficitSeco: number | null
}

export type Diagnostico = {
  /** Índice da safra que menos vezes teve chuva suficiente. */
  limitante: number
  /** Períodos críticos de todas as safras, em ordem no ciclo; vazio quando todas as safras são favoráveis. */
  criticos: PeriodoCritico[]
  /**
   * O período que mais pesa no selo; null quando todas as safras são favoráveis. O selo da rotação é o nível da
   * safra mais fraca, então vale: a fase da safra com menos anos bons que mais reprovou (empate: a de maior
   * déficit no ano seco, depois a primeira no ciclo).
   */
  decisivo: PeriodoCritico | null
}

export function diagnostico(rot: ResRotacao): Diagnostico {
  const criticos: PeriodoCritico[] = []
  rot.safras.forEach((s, si) => {
    // Só o que a API diz: safra com risco não favorável e com a fase crítica informada.
    const r = s.risco
    if (s.seguranca == null || !r || classeSeguranca(s.seguranca) === 'good' || r.fase == null || r.pct <= 0) return
    const f = r.fase
    const decs = s.calc.decendios.filter(d => d.fase === f)
    if (!decs.length) return
    const de = decs[0].idx, ate = decs[decs.length - 1].idx
    const soma = (k: 'consumo' | 'chuvaMedia' | 'chuvaP20') => {
      const v = decs.map(d => d[k])
      return v.every(x => x != null) ? (v as number[]).reduce((a, b) => a + b, 0) : null
    }
    const consumo = soma('consumo'), media = soma('chuvaMedia'), seco = soma('chuvaP20')
    criticos.push({
      safra: si, nome: s.nome, fase: f, nomeFase: NOME_FASE[f], de, ate, rotulo: janelaLabel(de, ate),
      cls: classeSeguranca(s.seguranca), pct: r.pct, isna: r.isna[f],
      deficitMedio: consumo != null && media != null ? Math.round(consumo - media) : null,
      deficitSeco: consumo != null && seco != null ? Math.round(consumo - seco) : null,
    })
  })
  criticos.sort((a, b) => a.de - b.de)
  const seguranca = (p: PeriodoCritico) => rot.safras[p.safra].seguranca ?? 100
  const decisivo = [...criticos].sort((a, b) =>
    seguranca(a) - seguranca(b) || (b.deficitSeco ?? 0) - (a.deficitSeco ?? 0) || a.de - b.de)[0] ?? null
  const limitante = rot.safras.reduce((m, s, i) => ((s.seguranca ?? -1) < (rot.safras[m].seguranca ?? -1) ? i : m), 0)
  return { limitante, criticos, decisivo }
}

/** Decêndio para onde a simulação pula ao selecionar a rotação: início do período decisivo; null se não há. */
export const periodoDecisivo = (d: Diagnostico | null): number | null => d?.decisivo?.de ?? null

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Frequência do problema, pela API: "risco hídrico de 30% (API), maior déficit de água nesta fase". */
const frequencia = (p: PeriodoCritico) => t('risco hídrico de {pct}%, maior déficit de água nesta fase', { pct: pctFmt(p.pct) })

/** "Milho safrinha, floração e enchimento de grãos (21 abr a 31 mai): risco hídrico de 30% (API), ..." */
export const textoCritico = (p: PeriodoCritico): string =>
  t('{cultura}, {fase} ({periodo}): {frequencia}.', { cultura: t(p.nome), fase: minuscula(t(p.nomeFase)), periodo: p.rotulo, frequencia: frequencia(p) })

const ARTIGO = ['no', 'no', 'na', 'na'] as const
/** "Período crítico na floração e enchimento de grãos (21 abr a 31 mai): risco hídrico de 30% (API), ..." */
export const textoFase = (p: PeriodoCritico): string => {
  const v = { fase: minuscula(t(p.nomeFase)), periodo: p.rotulo, frequencia: frequencia(p) }
  return ARTIGO[p.fase] === 'no'
    ? t('Período crítico no {fase} ({periodo}): {frequencia}.', v)
    : t('Período crítico na {fase} ({periodo}): {frequencia}.', v)
}

const mes = (idx: number) => mesCurtoDe(mesDe(idx))
/** Motivo curto, para caber no selo da linha: "seca na floração (abr–mai)". */
export const motivoCurto = (p: PeriodoCritico): string => {
  const meses = mesDe(p.de) === mesDe(p.ate) ? mes(p.de) : `${mes(p.de)}–${mes(p.ate)}`
  return [
    t('seca no estabelecimento ({meses})', { meses }),
    t('seca no crescimento ({meses})', { meses }),
    t('seca na floração ({meses})', { meses }),
    t('seca na maturação ({meses})', { meses }),
  ][p.fase]
}

/**
 * O que a falta de água costuma causar em cada fase (efeito agronômico geral, não calculado aqui).
 * Mostrado no chip do talhão quando o decêndio simulado cai num período crítico.
 */
export const PROBLEMA_FASE = [
  'Sem água, as sementes não germinam por igual e o estande fica falho; pode ser preciso replantar.',
  'Sem água, a planta cresce menos e cobre menos o solo.',
  'Sem água, flores abortam e os grãos ficam leves: é a fase em que a produção mais cai.',
  'Sem água, os grãos podem não terminar de encher.',
] as const

/** Período crítico que contém o decêndio; o que mais pesa tem prioridade. */
export const criticoEm = (d: Diagnostico | null, idx: number): PeriodoCritico | null => {
  if (!d) return null
  const dentro = (p: PeriodoCritico) => idx >= p.de && idx <= p.ate
  return d.decisivo && dentro(d.decisivo) ? d.decisivo : d.criticos.find(dentro) ?? null
}

/** Legenda do chip: o problema da fase e com que frequência faltou água nela. */
export const legendaCritico = (p: PeriodoCritico): string =>
  t('{problema} Risco hídrico de {pct}%, com o maior déficit de água nesta fase.', { problema: t(PROBLEMA_FASE[p.fase]), pct: pctFmt(p.pct) })
