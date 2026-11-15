import { classeChuvaDecendio, ROTULO_CHUVA, alturaChuvaDecendio, MARCAS_CHUVA_DECENDIO } from '../logic/chuva'
import { inteiro } from '../logic/formato'
import { t } from '../i18n'

// Widget de chuva do decêndio (padrão dos widgets da cena: legenda, valor, status, medidor linear).
// A escala do medidor vai de 0 a 150 mm, com as marcas de 20, 50 e 100 mm.
export function RainGauge({ chuvaDecendio: mm, carregando = false }: { chuvaDecendio: number | null; carregando?: boolean }) {
  const rk = mm == null ? 'nd' : classeChuvaDecendio(mm)
  const label = mm == null ? t('Sem dado') : t(ROTULO_CHUVA[classeChuvaDecendio(mm)])
  const preenchido = alturaChuvaDecendio(carregando ? 0 : mm ?? 0)
  return (
    <div
      className="vg wg"
      role="img"
      aria-label={carregando ? t('Chuva do decêndio: carregando') : mm == null ? t('Chuva do decêndio: sem dado') : t('Chuva do decêndio: {mm} milímetros, {chuva}', { mm: inteiro(mm), chuva: label })}
    >
      <span className="wg-h">
        <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-drop" /></svg>
        {t('Chuva do decêndio')}
      </span>
      <span className="wg-v">{carregando ? <span className="sk sk-num" /> : <>{mm == null ? '–' : inteiro(mm)}<small> mm</small></>}</span>
      {carregando ? <span className="sk sk-chip" /> : <span className={`wg-s chuva-${rk}`}>{label}</span>}
      <div className="wg-g" aria-hidden="true">
        <div className="wg-tr">
          <i className="wg-chuva" style={{ width: preenchido }} />
          {MARCAS_CHUVA_DECENDIO.map(m => <b key={m} style={{ left: alturaChuvaDecendio(m) }} />)}
        </div>
        <div className="wg-sc">
          {MARCAS_CHUVA_DECENDIO.map(m => <span key={m} style={{ left: alturaChuvaDecendio(m) }}>{m}</span>)}
        </div>
      </div>
    </div>
  )
}
