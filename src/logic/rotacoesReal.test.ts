import { describe, expect, it } from 'vitest'
import { ROTACOES_REAL_FIXTURE } from '../data/rotacoesRealFixture'
import { rotacoesValidas } from '../services/rotacoes'
import { conjuntoDaApi, nomeRotacao } from './rotacoesApi'
import { resiliencia } from './resiliencia'
import { atencaoCiclo } from './atencaoCiclo'
import { soilGauge } from './soilGauge'

const conj = conjuntoDaApi(ROTACOES_REAL_FIXTURE)
const res = resiliencia(null, null, conj.rotacoes.map(r => r.safras))

describe('resposta real da API (15/11/2026)', () => {
  it('passa na validação e mantém a ordem do rank', () => {
    expect(rotacoesValidas(ROTACOES_REAL_FIXTURE)).toBe(true)
    expect(conj.rotacoes.map(r => r.id)).toEqual(ROTACOES_FIXTURE_IDS)
  })

  it('nomes em português pelo catálogo local, sem nomes comuns em inglês', () => {
    expect(conj.rotacoes.map(nomeRotacao)).toEqual([
      'Feijão-caupi depois girassol', 'Feijão-caupi depois sorgo', 'Feijão-caupi depois milho safrinha', 'Soja depois girassol',
    ])
    expect(conj.rotacoes[0].safras.map(s => s.ref)).toEqual(['feijao_caupi', 'girassol'])
  })

  it('risco calculado (não MOCK): nada aparece como provisório', () => {
    expect(conj.avisos.some(a => /\bMOCK\b/.test(a))).toBe(false)
    expect(res.rotacoes.every(r => r.safras.every(s => s.risco?.metodo === 'FAO56_SIMPLIFIED_KY'))).toBe(true)
    expect(atencaoCiclo(res.rotacoes[0], conj.rotacoes[0].safras).provisorio).toBe(false)
    expect(soilGauge(0.9, true, false).unit).not.toContain('provisório')
  })

  it('traz prioridades usadas, solo, propriedades do SoilGrids e calendário regional', () => {
    expect(conj.prioridades).toEqual({ productivity: 0, water_security: 1, soil_protection: 1, revenue: 0 })
    expect(conj.solo).toMatchObject({ source: 'REQUEST_TEXTURE_CLASS', texture_class: 'clayey' })
    expect(conj.propriedadesSolo).toMatchObject({ source: 'SOILGRIDS', clay_pct: 24.7 })
    expect(conj.rotacoes[3].safras[0].calendario).toMatchObject({ source: 'GGCMI_PHASE3_V1_01', data_source: 'Brazil CONAB' })
    expect(conj.rotacoes[3].protecaoSolo).toMatchObject({ includes_history: true, family_changes: 3, transitions: 3 })
  })
})

const ROTACOES_FIXTURE_IDS = ROTACOES_REAL_FIXTURE.rotations.slice().sort((a, b) => a.rank - b.rank).map(r => r.id)
