import { expect, it } from 'vitest'
import { fonteCurta } from './fonteDado'

it('fica só com o nome da fonte', () => {
  expect(fonteCurta('NASA POWER (comunidade AG), série diária; ET0 FAO-56 Penman-Monteith')).toBe('NASA POWER')
  expect(fonteCurta('SMAP L4')).toBe('SMAP L4')
  expect(fonteCurta('')).toBeNull()
  expect(fonteCurta(undefined)).toBeNull()
})
