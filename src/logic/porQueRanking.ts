// "Por que nesta posição": explicação curta do ranking, só com dados da API. A API ordena pela média das
// prioridades ligadas nas escalas 0–100 dela (scores) — é o método que ela descreve nos avisos. Aqui só se compara
// essa média com a da rotação vizinha na lista e se aponta a escala que mais pesou; nada é estimado.
import type { RotacaoDef } from '../data/mock'
import type { Priorities, RotationScores } from '../types'
import { numero, ordinal, t } from '../i18n'

type Escala = 'water_security' | 'soil_protection' | 'productivity'
const NOME: Record<Escala, string> = {
  water_security: 'resiliência climática',
  soil_protection: 'saúde do solo',
  productivity: 'produtividade',
}
const ORDEM: Escala[] = ['water_security', 'soil_protection', 'productivity']
/** Diferença na média abaixo disso = empate técnico (a API avisa que riscos perto de zero ficam praticamente empatados). */
export const EMPATE = 1

const n1 = (v: number) => numero(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Escalas que entram na ordem: as prioridades ligadas; sem nenhuma ligada, as três. */
export function escalasDaOrdem(p: Priorities | undefined): Escala[] {
  const ligadas = ORDEM.filter(k => p?.[k] === 1)
  return ligadas.length ? ligadas : ORDEM
}

/** Média das escalas da ordem; null se alguma não veio da API. */
export function notaDaOrdem(s: RotationScores | undefined, escalas: Escala[]): number | null {
  if (!s) return null
  const v = escalas.map(k => s[k])
  return v.every((x): x is number => x != null) ? v.reduce((a, b) => a + b, 0) / v.length : null
}

const lista = (xs: string[]) => (xs.length < 2 ? xs.join('') : t('{lista} e {ultimo}', { lista: xs.slice(0, -1).join(', '), ultimo: xs.at(-1) }))

/**
 * Uma frase: a 1ª se compara com a 2ª; as demais, com a que está logo acima. Diz se é empate técnico ou por
 * quantos pontos ganha/perde, e em qual escala ligada a diferença é maior.
 */
export function porQueRanking(rots: RotacaoDef[], i: number, prioridades: Priorities | undefined): string | null {
  if (rots.length < 2) return null
  const escalas = escalasDaOrdem(prioridades)
  const j = i === 0 ? 1 : i - 1
  const a = notaDaOrdem(rots[i].scores, escalas), b = notaDaOrdem(rots[j].scores, escalas)
  if (a == null || b == null) return null
  const nomes = lista(escalas.map(k => t(NOME[k])))
  const pos = ordinal(j + 1)
  const dif = a - b
  if (Math.abs(dif) < EMPATE) {
    return t('Empate técnico com a {pos}: {a} contra {b} na média de {escalas}. A ordem entre elas pode mudar com pequenas variações.',
      { pos, a: n1(a), b: n1(b), escalas: nomes })
  }
  // Escala ligada com a maior diferença, no sentido do resultado
  const k = escalas.reduce((m, e) => (Math.abs(rots[i].scores![e]! - rots[j].scores![e]!) > Math.abs(rots[i].scores![m]! - rots[j].scores![m]!) ? e : m), escalas[0])
  const x = rots[i].scores![k]!, y = rots[j].scores![k]!
  const motivo = escalas.length > 1 ? t(', sobretudo em {escala} ({x} contra {y})', { escala: t(NOME[k]), x: n1(x), y: n1(y) }) : ''
  return dif > 0
    ? t('À frente da {pos} por {dif} pontos na média de {escalas}{motivo}.', { pos, dif: n1(dif), escalas: nomes, motivo })
    : t('Atrás da {pos} por {dif} pontos na média de {escalas}{motivo}.', { pos, dif: n1(-dif), escalas: nomes, motivo })
}
