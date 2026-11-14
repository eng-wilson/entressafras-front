import { render, screen, cleanup } from '@testing-library/react'
import { it, expect, afterEach } from 'vitest'
import { RainGauge } from './RainGauge'
afterEach(cleanup)
it('exibe chuva do decêndio com escala e classificação proporcionais', () => {
  render(<RainGauge chuvaDecendio={60} />)
  expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Chuva do decêndio: 60 milímetros, Chuva boa')
  expect(screen.getByText('Chuva do decêndio')).toBeTruthy()
  expect(screen.getByText('Chuva boa')).toBeTruthy()
  expect(screen.getByText('100')).toBeTruthy()
  expect(screen.getByText('50')).toBeTruthy()
  expect(screen.getByText('20')).toBeTruthy()
})
it('dado ausente nunca vira zero', () => { render(<RainGauge chuvaDecendio={null} />); expect(screen.getByText('Sem dado')).toBeTruthy(); expect(screen.queryByText('0')).toBeNull() })
it('chuva zero é um dado válido', () => {
  render(<RainGauge chuvaDecendio={0} />)
  expect(screen.getByText('0')).toBeTruthy()
  expect(screen.getByText('Seco')).toBeTruthy()
})
it('carregamento oculta o valor', () => { render(<RainGauge chuvaDecendio={60} carregando />); expect(screen.queryByText('60')).toBeNull(); expect(screen.getByRole('img').getAttribute('aria-label')).toContain('carregando') })
