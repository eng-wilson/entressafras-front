// Decêndios do ano agrícola: idx 0 = 1–10 set … 35 = 21–31 ago (mesma numeração da API /api/clima/decendios).
import { LEN, MONTHS } from '../data/mock'

/** Mês (0 = setembro … 11 = agosto) do decêndio. */
export const mesDe = (idx: number) => Math.floor(idx / 3)

/** Posição do decêndio dentro do mês: 0, 1 ou 2. */
export const decendioDoMes = (idx: number) => idx % 3

/** Os três decêndios de um mês. */
export const idxDoMes = (m: number): [number, number, number] => [3 * m, 3 * m + 1, 3 * m + 2]

/** "1 a 10", "11 a 20" ou "21 a <último dia>" (fevereiro = 28). */
export function diasDe(idx: number): string {
  const d = decendioDoMes(idx)
  return d === 0 ? '1 a 10' : d === 1 ? '11 a 20' : `21 a ${LEN[mesDe(idx)]}`
}

/** "11 a 20 de dezembro". */
export const periodoLabel = (idx: number) => `${diasDe(idx)} de ${MONTHS[mesDe(idx)]}`
