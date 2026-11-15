import { Icone } from './Icone'
import { t } from '../i18n'

type Props = { onDesenhar: () => void; onExemplo: () => void }

export function EstadoVazio({ onDesenhar, onExemplo }: Props) {
  return (
    <div className="ob-vazio">
      <span className="ob-ico"><Icone id="i-layers" /></span>
      <h1>{t('Marque seu primeiro talhão')}</h1>
      <p>{t('Desenhe no mapa a área onde você planta.')}</p>
      <div className="ob-row">
        <button className="ob-btn ob-pri" type="button" onClick={onDesenhar}>
          <Icone id="i-pencil" />{t('Desenhar no mapa')}
        </button>
      </div>
      <p className="ob-fino">{t('Clique em cada canto do talhão. A área é calculada sozinha.')}</p>
      <button className="ob-lnk" type="button" onClick={onExemplo}>{t('Usar um talhão de exemplo (Rio Verde, GO)')}</button>
    </div>
  )
}
