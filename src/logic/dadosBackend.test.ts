import { describe, expect, it } from 'vitest'
import { atualizarDoc, avaliar, tabela } from '../../scripts/dados-backend.mjs'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { CULTURAS_FIXTURE } from '../data/culturasFixture'
import { climaDeMock } from '../data/climaFixture'

const base = {
  openapi: { paths: { '/api/clima/decendios': {}, '/api/clima/diario': {}, '/api/rotations/recommendations': {} } },
  decendios: climaDeMock(),
  cultura: { ...CULTURAS_FIXTURE[0], water_requirements: ROTACOES_FIXTURE.rotations[0].crops[0].crop.water_requirements },
  rotacoes: ROTACOES_FIXTURE,
}
const situacao = (a: typeof base, dado: string) => avaliar(a).find(i => i.dado === dado)!.situacao

describe('cobertura dos dados pelo backend', () => {
  it('marca como real o que a API serve e o front usa', () => {
    expect(situacao(base, 'Kc por cultura')).toBe('real_uso')
    expect(situacao(base, 'Janelas de plantio e colheita')).toBe('real_uso')
  })

  it('MOCK no backend não conta como real; vira real sozinho quando o método muda', () => {
    expect(situacao(base, 'Risco hídrico por cultura')).toBe('mock')
    expect(situacao(base, 'Ordem (rank) das rotações')).toBe('mock')
    const calculado = structuredClone(ROTACOES_FIXTURE)
    calculado.warnings = []
    for (const r of calculado.rotations) for (const c of r.crops) c.crop.risk.method = 'FAO56_SIMPLIFIED_KY'
    const a = { ...base, rotacoes: calculado }
    expect(situacao(a, 'Risco hídrico por cultura')).toBe('real_uso')
    expect(situacao(a, 'Ordem (rank) das rotações')).toBe('real_uso')
  })

  it('estágios e raízes servidos pela API contam como reais em uso', () => {
    expect(situacao(base, 'Duração dos estágios por cultura')).toBe('real_uso')
    expect(situacao(base, 'Profundidade das raízes')).toBe('real_uso')
    const sem = { ...base, cultura: { ...base.cultura, water_requirements: null } }
    expect(situacao(sem, 'Profundidade das raízes')).toBe('nenhum')
  })

  it('API fora do ar: nada é dado como real', () => {
    expect(avaliar({}).every(i => i.situacao === 'nenhum')).toBe(true)
  })

  it('reescreve só o bloco entre os marcadores', () => {
    const bloco1 = tabela(avaliar(base), '01/01/2026')
    const doc = atualizarDoc('# Plano\n\n## Dependências futuras do backend\n\nfim\n', bloco1)
    expect(doc).toMatch(/## Cobertura dos dados pelo backend\n\n<!-- dados-backend:inicio -->/)
    const doc2 = atualizarDoc(doc, tabela(avaliar({}), '02/01/2026'))
    expect(doc2.match(/dados-backend:inicio/g)).toHaveLength(1)
    expect(doc2).toContain('0 reais em uso')
    expect(doc2).toContain('## Dependências futuras do backend\n\nfim')
  })
})
