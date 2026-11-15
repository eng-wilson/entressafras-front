// Geometria do contorno do talhão em latitude e longitude (graus). Projeção equirretangular local em torno
// do centro do polígono: erro desprezível para talhões de até alguns quilômetros.
// Portado de entressafras/src/utils/geo.js.
import type { Contorno, Ponto } from '../types'
import { numero } from '../i18n'

const R = 6371008.8 // raio médio da Terra, m
const RAD = Math.PI / 180

function projetar(contorno: Contorno) {
  const lat0 = contorno.reduce((a, p) => a + p[0], 0) / contorno.length
  const lon0 = contorno.reduce((a, p) => a + p[1], 0) / contorno.length
  const k = Math.cos(lat0 * RAD)
  const pts = contorno.map(([la, lo]) => [R * (lo - lon0) * RAD * k, R * (la - lat0) * RAD] as const)
  return { lat0, lon0, k, pts }
}

function areaAssinada(pts: readonly (readonly [number, number])[]) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

/** Área em hectares (0 com menos de 3 pontos). */
export function areaHa(contorno: Contorno): number {
  if (contorno.length < 3) return 0
  return Math.abs(areaAssinada(projetar(contorno).pts)) / 1e4
}

/** Centro de área do polígono. */
export function centroide(contorno: Contorno): Ponto {
  if (!contorno.length) throw new Error('centroide: contorno vazio')
  const { lat0, lon0, k, pts } = projetar(contorno)
  const A = areaAssinada(pts)
  if (pts.length < 3 || Math.abs(A) < 1e-6) return { lat: lat0, lon: lon0 }
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const f = x1 * y2 - x2 * y1
    cx += (x1 + x2) * f
    cy += (y1 + y2) * f
  }
  cx /= 6 * A
  cy /= 6 * A
  return { lat: lat0 + cy / R / RAD, lon: lon0 + cx / (R * k) / RAD }
}

const area = (ha: number) => numero(ha, ha < 10 ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : { maximumFractionDigits: 0 })

/** "≈ 4,3 ha" abaixo de 10 ha; "≈ 43 ha" acima. */
export const fmtHa = (ha: number) => `≈ ${area(ha)} ha`

/** "42 ha" (sem o ≈), para a Sidebar. */
export const fmtHaCurto = (ha: number) => `${area(ha)} ha`

/** "-17,95°, -51,05°" — usado quando não há nome de cidade. */
const coord = (v: number) => numero(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtCoord = (p: Ponto) => `${coord(p.lat)}°, ${coord(p.lon)}°`
