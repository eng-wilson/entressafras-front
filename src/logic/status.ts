import type { StatusResult } from '../types'
import { motivoCurto, type PeriodoCritico } from './diagnostico'
import { segurancaDoRisco } from './resiliencia'
import { pctFmt, t } from '../i18n'

const ICONS = { good:'#i-okc', warn:'#i-alert', risk:'#i-xc' }
/** Nível pelo risco, no idioma da tela: "Favorável", "Arriscado", "Desfavorável". */
const nivel = (cls: 'good' | 'warn' | 'risk') =>
  cls === 'good' ? t('Favorável') : cls === 'warn' ? t('Arriscado') : t('Desfavorável')

/**
 * Régua única do app, a mesma das prioridades, sobre a segurança hídrica (100 − risco da API):
 * 70+ = favorável, 40–69 = arriscado, abaixo de 40 = desfavorável.
 */
export const classeSeguranca = (v: number): 'good' | 'warn' | 'risk' => (v >= 70 ? 'good' : v >= 40 ? 'warn' : 'risk')

/** Rótulo de um período crítico pelo nível dele: "Arriscado · seca na floração (abr–mai)". */
export const rotuloCritico = (p: PeriodoCritico) => `${nivel(p.cls)} · ${motivoCurto(p)}`

/** Selo neutro da rotação com uma safra sem risco na resposta da API: sem nota, com o motivo. */
export type StatusSemCriterio = { cls: 'nd'; label: string; title: string; text: string; aria: string }
export function statusSemCriterio(crop: string): StatusSemCriterio {
  const text = t('Sem risco hídrico calculado para {cultura}.', { cultura: t(crop) })
  return { cls: 'nd', label: t('Sem dado de risco'), title: t('Resiliência sem dado'), text, aria: t('Resiliência sem dado. {texto}', { texto: text }) }
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
  const cls = classeSeguranca(segurancaDoRisco(pct))
  const base = t('Risco hídrico de {pct}% ({cultura})', { pct: pctFmt(pct), cultura: t(crop) })
  const label = cls === 'good' ? t('Clima favorável') : cls === 'warn' ? t('Clima arriscado') : t('Clima desfavorável')
  return {
    cls, icon: ICONS[cls],
    label,
    title: cls === 'good' ? t('Histórico favorável') : cls === 'warn' ? t('Histórico arriscado') : t('Histórico desfavorável'),
    text: base,
    aria: t('{rotulo}. {base}, para estas culturas e datas.', { rotulo: label, base }),
  }
}
