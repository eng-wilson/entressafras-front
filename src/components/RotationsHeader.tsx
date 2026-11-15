import { useConjunto } from '../state/conjunto'
import { t } from '../i18n'
type Props = {
  mode: 'cal' | 'cmp'; onMode: (m: 'cal' | 'cmp') => void
  /** Abre o rascunho "Nova rotação" (ou foca o que já está aberto). */
  onAdd: () => void
  /** Motivo para não criar outra (ex.: já há 3 salvas); null = habilitado. */
  addBloqueio?: string | null
}

export function RotationsHeader({ mode, onMode, onAdd, addBloqueio = null }: Props) {
  const conj = useConjunto()
  return (
    <div className="mstrip">
      <div className="ms-title">
        <h2 className="h2r">{t('Rotações')}</h2>
        <p>{t('Safra {ano} · na ordem recomendada pela API', { ano: `${conj.ano}/${String(conj.ano + 1).slice(2)}` })}</p>
      </div>
      <button className="add" type="button" aria-label={t('Criar minha rotação')} title={addBloqueio ?? t('Criar minha rotação')}
        disabled={!!addBloqueio} onClick={onAdd}>
        <svg className="ic" aria-hidden="true">
          <use href="/canvas-icons.svg#i-plus" />
        </svg>
      </button>
      {/* Segmented control — Calendário / Comparação */}
      <div className="segc" role="group" aria-label={t('Modo de visualização')}>
        {(['cal', 'cmp'] as const).map(m => (
          <button
            key={m}
            type="button"
            className={`seg-btn${mode === m ? ' on' : ''}`}
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
          >
            {m === 'cal' ? t('Calendário') : t('Comparação')}
          </button>
        ))}
      </div>
    </div>
  )
}
