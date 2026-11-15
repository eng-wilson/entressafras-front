// Recortes puros do clima por decêndio para a tela. Qualquer dado ausente vira null (nunca 0).
import type { ClimaPeriodo, Decendio } from '../types'
import { idxDoMes } from './periodo'

/** Soma; se qualquer parcela faltar, o total também falta. */
export function somaOuNull(vals: (number | null | undefined)[]): number | null {
  let s = 0
  for (const v of vals) {
    if (v == null) return null
    s += v
  }
  return s
}

/** Chuva do mês m (0 = setembro) = soma dos seus 3 decêndios. */
export function chuvaDoMes(decendios: Decendio[] | null, m: number): number | null {
  if (!decendios) return null
  return somaOuNull(idxDoMes(m).map(i => decendios[i]?.chuva_media))
}

/** Chuva dos 12 meses, de setembro a agosto. */
export const chuvaMeses = (decendios: Decendio[] | null): (number | null)[] =>
  Array.from({ length: 12 }, (_, m) => chuvaDoMes(decendios, m))

const VAZIO: ClimaPeriodo = {
  chuvaMes: null, chuvaDecendio: null, chuvaP20: null, et0: null,
  tmin: null, tmax: null, tminAbs: null, tmaxAbs: null,
}

/** Clima do decêndio simulado (idx 0–35). */
export function climaDoPeriodo(decendios: Decendio[] | null, idx: number): ClimaPeriodo {
  const d = decendios?.[idx]
  if (!d) return VAZIO
  return {
    chuvaMes: chuvaDoMes(decendios, Math.floor(idx / 3)),
    chuvaDecendio: d.chuva_media,
    chuvaP20: d.chuva_p20,
    et0: d.et0_media,
    tmin: d.tmin_media,
    tmax: d.tmax_media,
    tminAbs: d.tmin_absoluto,
    tmaxAbs: d.tmax_absoluto,
  }
}
