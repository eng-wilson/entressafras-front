import { describe, expect, it } from 'vitest'
import { SAFRAS, STAGES } from '../data/mock'
import { estagioEm, estagios } from './estagios'

const sem = (l: ReturnType<typeof estagios>) => l.map(({ crop, k, name, from, to }) => ({ crop, k, name, from, to }))

describe('estagios', () => {
  it('reproduz os estágios escritos à mão da rotação atual', () => {
    expect(sem(estagios(SAFRAS[3]))).toEqual(STAGES)
  })

  it('cobre os 36 decêndios, sem buraco nem sobreposição, em todas as rotações', () => {
    for (const safras of SAFRAS) {
      const l = estagios(safras)
      expect(l[0].from).toBe(0)
      expect(l.at(-1)!.to).toBe(35)
      for (let i = 1; i < l.length; i++) expect(l[i].from).toBe(l[i - 1].to + 1)
    }
  })

  it('guarda a cultura real da safra e desenha as gramíneas como milho', () => {
    const sorgo = estagioEm(estagios(SAFRAS[1]), 23)
    expect(sorgo).toMatchObject({ crop: 'milho', ref: 'sorgo', cultura: 'Sorgo', k: 'ench' })
    expect(estagioEm(estagios(SAFRAS[1]), 33)).toMatchObject({ crop: null, k: 'bare' })
  })
})
