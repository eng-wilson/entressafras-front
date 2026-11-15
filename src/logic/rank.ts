import type { RotacaoDef } from '../data/mock'

/**
 * rpos[i] é a posição (0 = 1º) da rotação i. A ordem é a da API (`rank` de POST /api/rotations/recommendations):
 * o conjunto já chega ordenado por ela (logic/rotacoesApi.ts). Regra do projeto: quando a API resolve algo que a
 * tela mostra, o front não recalcula. As prioridades marcadas na lateral só destacam o mapa de aptidão.
 */
export function rankRotations(defs: RotacaoDef[]): number[] {
  return defs.map((_, i) => i)
}
