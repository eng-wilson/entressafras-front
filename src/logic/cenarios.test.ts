import { afterEach, describe, expect, it } from 'vitest'
import { CENARIOS_FIXTURE } from '../data/cenariosFixture'
import { definirIdioma } from '../i18n'
import { descricaoCenario, ehHistorico, rotuloCenario } from './cenarios'

const [atual, quente, seco] = CENARIOS_FIXTURE
afterEach(() => definirIdioma('pt'))

describe('textos do cenário de clima', () => {
  it('em português, rótulo pelo id, sem ano; id desconhecido usa o label da API sem o ano', () => {
    expect(rotuloCenario(atual)).toBe('Média dos últimos 30 anos')
    expect(rotuloCenario(quente)).toBe('Mais quente')
    expect(rotuloCenario(seco)).toBe('Mais quente e seco')
    expect(rotuloCenario({ ...seco, id: 'ssp585', label: '2050: much hotter' })).toBe('Much hotter')
  })

  it('em português, a descrição é montada dos números (sem fixar deltas)', () => {
    expect(descricaoCenario(seco)).toBe('+1,5 °C, −10 % de chuva, chuvas começam 10 dias depois')
    expect(descricaoCenario(quente)).toBe('+1 °C')
    expect(descricaoCenario({ ...seco, delta_temp_c: 2.25, rain_change_pct: 5, onset_delay_days: -1 }))
      .toBe('+2,3 °C, +5 % de chuva, chuvas começam 1 dia antes')
  })

  it('em inglês, rótulo pelo id (sem ano) e description da API', () => {
    definirIdioma('en')
    expect(rotuloCenario(atual)).toBe('Last 30 years average')
    expect(rotuloCenario(seco)).toBe('Warmer and drier')
    expect(descricaoCenario(seco)).toBe(seco.description)
  })

  it('ausente ou historical = clima atual', () => {
    expect(ehHistorico(undefined)).toBe(true)
    expect(ehHistorico('historical')).toBe(true)
    expect(ehHistorico('warmer')).toBe(false)
  })
})
