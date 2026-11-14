type Props = { mode: 'cal' | 'cmp'; onMode: (m: 'cal' | 'cmp') => void }

export function RotationsHeader({ mode, onMode }: Props) {
  return (
    <div className="mstrip">
      <div className="ms-title">
        <h2 className="h2r">Rotações</h2>
        <p>Safra 2026/27 · ordenadas para o clima previsto</p>
      </div>
      {/* + button — no action per spec */}
      <button className="add" type="button" aria-label="Adicionar rotação" disabled>
        <svg className="ic" aria-hidden="true">
          <use href="/canvas-icons.svg#i-plus" />
        </svg>
      </button>
      {/* Segmented control — Calendário / Comparação */}
      <div className="segc" role="group" aria-label="Modo de visualização">
        {(['cal', 'cmp'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`seg-btn${mode === m ? ' on' : ''}`}
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
          >
            {m === 'cal' ? 'Calendário' : 'Comparação'}
          </button>
        ))}
      </div>
    </div>
  )
}
