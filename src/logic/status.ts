import type { StatusResult } from '../types'
import { motivoCurto, type PeriodoCritico } from './diagnostico'
import { anosDoRisco } from './resiliencia'

const ICONS = { good:'#i-okc', warn:'#i-alert', risk:'#i-xc' }
const LV = { good:'favorável', warn:'arriscado', risk:'desfavorável' }
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Níveis do ZARC: 8+ anos em 10 (risco 20%) = favorável, 6–7 (30–40%) = arriscado, até 5 (acima de 40%) = desfavorável. */
export const classeAnos = (n: number): 'good' | 'warn' | 'risk' => (n >= 8 ? 'good' : n >= 6 ? 'warn' : 'risk')

/** Rótulo de um período crítico pelo nível dele: "Arriscado · seca na floração (abr–mai)". */
export const rotuloCritico = (p: PeriodoCritico) => `${maiuscula(LV[p.cls])} · ${motivoCurto(p)}`

/** Selo neutro da rotação com uma safra sem risco na resposta da API: sem nota, com o motivo. */
export type StatusSemCriterio = { cls: 'nd'; label: string; title: string; text: string; aria: string }
export function statusSemCriterio(crop: string): StatusSemCriterio {
  const text = `A API não trouxe o risco hídrico de ${crop}; a tela não faz estimativa própria.`
  return { cls: 'nd', label: 'Sem dado de risco', title: 'Resiliência sem dado', text, aria: `Resiliência sem dado. ${text}` }
}

/**
 * Selo da rotação no calendário: só o nível ("Clima arriscado") e o risco da API no tooltip.
 * O motivo (período que mais pesa) fica reservado ao painel direito.
 * Entrada por safra: risco hídrico da API em % (null = a API não trouxe) e o nome da cultura.
 */
export function rotationStatus(entries: [number | null, string][]): StatusResult | StatusSemCriterio {
  const sem = entries.find(e => e[0] == null)
  if (sem) return statusSemCriterio(sem[1])
  const [pct, crop] = (entries as [number, string][]).slice().sort((a, b) => b[0] - a[0])[0]
  const cls = classeAnos(anosDoRisco(pct))
  const lv = LV[cls]
  const base = `Risco hídrico de ${pct}% (${crop}), da API`
  return {
    cls, icon: ICONS[cls],
    label: `Clima ${lv}`,
    title: `Histórico ${lv}`,
    text: base,
    aria: `Clima ${lv}. ${base}, para estas culturas e datas.`,
  }
}
