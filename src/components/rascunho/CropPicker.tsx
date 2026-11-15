// Menu de culturas do rascunho (adicionar ou trocar). Só culturas que a API simula (GET /api/crops?simulable=true).
// Popover acessível: abre com o foco no 1º item habilitado, ↑/↓ navegam, Esc e clique fora fecham e devolvem o foco.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import type { ItemCatalogo } from '../../logic/rascunho'

export type ModoPicker = 'add' | 'rep'

type Item = ItemCatalogo & { nota?: string; desabilitado?: boolean }

type Props = {
  modo: ModoPicker
  titulo: string
  subtitulo: string
  /** null enquanto o catálogo carrega; [] com erro. */
  itens: Item[] | null
  erro: boolean
  onTentar: () => void
  onEscolher: (code: number) => void
  onFechar: () => void
  style?: CSSProperties
}

export function CropPicker({ modo, titulo, subtitulo, itens, erro, onTentar, onEscolher, onFechar, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const primeiro = ref.current?.querySelector<HTMLButtonElement>('.pk-i:not([aria-disabled="true"])')
    primeiro?.focus()
  }, [itens])

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onFechar()
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [onFechar])

  function tecla(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onFechar(); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const botoes = [...(ref.current?.querySelectorAll<HTMLButtonElement>('.pk-i:not([aria-disabled="true"])') ?? [])]
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement)
    const prox = e.key === 'ArrowDown' ? (i + 1) % botoes.length : (i - 1 + botoes.length) % botoes.length
    botoes[prox]?.focus()
  }

  const grupos: [string, Item[]][] = itens
    ? [['Mais comuns na região', itens.filter(i => i.comum)], ['Outras culturas', itens.filter(i => !i.comum)]]
    : []

  return (
    <div ref={ref} className={`picker pk-${modo}`} role="dialog" aria-label={titulo} style={style} onKeyDown={tecla}>
      <div className="pk-h"><b>{titulo}</b><span>{subtitulo}</span></div>
      {!itens && !erro && <p className="pk-msg" role="status">Carregando as culturas…</p>}
      {erro && (
        <p className="pk-msg" role="alert">
          Não foi possível carregar as culturas. <button className="link" type="button" onClick={onTentar}>Tentar de novo</button>
        </p>
      )}
      {grupos.filter(([, l]) => l.length).map(([g, lista]) => (
        <div key={g} role="group" aria-label={g}>
          <div className="pk-g" aria-hidden="true">{g}</div>
          {lista.map(it => (
            <button key={it.code} type="button" className="pk-i" aria-disabled={it.desabilitado || undefined}
              aria-label={it.nota ? `${it.nome}, ${it.nota}` : it.nome}
              onClick={() => { if (!it.desabilitado) onEscolher(it.code) }}>
              <span>{it.nome}</span>
              {it.nota && <span className="pk-s" aria-hidden="true">{it.nota}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
