import type { Contorno } from '../types'
import { areaHa, fmtHa } from '../logic/geo'
import { Icone } from './Icone'
import { t } from '../i18n'

type Props = { pontos: Contorno; onDesfazer: () => void; onCancelar: () => void; onConcluir: () => void }

/** Barra flutuante enquanto o agricultor marca os cantos do talhão. */
export function HudDesenho({ pontos, onDesfazer, onCancelar, onConcluir }: Props) {
  const n = pontos.length
  return (
    <div className="ob-hud" role="toolbar" aria-label={t('Desenho do talhão')}>
      <span className="ob-dica" aria-live="polite">
        {n < 3 ? t('Clique no mapa para marcar o canto {n}', { n: n + 1 }) : t('{n} cantos · {area}', { n, area: fmtHa(areaHa(pontos)) })}
      </span>
      <button className="ob-btn" type="button" onClick={onDesfazer} disabled={!n}>
        <Icone id="i-undo" />{t('Desfazer')}
      </button>
      <button className="ob-btn" type="button" onClick={onCancelar}>{t('Cancelar')}</button>
      <button className="ob-btn ob-pri" type="button" onClick={onConcluir} disabled={n < 3}>{t('Concluir')}</button>
    </div>
  )
}
