import { SCORE } from '../data/mock'
import type { Priority } from '../types'

// Retorna rpos[4]: rpos[i] é a posição (0=1º, 3=último) da rotação i
export function rankRotations(pr: Priority): number[] {
  const act = (['risco','agua','solo','prod'] as const).filter(k => pr[k])
  const keys = act.length ? act : ['risco' as const]
  const pts = [0,1,2,3].map(i =>
    keys.reduce((a, k) => a + [0,1,2,3].filter(j => SCORE[k][j] < SCORE[k][i]).length, 0)
  )
  const ordered = [0,1,2,3].sort((a,b) => (pts[a] - pts[b]) || (SCORE.risco[a] - SCORE.risco[b]))
  const rpos = [0,0,0,0]
  ordered.forEach((ri, p) => { rpos[ri] = p })
  return rpos
}
