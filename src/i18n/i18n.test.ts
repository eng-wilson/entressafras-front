import { afterEach, describe, expect, it } from 'vitest'
import { chavesUsadas, placeholders } from '../../scripts/i18n.mjs'
import { EN } from './en'
import { EN_BASE } from './en/base'
import { EN_COMPONENTES } from './en/componentes'
import { EN_PAINEL } from './en/painel'
import { EN_ONBOARDING } from './en/onboarding'
import { EN_LOGICA } from './en/logica'
import { EN_DADOS } from './en/dados'
import { definirIdioma, numero, ordinal, reaisFmt, t } from '.'

afterEach(() => definirIdioma('pt'))

describe('traduções (todo texto da tela em português e inglês)', () => {
  const { chaves, invalidas } = chavesUsadas()

  it('toda chave usada em t() tem tradução em inglês', () => {
    const faltam = [...chaves.keys()].filter(k => !(k in EN))
    expect(faltam.map(k => `${k}  ←  ${chaves.get(k)![0]}`)).toEqual([])
  })

  it('a tradução tem os mesmos {placeholders} da chave', () => {
    const diferentes = Object.entries(EN).filter(([pt, en]) => placeholders(pt) !== placeholders(en)).map(([pt]) => pt)
    expect(diferentes).toEqual([])
  })

  it('a mesma chave em dois dicionários tem a mesma tradução (senão um sobrescreve o outro)', () => {
    const partes = [EN_BASE, EN_COMPONENTES, EN_PAINEL, EN_ONBOARDING, EN_LOGICA, EN_DADOS]
    const vistos = new Map<string, string>()
    const conflitos: string[] = []
    for (const d of partes) for (const [pt, en] of Object.entries(d)) {
      if (vistos.has(pt) && vistos.get(pt) !== en) conflitos.push(`${pt}: ${vistos.get(pt)} × ${en}`)
      vistos.set(pt, en)
    }
    expect(conflitos).toEqual([])
  })

  it('nenhuma chave montada com template literal (a checagem não conseguiria achá-la)', () => {
    expect(invalidas).toEqual([])
  })
})

describe('t() e formatos', () => {
  it('português devolve a própria chave; inglês, a tradução; variáveis em {nome}', () => {
    expect(t('Como funciona')).toBe('Como funciona')
    definirIdioma('en')
    expect(t('Como funciona')).toBe('How it works')
    expect(t('Texto sem tradução')).toBe('Texto sem tradução')
    expect(t('Talhão simulado: {estado}, {chuva} mm de chuva no dia. Arraste para mover; mais e menos para zoom; zero para restaurar.', { estado: 'Rain', chuva: '3.0' }))
      .toBe('Simulated field: Rain, 3.0 mm of rain on the day. Drag to move; plus and minus to zoom; zero to reset.')
  })

  it('números, reais e ordinais seguem o idioma', () => {
    expect(numero(1234.5, { maximumFractionDigits: 1 })).toBe('1.234,5')
    expect(ordinal(2)).toBe('2ª')
    definirIdioma('en')
    expect(numero(1234.5, { maximumFractionDigits: 1 })).toBe('1,234.5')
    expect(reaisFmt(1234.5)).toMatch(/^R\$\s?1,235$/)
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(n => ordinal(n))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st'])
  })
})
