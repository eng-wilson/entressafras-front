// Avisos da API sobre o local: quando o solo ou o clima não são do talhão (a fonte externa não respondeu e a API
// usou o ponto guardado mais próximo, ou assumiu textura média). Vêm em `warnings` (texto em inglês do backend,
// app/api/routes/rotations.py) e nas distâncias do solo amostrado; aqui viram alertas curtos para a tela.
import type { SoilInfo, SoilProperties } from '../types'
import { numero, t } from '../i18n'

/** Acima desta distância o dado deixa de descrever o talhão e a tela avisa. */
export const LIMITE_KM = 10

export type AvisoLocal =
  | { tipo: 'solo-distante'; km: number }
  | { tipo: 'clima-distante'; km: number }
  | { tipo: 'solo-padrao' }

const km = (s: string, re: RegExp) => {
  const m = s.match(re)
  return m ? Number(m[1]) : null
}

/** Alertas do local, sem repetição: pelos avisos da API e pela distância do solo amostrado. */
export function avisosDeLocal(avisos: string[], solo?: SoilInfo | null, propriedades?: SoilProperties | null): AvisoLocal[] {
  const out: AvisoLocal[] = []
  let soloKm: number | null = null
  for (const a of avisos) {
    const s = km(a, /^SoilGrids did not answer[^]*?\(([\d.]+) km away\)/)
    if (s != null) soloKm = Math.max(soloKm ?? 0, s)
    const c = km(a, /^NASA POWER did not answer[^]*?\(([\d.]+) km away/)
    if (c != null && c > LIMITE_KM) out.push({ tipo: 'clima-distante', km: c })
    if (/^Soil estimate unavailable/.test(a)) out.push({ tipo: 'solo-padrao' })
  }
  // A distância do ponto amostrado vale mesmo sem o aviso (ex.: SoilGrids respondeu com um pixel longe)
  for (const d of [solo?.distance_km, propriedades?.distance_km]) if (d != null) soloKm = Math.max(soloKm ?? 0, d)
  if (soloKm != null && soloKm > LIMITE_KM) out.unshift({ tipo: 'solo-distante', km: soloKm })
  return out
}

const fmtKm = (v: number) => numero(v, { maximumFractionDigits: v < 100 ? 1 : 0 })

/** Texto curto do alerta, no idioma da tela. */
export function textoAvisoLocal(a: AvisoLocal): string {
  if (a.tipo === 'solo-distante') return t('Solo estimado de um ponto a {km} km do talhão. Informe a textura se não for parecida.', { km: fmtKm(a.km) })
  if (a.tipo === 'clima-distante') return t('Clima de outra região, a {km} km do talhão: os riscos descrevem aquela região.', { km: fmtKm(a.km) })
  return t('Solo do local indisponível: a API assumiu textura média. Informe a textura do solo.')
}
