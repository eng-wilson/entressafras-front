import type { Contorno } from '../types'
import { areaHa, fmtHa } from '../logic/geo'
import { Icone } from './Icone'

type Props = { pontos: Contorno; onDesfazer: () => void; onCancelar: () => void; onConcluir: () => void }

/** Barra flutuante enquanto o agricultor marca os cantos do talhão. */
export function HudDesenho({ pontos, onDesfazer, onCancelar, onConcluir }: Props) {
  const n = pontos.length
  return (
    <div className="ob-hud" role="toolbar" aria-label="Desenho do talhão">
      <span className="ob-dica" aria-live="polite">
        {n < 3 ? `Clique no mapa para marcar o canto ${n + 1}` : `${n} cantos · ${fmtHa(areaHa(pontos))}`}
      </span>
      <button className="ob-btn" type="button" onClick={onDesfazer} disabled={!n}>
        <Icone id="i-undo" />Desfazer
      </button>
      <button className="ob-btn" type="button" onClick={onCancelar}>Cancelar</button>
      <button className="ob-btn ob-pri" type="button" onClick={onConcluir} disabled={n < 3}>Concluir</button>
    </div>
  )
}
