import { describe, expect, it } from 'vitest'
import { SIMULACAO_FIXTURE } from '../data/simulacaoFixture'
import {
  adicionar, catalogoRascunho, aplicarResposta, arrastar, chaveFaixa, cheio, datasDe, cicloDias, classeDoRisco, corrigir422, datasCultura,
  diasDePousio, diasSemCobertura, faixaDecendio, fimDecendio, inicioDecendio, faixaDoSweep, mensagemErro, nomeCultura, pedidoCulturas,
  piorClasse, pontoDoSweep, RASCUNHO_VAZIO, remover, seloRanking, textoLimite, tituloRascunho, traduzirCheck, trocar,
  type Rascunho,
} from './rascunho'

const ANO = 2027
// Soja 21–31 out → 11–20 fev; sorgo 21–28 fev → 1–10 jun (como na fixture).
const base: Rascunho = {
  culturas: [
    { code: 1150, s: 5, e: 17, refCiclo: 100 },
    { code: 48747, s: 17, e: 28, refCiclo: 110 },
  ],
  sel: 1,
}

describe('decêndios ↔ datas', () => {
  it('converte no ano agrícola, com o último dia real do mês', () => {
    expect(inicioDecendio(0, ANO)).toBe('2027-09-01')
    expect(inicioDecendio(5, ANO)).toBe('2027-10-21')
    expect(fimDecendio(5, ANO)).toBe('2027-10-31')
    expect(fimDecendio(17, ANO)).toBe('2028-02-29') // 2028 é bissexto
    expect(fimDecendio(35, ANO)).toBe('2028-08-31')
    expect(faixaDecendio(17, 2026)).toBe('21–28 fev')
  })
  it('conta o ciclo como o backend (plantio e colheita inclusos)', () => {
    expect(cicloDias(5, 17, ANO)).toBe(123) // 21/10 a 20/02
    expect(datasCultura(base.culturas[0], ANO)).toBe('Plantio 21 out · colheita 20 fev')
  })
})

describe('nomes', () => {
  it('usa o perfil pela posição e junta com "depois"', () => {
    expect(nomeCultura(2175, 1)).toBe('Milho safrinha')
    expect(nomeCultura(9999, 0, 'cowpea')).toBe('Cowpea')
    expect(tituloRascunho(['Soja', 'Sorgo'])).toBe('Soja depois sorgo')
    expect(tituloRascunho([])).toBe('Nova rotação')
  })
})

describe('arrastar', () => {
  it('mover a 1ª não leva a 2ª; mantém o ciclo em dias e para antes do plantio da 2ª', () => {
    const r = arrastar(base, 0, 'mover', 3, ANO)
    expect(datasDe(r.rascunho.culturas[0], ANO)).toEqual({ plantio: '2027-10-01', colheita: '2028-01-31', ciclo: 123 })
    expect(r.rascunho.culturas[1]).toBe(base.culturas[1])
    const tarde = arrastar(base, 0, 'mover', 8, ANO)
    expect(tarde.rascunho).toBe(base) // 21/10 já é o último decêndio que colhe antes de 21/02
    expect(tarde.motivo).toBe('seguinte')
  })
  it('a 2ª para no fim da safra; um clique sem mudar de decêndio não arredonda as datas', () => {
    const fim = arrastar(base, 1, 'mover', 34, ANO)
    expect(datasDe(fim.rascunho.culturas[1], ANO).colheita <= '2028-08-31').toBe(true)
    expect(fim.motivo).toBe('fim')
    const exato = { ...base, culturas: [base.culturas[0], { ...base.culturas[1], plantio: '2028-02-23', ciclo: 111 }] }
    expect(arrastar(exato, 1, 'mover', exato.culturas[1].s, ANO).rascunho).toBe(exato)
  })
  it('mover a 2ª para na colheita da 1ª', () => {
    const r = arrastar(base, 1, 'mover', 10, ANO)
    expect(r.rascunho.culturas[1]).toMatchObject({ s: 17, e: 28 })
    expect(r.motivo).toBe('anterior')
    expect(textoLimite('anterior', 1, ['Soja', 'Sorgo'], base.culturas[1])).toBe('Limite: colheita de soja')
  })
  it('alças respeitam a vizinha e a faixa de 50–150% do ciclo', () => {
    const plantio = arrastar(base, 1, 'plantio', 12, ANO)
    expect(plantio.rascunho.culturas[1].s).toBe(17)
    expect(plantio.motivo).toBe('anterior')
    const curto = arrastar(base, 1, 'colheita', 18, ANO)
    expect(cicloDias(17, curto.rascunho.culturas[1].e, ANO)).toBeGreaterThanOrEqual(55)
    expect(curto.motivo).toBe('cicloMin')
    const longo = arrastar({ ...base, culturas: [base.culturas[0], { ...base.culturas[1], refCiclo: 60 }] }, 1, 'colheita', 36, ANO)
    expect(cicloDias(17, longo.rascunho.culturas[1].e, ANO)).toBeLessThanOrEqual(90)
    expect(longo.motivo).toBe('cicloMax')
  })
  it('a 1ª não passa do plantio da 2ª', () => {
    const r = arrastar(base, 0, 'colheita', 20, ANO)
    expect(r.rascunho.culturas[0].e).toBe(17)
    expect(r.motivo).toBe('seguinte')
  })
})

describe('ações e pedido', () => {
  it('adiciona até 2 culturas, sem datas para a API resolver; 1 cultura já simula (seguida de pousio)', () => {
    expect(pedidoCulturas(RASCUNHO_VAZIO, ANO)).toBeNull()
    const um = adicionar(RASCUNHO_VAZIO, 1150)
    expect(um.culturas[0]).toMatchObject({ s: 4, plantioLivre: true, colheitaLivre: true })
    expect(cheio(um)).toBe(false)
    expect(pedidoCulturas(um, ANO)).toEqual([{ code: 1150 }])
    const dois = adicionar(um, 8418)
    expect(dois.sel).toBe(1)
    expect(cheio(dois)).toBe(true)
    expect(adicionar(dois, 2175)).toBe(dois)
    expect(pedidoCulturas(dois, ANO)).toEqual([{ code: 1150 }, { code: 8418 }])
  })
  it('manda plantio e colheita das culturas definidas', () => {
    expect(pedidoCulturas(base, ANO)).toEqual([
      { code: 1150, planting_date: '2027-10-21', harvest_date: '2028-02-20' },
      { code: 48747, planting_date: '2028-02-21', harvest_date: '2028-06-10' },
    ])
  })
  it('trocar mantém o plantio e libera a colheita', () => {
    const t = trocar(base, 1, 8418)
    expect(pedidoCulturas(t, ANO)![1]).toEqual({ code: 8418, planting_date: '2028-02-21' })
  })
  it('remover passa a seleção para a anterior sem mover as vizinhas', () => {
    const r = remover(base, 1)
    expect(r).toEqual({ culturas: [base.culturas[0]], sel: 0 })
    expect(remover(r, 0)).toEqual(RASCUNHO_VAZIO)
  })
  it('a faixa de uma cultura vale enquanto não mudam o ciclo dela e as datas da outra', () => {
    const antes = pedidoCulturas(base, ANO)!
    const movido = pedidoCulturas(arrastar(base, 1, 'mover', 20, ANO).rascunho, ANO)!
    expect(chaveFaixa(movido, 1)).toBe(chaveFaixa(antes, 1))
    expect(chaveFaixa(movido, 0)).not.toBe(chaveFaixa(antes, 0))
    const ciclo = pedidoCulturas(arrastar(base, 1, 'colheita', 30, ANO).rascunho, ANO)!
    expect(chaveFaixa(ciclo, 1)).not.toBe(chaveFaixa(antes, 1))
    expect(chaveFaixa(pedidoCulturas(trocar(base, 1, 8418), ANO)!, 0)).not.toBe(chaveFaixa(antes, 0))
  })
})

describe('pousio depois da última cultura', () => {
  it('conta os dias entre a colheita da última cultura e 31/ago', () => {
    // Sorgo colhido em 10/06/2028: 11/06 a 31/08 = 82 dias.
    expect(diasDePousio(base, ANO)).toBe(82)
    // Só a soja, colhida em 20/02/2028: 21/02 a 31/08/2028 (bissexto) = 193 dias.
    expect(diasDePousio(remover(base, 1), ANO)).toBe(193)
    expect(diasDePousio(RASCUNHO_VAZIO, ANO)).toBe(0)
  })
})

describe('resposta da API', () => {
  it('traz as datas resolvidas e o ciclo de referência das culturas sem data', () => {
    const r = adicionar(adicionar(RASCUNHO_VAZIO, 1150), 48747)
    const enviado = pedidoCulturas(r, ANO)!
    const novo = aplicarResposta(r, enviado, SIMULACAO_FIXTURE)
    expect(novo.culturas.map(c => [c.s, c.e, c.refCiclo, c.plantioLivre])).toEqual([[5, 17, 123, false], [17, 28, 111, false]])
    expect(pedidoCulturas(novo, ANO)).toEqual(SIMULACAO_FIXTURE.rotation.crops.map(c => ({
      code: c.crop.eco_port_code, planting_date: c.planting_date, harvest_date: c.harvest_date,
    })))
  })
  it('colheita depois de 31/ago vai para o fim da safra (L15)', () => {
    const r = adicionar(adicionar(RASCUNHO_VAZIO, 1150), 8418)
    const resp = structuredClone(SIMULACAO_FIXTURE)
    resp.rotation.crops[1]!.crop.eco_port_code = 8418
    resp.rotation.crops[1]!.harvest_date = '2028-09-20'
    const novo = aplicarResposta(r, pedidoCulturas(r, ANO)!, resp)
    expect(novo.culturas[1]).toMatchObject({ e: 36, ajustado: true })
  })
  it('ignora resposta de outras culturas', () => {
    const r = adicionar(adicionar(RASCUNHO_VAZIO, 2175), 48747)
    expect(aplicarResposta(r, pedidoCulturas(r, ANO)!, SIMULACAO_FIXTURE)).toBe(r)
  })
  it('corrige sozinho o 422 de ciclo fora da faixa', () => {
    const r = { ...base, culturas: [{ ...base.culturas[0], e: 9, refCiclo: null }, base.culturas[1]] }
    const c = corrigir422(r, 'custom rotation: crop 1150 cycle of 31 days is outside 50%–150% of its reference cycle (100 days)', ANO)
    expect(c!.culturas[0].refCiclo).toBe(100)
    expect(datasDe(c!.culturas[0], ANO).ciclo).toBe(50)
    expect(corrigir422(r, 'custom rotation: unknown crop 1', ANO)).toBeNull()
  })
  it('lê status, ranking, janela e o ponto exato do sweep', () => {
    const rot = SIMULACAO_FIXTURE.rotation
    expect(classeDoRisco(rot.crops[0].crop.risk.risk_percentage)).toBe('good')
    expect(classeDoRisco(null)).toBe('none')
    expect(piorClasse(['good', 'none', 'warn'])).toEqual({ cls: 'warn', i: 2 })
    expect(piorClasse(['none', 'none'])).toEqual({ cls: 'none', i: 0 })
    expect(seloRanking(rot.rank, rot.would_be_recommended)).toBe('Ficaria em 1º')
    expect(seloRanking(9, false)).toBe('Fora das 4 melhores')
    expect(pontoDoSweep(SIMULACAO_FIXTURE, pedidoCulturas(base, ANO))?.decendio_idx).toBeDefined()
  })
  it('conta os dias sem cobertura pelas datas reais', () => {
    expect(diasSemCobertura(base, ANO)).toBe(0)
    const r = { ...base, culturas: [base.culturas[0], { ...base.culturas[1], s: 19 }] }
    expect(diasSemCobertura(r, ANO)).toBe(19) // 21/02 a 10/03 (2028)
  })
})

describe('textos em português', () => {
  it('traduz os checks conhecidos', () => {
    expect(traduzirCheck('Both crops are Poaceae: no botanical family change, which favors…', [], []).titulo).toBe('Mesma família botânica')
    const cal = traduzirCheck('bachanta: planting on 2028-04-01 is 45 days from the regional calendar date (2028-02-16); recommendations accept up to 30.', ['soya bean', 'bachanta'], ['Soja', 'Sorgo'])
    expect(cal.texto).toBe('Sorgo: plantio a 45 dias da data usual da região (16 fev). A recomendação aceita até 30.')
    expect(traduzirCheck('algo novo', [], []).titulo).toBe('Alerta agronômico')
  })
  it('traduz os 422', () => {
    const nome = (c: number) => (c === 801 ? 'Crotalária' : 'Soja')
    expect(mensagemErro('parametros', 'custom rotation: crop 801 has no FAO-56 water requirements to simulate', nome))
      .toBe('Crotalária não tem dados de consumo de água para simular.')
    expect(mensagemErro('parametros', 'custom rotation: crop 1150 cycle of 31 days is outside 50%–150% of its reference cycle (100 days)', nome))
      .toBe('Soja: ciclo de 31 dias fora da faixa aceita (50 a 150 dias).')
    expect(mensagemErro('rede', '', nome)).toMatch(/Sem conexão/)
  })
})

describe('catálogo do menu', () => {
  it('culturas com perfil primeiro, o resto em ordem alfabética, com nome em português', () => {
    const it = (code: number, nome: string) => ({ eco_port_code: code, scientific_name: nome, common_names: [nome], category: [], life_span: [] })
    const c = catalogoRascunho([it(2199, 'groundnut'), it(1150, 'soya bean'), it(1191, 'sunflower'), it(99999, 'zz crop')])
    expect(c.map(x => [x.nome, x.comum])).toEqual([['Soja', true], ['Amendoim', false], ['Girassol', false], ['Zz crop', false]])
  })
})

describe('faixa de decêndios no calendário (mesma régua da barra)', () => {
  it('2ª cultura: cor pelo risco dela; data regional é só marca', () => {
    const f = faixaDoSweep(SIMULACAO_FIXTURE, 1)!
    expect(f.pontos[17]).toMatchObject({ cls: 'good', regional: true })
    expect(f.pontos[22]).toMatchObject({ cls: 'warn', regional: true }) // 33% de risco (segurança 67), dentro do calendário
    expect(f.pontos[23]).toMatchObject({ cls: 'warn', regional: false })
    expect(f.melhor).toBe(SIMULACAO_FIXTURE.second_planting_sweep!.best_decendio_idx)
  })
  it('1ª cultura: a 2ª fica parada; vale o risco da própria 1ª', () => {
    const f = faixaDoSweep(SIMULACAO_FIXTURE, 0)!
    for (const p of SIMULACAO_FIXTURE.first_planting_sweep!.points) {
      expect(p.crops[1]!.planting_date).toBe('2028-02-21')
      expect(f.pontos[p.decendio_idx].cls).toBe(p.crops[0].temperature_ok ? classeDoRisco(p.crops[0].risk_percentage) : 'risk')
    }
    // 2ª cultura com 100% de risco em todos os pontos (girassol tarde): a faixa da 1ª não fica vermelha por ela.
    const r = structuredClone(SIMULACAO_FIXTURE)
    r.first_planting_sweep!.points.forEach(p => { p.crops[1]!.risk_percentage = 100 })
    expect(faixaDoSweep(r, 0)!.pontos[5].cls).toBe('good')
  })
  it('temperatura fora dos limites reprova; sem sweep, sem faixa', () => {
    const r = structuredClone(SIMULACAO_FIXTURE)
    r.second_planting_sweep!.points[0].crops[1]!.temperature_ok = false
    expect(faixaDoSweep(r, 1)!.pontos[r.second_planting_sweep!.points[0].decendio_idx].cls).toBe('risk')
    expect(faixaDoSweep(null, 0)).toBeNull()
  })
  it('invariante: soltar num decêndio gera o pedido exato do ponto do sweep, e a barra fica da cor dele', () => {
    for (const i of [0, 1]) {
      const sw = i === 0 ? SIMULACAO_FIXTURE.first_planting_sweep! : SIMULACAO_FIXTURE.second_planting_sweep!
      const f = faixaDoSweep(SIMULACAO_FIXTURE, i)!
      for (const p of sw.points) {
        const pedido = pedidoCulturas(arrastar(base, i, 'mover', p.decendio_idx, ANO).rascunho, ANO)!
        expect(pedido).toEqual(p.crops.map(c => ({ code: c.code, planting_date: c.planting_date, harvest_date: c.harvest_date })))
        // A rotação atual aparece nos dois sweeps: basta achar um ponto com as mesmas datas e o mesmo risco.
        expect(pontoDoSweep(SIMULACAO_FIXTURE, pedido)?.crops.map(c => c.risk_percentage)).toEqual(p.crops.map(c => c.risk_percentage))
        if (p.crops[i].temperature_ok) expect(f.pontos[p.decendio_idx].cls).toBe(classeDoRisco(p.crops[i].risk_percentage))
      }
    }
  })
  it('invariante: o decêndio tem a cor que a barra teria plantando ali', () => {
    const f = faixaDoSweep(SIMULACAO_FIXTURE, 1)!
    for (const p of SIMULACAO_FIXTURE.second_planting_sweep!.points) {
      expect(f.pontos[p.decendio_idx].cls).toBe(classeDoRisco(p.crops[1]!.risk_percentage))
    }
  })
})
