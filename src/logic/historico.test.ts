import { describe, it, expect } from 'vitest'
import { rotuloSafra, safraPlanejada, ultimaSafra, nomeCultura, registroMaisRecente, resumoSafra, unidadeDe, NAO_PLANTEI, norm } from './historico'

describe('ano agrícola (julho a junho)', () => {
  it('em junho a safra planejada começou no ano anterior', () => {
    expect(safraPlanejada(new Date(2026, 5, 30))).toBe(2025)
  })
  it('em julho a safra planejada começa neste ano', () => {
    expect(safraPlanejada(new Date(2026, 6, 1))).toBe(2026)
  })
  it('última safra é a anterior à planejada', () => {
    expect(rotuloSafra(ultimaSafra(new Date(2026, 10, 14)))).toBe('2025/26')
  })
  it('virada de século no rótulo', () => expect(rotuloSafra(2099)).toBe('2099/00'))
})

describe('nomeCultura', () => {
  it('catálogo', () => expect(nomeCultura('algodao')).toBe('Algodão'))
  it('não plantei', () => expect(nomeCultura(NAO_PLANTEI)).toBe('Não plantei'))
  it('outra', () => expect(nomeCultura('outra:Girassol')).toBe('Girassol'))
  it('vazio', () => expect(nomeCultura(null)).toBe(''))
})

describe('registroMaisRecente', () => {
  it('ignora anos sem 1ª safra', () => {
    const h = { '2024/25': { c1: 'soja', c2: 'milho' }, '2025/26': { c2: 'milho' } }
    expect(registroMaisRecente(h)?.safra).toBe('2024/25')
  })
  it('sem histórico → null', () => expect(registroMaisRecente(null)).toBeNull())
})

describe('resumoSafra', () => {
  it('soja e milho', () => expect(resumoSafra({ c1: 'soja', c2: 'milho' })).toBe('Soja, milho'))
  it('omite não plantei', () => expect(resumoSafra({ c1: 'soja', c2: NAO_PLANTEI })).toBe('Soja'))
})

describe('unidadeDe', () => {
  it('grão tem unidade', () => expect(unidadeDe('algodao')).toBe('@/ha'))
  it('cobertura não pede produtividade', () => expect(unidadeDe('milheto')).toBeNull())
  it('outra não pede produtividade', () => expect(unidadeDe('outra:x')).toBeNull())
})

it('norm remove acentos', () => expect(norm('Feijão')).toBe('feijao'))
