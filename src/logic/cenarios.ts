// Textos do cenário de clima. O cenário é apresentado como um ajuste do clima atual, sem ano: o rótulo vem pelo id
// (PT e EN), e a descrição em português é montada dos números (delta_temp_c, rain_change_pct, onset_delay_days), que
// mudam quando entrarem os valores oficiais; em inglês, vale a description da API. Id que o front não conhece: o
// label da API sem o prefixo de ano ("2030: warmer" → "Warmer").
import type { ClimateScenarioInfo } from '../types'
import { idioma, numero } from '../i18n'
import { CENARIO_PADRAO } from '../services/cenarios'

const ROTULOS_PT: Record<string, string> = {
  historical: 'Média dos últimos 30 anos',
  warmer: 'Mais quente',
  warmer_drier: 'Mais quente e seco',
}
const ROTULOS_EN: Record<string, string> = {
  historical: 'Last 30 years average',
  warmer: 'Warmer',
  warmer_drier: 'Warmer and drier',
}

/** Label da API sem o ano na frente e com maiúscula inicial. */
const semAno = (label: string) => {
  const s = label.replace(/^\d{4}\s*:\s*/, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function rotuloCenario(c: ClimateScenarioInfo): string {
  return (idioma() === 'pt' ? ROTULOS_PT : ROTULOS_EN)[c.id] ?? semAno(c.label)
}

/** Sinal tipográfico: "+1,5" / "−10" (menos de verdade, não hífen). */
const comSinal = (v: number) => `${v > 0 ? '+' : '−'}${numero(Math.abs(v), { maximumFractionDigits: 1 })}`

/** "+1,5 °C, −10 % de chuva, chuvas começam 10 dias depois"; partes zero ficam de fora. */
export function descricaoCenario(c: ClimateScenarioInfo): string {
  if (idioma() !== 'pt') return c.description
  const partes: string[] = []
  if (c.delta_temp_c) partes.push(`${comSinal(c.delta_temp_c)} °C`)
  if (c.rain_change_pct) partes.push(`${comSinal(c.rain_change_pct)} % de chuva`)
  const d = Math.abs(c.onset_delay_days)
  if (d) partes.push(`chuvas começam ${d} ${d === 1 ? 'dia' : 'dias'} ${c.onset_delay_days > 0 ? 'depois' : 'antes'}`)
  return partes.length ? partes.join(', ') : c.description
}

export const ehHistorico = (id: string | null | undefined) => (id ?? CENARIO_PADRAO) === CENARIO_PADRAO
