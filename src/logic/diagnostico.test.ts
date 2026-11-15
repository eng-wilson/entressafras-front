import { describe, expect, it } from 'vitest'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { climaDeMock } from '../data/climaFixture'
import { conjuntoDaApi } from './rotacoesApi'
import { resiliencia } from './resiliencia'
import { criticoEm, diagnostico, legendaCritico, periodoDecisivo, textoCritico } from './diagnostico'

const conj = conjuntoDaApi(ROTACOES_FIXTURE)
const rotacoes = (clima = true) => resiliencia(clima ? climaDeMock() : null, 'medio', conj.rotacoes.map(r => r.safras)).rotacoes

describe('diagnostico (fase crítica da API)', () => {
  it('safras favoráveis (risco até 20%) não geram período crítico', () => {
    const [milheto, sorgo] = rotacoes().map(diagnostico)
    expect(milheto.criticos).toEqual([])
    expect(sorgo.criticos).toEqual([])
    expect(milheto.decisivo).toBeNull()
    expect(periodoDecisivo(milheto)).toBeNull()
  })

  it('o período crítico é a fase que a API aponta, com o risco dela', () => {
    const rot = rotacoes()[2]
    const d = diagnostico(rot)
    expect(d.criticos).toHaveLength(1)
    const p = d.criticos[0]
    expect(p).toMatchObject({ safra: 1, nome: 'Milho safrinha', fase: 2, pct: 45, cls: 'warn', isna: 0.66 })
    // A fase III no calendário vem dos estágios FAO-56 da API
    expect(rot.safras[1].calc.decendios.filter(x => x.fase === 2).map(x => x.idx)).toEqual(
      Array.from({ length: p.ate - p.de + 1 }, (_, i) => p.de + i))
    expect(textoCritico(p)).toMatch(/^Milho safrinha, floração e enchimento de grãos \(.+\): risco hídrico de 45% \(API\)/)
    expect(d.limitante).toBe(1)
  })

  it('pula para o início do período decisivo e o acha no decêndio simulado', () => {
    const d = diagnostico(rotacoes()[3])
    const p = d.decisivo!
    expect(p.nome).toBe('Algodão 2ª safra')
    expect(periodoDecisivo(d)).toBe(p.de)
    expect(criticoEm(d, p.de)).toBe(p)
    expect(criticoEm(d, 0)).toBeNull()
    expect(legendaCritico(p)).toMatch(/flores abortam.*Risco hídrico de 40% \(API\)/)
  })

  it('sem clima, o período existe (vem da API) e os déficits ficam sem dado', () => {
    const p = diagnostico(rotacoes(false)[2]).criticos[0]
    expect(p.fase).toBe(2)
    expect(p.deficitMedio).toBeNull()
    expect(p.deficitSeco).toBeNull()
  })
})
