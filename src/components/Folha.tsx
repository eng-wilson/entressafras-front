// Folha modal no padrão do iOS: barra com Cancelar · título · Salvar, corpo rolável, fundo escurecido.
// Fecha com Esc ou clique fora; o foco vai para dentro ao abrir e volta para quem abriu ao fechar.
import './folha.css'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type Props = {
  titulo: string
  onCancelar: () => void
  onSalvar: () => void
  podeSalvar?: boolean
  /** Largura máxima da folha em px. */
  largura?: number
  children: ReactNode
}

export function Folha({ titulo, onCancelar, onSalvar, podeSalvar = true, largura = 600, children }: Props) {
  const id = useId()
  const folha = useRef<HTMLElement>(null)
  // A tecla e o clique fora usam a versão atual do callback, sem re-registrar o ouvinte.
  const cancelar = useRef(onCancelar)
  useEffect(() => { cancelar.current = onCancelar })

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    folha.current?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cancelar.current() } }
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('keydown', tecla); antes?.focus?.() }
  }, [])

  return (
    <div className="fo-fundo" onMouseDown={e => { if (e.target === e.currentTarget) cancelar.current() }}>
      <section ref={folha} className="fo-folha" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} style={{ maxWidth: largura }}>
        <header className="fo-barra">
          <button className="fo-btn" type="button" onClick={onCancelar}>Cancelar</button>
          <h2 id={id}>{titulo}</h2>
          <button className="fo-btn fo-forte" type="button" onClick={onSalvar} disabled={!podeSalvar}>Salvar</button>
        </header>
        <div className="fo-corpo">{children}</div>
      </section>
    </div>
  )
}
