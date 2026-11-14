import { describe, it, expect } from 'vitest'
import { lerNumero, texturaDaArgila, classeDaTextura, respostasDoLaudo, texturaEfetiva, rotuloSolo, CLASSE_PADRAO } from './solo'

describe('lerNumero', () => {
  it('aceita vírgula', () => expect(lerNumero('0,20')).toBe(0.2))
  it('vazio → null', () => expect(lerNumero('  ')).toBeNull())
  it('texto → null', () => expect(lerNumero('abc')).toBeNull())
})

describe('texturaDaArgila (Embrapa)', () => {
  it.each([
    [36, 'argiloso'], [35, 'medio'], [15, 'medio'], [14.9, 'arenoso'], [null, null],
  ] as const)('%s %% → %s', (arg, esperado) => expect(texturaDaArgila(arg)).toBe(esperado))
})

describe('classeDaTextura', () => {
  it('argiloso → latossolo vermelho', () => expect(classeDaTextura('argiloso')).toBe('latossolo_vermelho'))
  it('sem textura → padrão', () => expect(classeDaTextura(null)).toBe(CLASSE_PADRAO))
})

describe('respostasDoLaudo', () => {
  it('V baixo → acidez alta', () => expect(respostasDoLaudo({ v: '30' }).acidez).toBe('alta'))
  it('fertilidade é a pior entre P e K', () => {
    expect(respostasDoLaudo({ p: '25', k: '0,05', arg: '40' }).fertilidade).toBe('baixa')
  })
  it('laudo vazio → nada', () => expect(respostasDoLaudo({})).toEqual({}))
})

describe('texturaEfetiva', () => {
  it('argila do laudo sobrescreve o cartão', () => {
    expect(texturaEfetiva('arenoso', { arg: '50' }, false)).toEqual({ textura: 'argiloso', peloLaudo: true })
  })
  it('cartão escolhido depois do laudo vale', () => {
    expect(texturaEfetiva('arenoso', { arg: '50' }, true)).toEqual({ textura: 'arenoso', peloLaudo: false })
  })
  it('laudo sem argila mantém o cartão', () => {
    expect(texturaEfetiva('medio', { ph: '5' }, false)).toEqual({ textura: 'medio', peloLaudo: false })
  })
})

describe('rotuloSolo', () => {
  it('não sei', () => expect(rotuloSolo({ textura: null, texturaInformada: false, texturaPeloLaudo: false })).toBe('Padrão da região'))
  it('pelo laudo', () => expect(rotuloSolo({ textura: 'medio', texturaInformada: true, texturaPeloLaudo: true })).toBe('Médio (laudo)'))
})
