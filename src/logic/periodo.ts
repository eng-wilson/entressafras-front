// Decêndios do ano agrícola: idx 0 = 1–10 set … 35 = 21–31 ago (mesma numeração da API /api/clima/decendios).
import { LEN, MONTHS, MONTHS_SHORT } from '../data/mock'
import { idioma, t } from '../i18n'

/** Mês (0 = setembro … 11 = agosto) do decêndio. */
export const mesDe = (idx: number) => Math.floor(idx / 3)

/** Posição do decêndio dentro do mês: 0, 1 ou 2. */
export const decendioDoMes = (idx: number) => idx % 3

/** Os três decêndios de um mês. */
export const idxDoMes = (m: number): [number, number, number] => [3 * m, 3 * m + 1, 3 * m + 2]

/** "1 a 10", "11 a 20" ou "21 a <último dia>" (fevereiro = 28). */
export function diasDe(idx: number): string {
  const d = decendioDoMes(idx)
  return d === 0 ? t('1 a 10') : d === 1 ? t('11 a 20') : t('21 a {fim}', { fim: LEN[mesDe(idx)] })
}

/** "11 a 20 de dezembro". */
export const periodoLabel = (idx: number) => t('{dias} de {mes}', { dias: diasDe(idx), mes: t(MONTHS[mesDe(idx)]) })

/** Mês curto (0 = setembro) para meio de frase: "out" em português, "Oct" em inglês. */
export const mesCurtoDe = (m: number) => (idioma() === 'pt' ? MONTHS_SHORT[m].toLowerCase() : t(MONTHS_SHORT[m]))
const mesCurto = (idx: number) => mesCurtoDe(mesDe(idx))
/** Primeiro dia do decêndio: "21 out". */
export const inicioDe = (idx: number) => t('{dia} {mes}', { dia: decendioDoMes(idx) * 10 + 1, mes: mesCurto(idx) })
/** Último dia do decêndio: "10 fev", "31 jan". */
export const fimDe = (idx: number) =>
  t('{dia} {mes}', { dia: decendioDoMes(idx) === 2 ? LEN[mesDe(idx)] : decendioDoMes(idx) * 10 + 10, mes: mesCurto(idx) })
/** "21 out a 10 fev": do 1º dia do decêndio `de` ao último do decêndio `ate`. */
export const janelaLabel = (de: number, ate: number) => t('{de} a {ate}', { de: inicioDe(de), ate: fimDe(ate) })
