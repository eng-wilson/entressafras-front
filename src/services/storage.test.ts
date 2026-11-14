import { describe, it, expect, beforeEach } from 'vitest'
import { carregar, salvar, CHAVE } from './storage'
import type { Talhao } from '../types'

const talhao: Talhao = {
  id: 't1', nome: 'Sede', contorno: [[0, 0], [0, 1], [1, 1]], areaHa: 10, centro: { lat: 0.5, lon: 0.5 },
  textura: null, texturaInformada: false, texturaPeloLaudo: false, analise: null,
  classe: 'latossolo_vermelho', historico: { '2025/26': { c1: 'soja', c2: 'milho' } },
}

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('vazio quando não há nada salvo', () => {
    expect(carregar()).toEqual({ talhoes: [], ativo: null })
  })
  it('ida e volta preserva "Não sei" e o centro', () => {
    salvar({ talhoes: [talhao], ativo: 't1' })
    const e = carregar()
    expect(e.ativo).toBe('t1')
    expect(e.talhoes[0]).toEqual(talhao)
    expect(e.talhoes[0].texturaInformada).toBe(false)
  })
  it('JSON corrompido → vazio', () => {
    localStorage.setItem(CHAVE, '{oops')
    expect(carregar()).toEqual({ talhoes: [], ativo: null })
  })
  it('ativo inexistente cai no primeiro talhão', () => {
    localStorage.setItem(CHAVE, JSON.stringify({ talhoes: [talhao], ativo: 'x' }))
    expect(carregar().ativo).toBe('t1')
  })
  it('descarta talhões inválidos', () => {
    localStorage.setItem(CHAVE, JSON.stringify({ talhoes: [{ id: 1 }, talhao], ativo: 't1' }))
    expect(carregar().talhoes).toHaveLength(1)
  })
})
