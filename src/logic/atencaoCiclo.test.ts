import { describe, it, expect } from 'vitest'
import { atencaoCiclo, estadoAgua } from './atencaoCiclo'
import { resiliencia } from './resiliencia'
import { conjuntoDaApi } from './rotacoesApi'
import { soilGauge } from './soilGauge'
import { ROTACOES_FIXTURE } from '../data/rotacoesFixture'
import { CONJUNTO_LOCAL } from '../data/mock'

const conj = conjuntoDaApi(ROTACOES_FIXTURE)
const res = resiliencia(null, null, conj.rotacoes.map(r => r.safras))
const panorama = (i: number) => atencaoCiclo(res.rotacoes[i], conj.rotacoes[i].safras)

describe('atendimento à demanda por fase (API)', () => {
  it('cada decêndio da safra lê o ISNA médio da fase em que está, sem cálculo local', () => {
    const p = panorama(2) // soja → milho safrinha
    const milho = res.rotacoes[2].safras[1]
    for (const d of milho.calc.decendios) {
      const q = p.quadros[d.idx]
      expect(q.fase).toBe(d.fase)
      expect(q.atendimento).toBe(milho.risco!.isna[d.fase])
    }
    // Fora das safras: sem dado, nunca zero
    expect(p.quadros[0]).toMatchObject({ atendimento: null, estado: 'none', safra: -1 })
  })

  it('aponta a fase com atendimento baixo mesmo quando o risco geral da rotação é favorável', () => {
    // Soja → milheto é favorável (risco 20%), mas a fase III do milheto tem ISNA 0,75 e a IV 0,70 (bom);
    // algodão: fase IV com ISNA 0,50 → atenção; fase III 0,60 → bom
    const algodao = panorama(3)
    expect(algodao.momentos.map(m => [m.cultura, m.nomeFase, m.estado, m.menorAtendimento])).toEqual([
      ['Algodão 2ª safra', 'Maturação', 'warn', 0.5],
    ])
    expect(algodao.momentos[0].acao).toContain('Confirme a maturidade')
  })

  it('agrupa os decêndios da mesma fase num só momento e marca a fase crítica da API', () => {
    const r = structuredClone(ROTACOES_FIXTURE)
    r.rotations[2].crops[1].crop.risk.mean_isna.mid_season = 0.4
    const c = conjuntoDaApi(r)
    const rr = resiliencia(null, null, c.rotacoes.map(x => x.safras))
    const p = atencaoCiclo(rr.rotacoes[2], c.rotacoes[2].safras)
    const fase3 = rr.rotacoes[2].safras[1].calc.decendios.filter(d => d.fase === 2)
    const m = p.momentos.find(x => x.fase === 2)!
    expect([m.de, m.ate]).toEqual([fase3[0].idx, fase3.at(-1)!.idx])
    expect(m).toMatchObject({ estado: 'risk', critica: true, sensivel: true }) // milho: Ky 1,5 na fase de meio
  })

  it('sensibilidade pelo Ky da API: Ky ≥ 1 sensível, abaixo disso não', () => {
    const p = panorama(2)
    const ky = conj.rotacoes[2].safras[1].ky!
    for (const q of p.quadros.filter(x => x.safra === 1 && x.fase != null)) expect(q.sensivel).toBe((ky[q.fase!] ?? 0) >= 1)
  })

  it('sem risco na resposta, tudo fica sem dado (sem estimativa local) e o widget fica neutro', () => {
    const local = atencaoCiclo(resiliencia(null, null, CONJUNTO_LOCAL.rotacoes.map(r => r.safras)).rotacoes[0], CONJUNTO_LOCAL.rotacoes[0].safras)
    expect(local.quadros.every(q => q.atendimento === null)).toBe(true)
    expect(local.momentos).toEqual([])
    expect(soilGauge(null, true)).toMatchObject({ semDado: true, label: 'Sem dado' })
    expect(atencaoCiclo(null, conj.rotacoes[0].safras).quadros.every(q => q.estado === 'none')).toBe(true)
  })

  it('marca provisório quando o servidor avisa MOCK, inclusive no widget', () => {
    expect(panorama(0).provisorio).toBe(true)
    expect(soilGauge(0.5, true, true).unit).toContain('provisório')
    expect(soilGauge(0.5, true).unit).toBe('ETa ÷ ETc · fase, média da API')
  })

  it('limiares de apresentação: crítico abaixo de 45%, atenção até 55%', () => {
    expect([null, 0.3, 0.45, 0.54, 0.55].map(estadoAgua)).toEqual(['none', 'risk', 'warn', 'warn', 'good'])
  })
})
