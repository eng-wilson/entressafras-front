import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CENARIOS_FIXTURE } from '../data/cenariosFixture'
import { FaixaCenario, SeletorCenario } from './SeletorCenario'

afterEach(cleanup)
const [atual, , seco] = CENARIOS_FIXTURE

it('lista os cenários na ordem da API e avisa a troca', () => {
  const onTrocar = vi.fn()
  render(<SeletorCenario lista={CENARIOS_FIXTURE} selecionado="historical" onTrocar={onTrocar} info={null} carregando={false} />)
  const sel = screen.getByRole('combobox') as HTMLSelectElement
  expect([...sel.options].map(o => o.textContent)).toEqual(['Média dos últimos 30 anos', 'Mais quente', 'Mais quente e seco'])
  expect(sel.value).toBe('historical')
  fireEvent.change(sel, { target: { value: 'warmer_drier' } })
  expect(onTrocar).toHaveBeenCalledWith('warmer_drier')
})

it('sem lista (API sem cenários), não mostra o seletor', () => {
  const { container } = render(<SeletorCenario lista={[atual]} selecionado="historical" onTrocar={() => {}} info={null} carregando={false} />)
  expect(container.firstChild).toBeNull()
})

it('faixa: nada no clima atual; rótulo e descrição no cenário, sem fonte', () => {
  const { container, rerender } = render(<FaixaCenario info={null} />)
  expect(container.firstChild).toBeNull()
  rerender(<FaixaCenario info={atual} />)
  expect(container.firstChild).toBeNull()
  rerender(<FaixaCenario info={seco} />)
  const faixa = screen.getByRole('note').textContent ?? ''
  expect(faixa).toContain('Mais quente e seco')
  expect(faixa).toContain('+1,5 °C, −10 % de chuva, chuvas começam 10 dias depois')
  expect(faixa).not.toMatch(/Fonte|Illustrative|ilustrativos|2030/)
})
