import { describe, it, expect } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { conjuntoDaApi } from './rotacoesApi'
import { rankRotations } from './rank'

describe('rankRotations', () => {
  it('segue o rank da API, sem reordenar no front', () => {
    const conj = conjuntoDaApi(ROTACOES_FIXTURE)
    expect(rankRotations(conj.rotacoes)).toEqual([0, 1, 2, 3])
  })

  it('a resposta fora de ordem é ordenada pelo rank antes de chegar à tela', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations.reverse()
    const conj = conjuntoDaApi(r)
    expect(conj.rotacoes.map(x => x.id)).toEqual(ROTACOES_FIXTURE.rotations.map(x => x.id))
    expect(rankRotations(conj.rotacoes)).toEqual([0, 1, 2, 3])
  })
})
