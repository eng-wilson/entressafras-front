import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { HudDesenho } from './HudDesenho'
import { JanelaPassos } from './JanelaPassos'
import { EditorSafra } from './EditorSafra'
import { dadosDo, formDe } from './dados'
import { TALHAO_EXEMPLO } from './exemplo'
import type { RegistroSafra, Talhao } from '../types'

const btn = (name: string | RegExp) => screen.getByRole('button', { name })

describe('HudDesenho', () => {
  const props = { onDesfazer: vi.fn(), onCancelar: vi.fn(), onConcluir: vi.fn() }
  it('Concluir só com 3 cantos ou mais', () => {
    const { rerender } = render(<HudDesenho pontos={TALHAO_EXEMPLO.slice(0, 2)} {...props} />)
    expect(btn('Concluir')).toBeDisabled()
    expect(screen.getByText('Clique no mapa para marcar o canto 3')).toBeInTheDocument()
    rerender(<HudDesenho pontos={TALHAO_EXEMPLO} {...props} />)
    expect(btn('Concluir')).toBeEnabled()
    expect(screen.getByText('4 cantos · ≈ 43 ha')).toBeInTheDocument()
  })
  it('Desfazer desabilitado sem pontos', () => {
    render(<HudDesenho pontos={[]} {...props} />)
    expect(btn('Desfazer')).toBeDisabled()
  })
})

describe('JanelaPassos (novo talhão)', () => {
  function abrir() {
    const onSalvar = vi.fn()
    render(<JanelaPassos contorno={TALHAO_EXEMPLO} onSalvar={onSalvar} onCancelar={vi.fn()} />)
    return onSalvar
  }

  it('Continuar exige nome', () => {
    abrir()
    expect(btn('Continuar')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sede' } })
    expect(btn('Continuar')).toBeEnabled()
  })

  it('Solo exige textura; Não sei vale', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sede' } })
    fireEvent.click(btn('Continuar'))
    expect(btn('Continuar')).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /Não sei/ }))
    expect(btn('Continuar')).toBeEnabled()
  })

  it('argila do laudo sobrescreve o cartão', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sede' } })
    fireEvent.click(btn('Continuar'))
    fireEvent.click(screen.getByRole('radio', { name: /Arenoso/ }))
    fireEvent.click(btn(/Digitar valores/))
    fireEvent.change(screen.getByLabelText(/Argila/), { target: { value: '50' } })
    expect(screen.getByRole('radio', { name: /Argiloso/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Pelo laudo · 50 % de argila')).toBeInTheDocument()
    // Escolher o cartão depois volta a mandar.
    fireEvent.click(screen.getByRole('radio', { name: /Médio/ }))
    expect(screen.getByRole('radio', { name: /Médio/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('Pular gera historico null', () => {
    const onSalvar = abrir()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sede' } })
    fireEvent.click(btn('Continuar'))
    fireEvent.click(screen.getByRole('radio', { name: /Argiloso/ }))
    fireEvent.click(btn('Continuar'))
    fireEvent.click(btn('Soja'))
    fireEvent.click(btn('Pular'))
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Sede', textura: 'argiloso', historico: null }))
  })

  it('Concluir grava a última safra', () => {
    const onSalvar = abrir()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sede' } })
    fireEvent.click(btn('Continuar'))
    fireEvent.click(screen.getByRole('radio', { name: /Argiloso/ }))
    fireEvent.click(btn('Continuar'))
    fireEvent.click(btn('Soja'))
    fireEvent.click(btn('Milho'))
    fireEvent.click(btn('Concluir e ver sugestões'))
    const d = onSalvar.mock.calls[0][0]
    const [registro] = Object.values(d.historico) as RegistroSafra[]
    expect(registro).toMatchObject({ c1: 'soja', c2: 'milho' })
  })
})

describe('EditorSafra', () => {
  function Controlado({ inicial = {} as RegistroSafra, espiao = vi.fn() }) {
    const [r, setR] = useState(inicial)
    return <EditorSafra valor={r} onMudar={x => { setR(x); espiao(x) }} />
  }

  it('busca sem resultado oferece "Usar"', () => {
    const espiao = vi.fn()
    render(<Controlado espiao={espiao} />)
    fireEvent.change(screen.getByLabelText('Buscar cultura da 1ª safra · verão'), { target: { value: 'Girassol' } })
    fireEvent.click(screen.getByRole('option', { name: /Usar “Girassol”/ }))
    expect(espiao).toHaveBeenLastCalledWith(expect.objectContaining({ c1: 'outra:Girassol' }))
    expect(screen.getByText('não simulada')).toBeInTheDocument()
  })

  it('busca ignora acento', () => {
    render(<Controlado />)
    fireEvent.change(screen.getByLabelText('Buscar cultura da 1ª safra · verão'), { target: { value: 'feijao' } })
    expect(screen.getByRole('option', { name: /Feijão/ })).toBeInTheDocument()
  })

  it('produtividade só para grãos, com a unidade', () => {
    render(<Controlado inicial={{ c1: 'algodao', c2: 'milheto' }} />)
    expect(screen.getAllByText(/Produtividade/)).toHaveLength(1)
    expect(screen.getByText('@/ha')).toBeInTheDocument()
  })

  it('pragas: switch abre os chips', () => {
    const espiao = vi.fn()
    render(<Controlado espiao={espiao} />)
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(btn('Percevejo'))
    expect(espiao).toHaveBeenLastCalledWith(expect.objectContaining({ pragas: true, quais: ['Percevejo'] }))
  })
})

describe('dados', () => {
  const base: Talhao = {
    id: 'x', nome: 'Sede', contorno: TALHAO_EXEMPLO, areaHa: 43, centro: { lat: -17.95, lon: -51.05 },
    textura: null, texturaInformada: false, texturaPeloLaudo: false, analise: null, classe: 'latossolo_vermelho',
    historico: { '2024/25': { c1: 'soja', c2: 'milho' } },
  }
  it('"Não sei" volta selecionado ao editar', () => {
    expect(formDe(base).textura).toBe('naosei')
  })
  it('edição mantém o histórico', () => {
    expect(dadosDo(formDe(base), TALHAO_EXEMPLO, base).historico).toEqual(base.historico)
  })
  it('laudo vazio não é gravado', () => {
    const f = { ...formDe(null), nome: 'A', textura: 'medio' as const, analise: { ph: '' } }
    expect(dadosDo(f, TALHAO_EXEMPLO).analise).toBeNull()
  })
  it('chave da safra segue o ano agrícola', () => {
    const f = { ...formDe(null), nome: 'A', textura: 'medio' as const, registro: { c1: 'soja' } }
    expect(Object.keys(dadosDo(f, TALHAO_EXEMPLO, null, new Date(2026, 10, 14)).historico!)).toEqual(['2025/26'])
  })
})
