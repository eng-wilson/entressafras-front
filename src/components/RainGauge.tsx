import { classeChuvaDecendio, ROTULO_CHUVA, alturaChuvaDecendio, MARCAS_CHUVA_DECENDIO } from '../logic/chuva'
import { inteiro } from '../logic/formato'

export function RainGauge({ chuvaDecendio: mm, carregando = false }: { chuvaDecendio: number | null; carregando?: boolean }) {
  const rk = mm == null ? 'nd' : classeChuvaDecendio(mm)
  const label = mm == null ? 'Sem dado' : ROTULO_CHUVA[classeChuvaDecendio(mm)]
  const rH = alturaChuvaDecendio(carregando ? 0 : mm ?? 0)
  return (
    <div
      className="vg"
      role="img"
      aria-label={`Chuva do decêndio: ${carregando ? "carregando" : mm == null ? "sem dado" : `${inteiro(mm)} milímetros, ${label}`}`}
    >
      <span className="vg-l">
        <svg className="ic" aria-hidden="true" width="13" height="13">
          <use href="/canvas-icons.svg#i-drop" />
        </svg>
        Chuva do decêndio
      </span>
      <span className="vg-v">{carregando ? <span className="sk sk-num" /> : <>{mm == null ? "–" : inteiro(mm)}<small> mm</small></>}</span>
      {carregando ? <span className="sk sk-chip" /> : <span className={`ms-h ${rk}`}>{label}</span>}
      <div className="vg-w">
        <div className="vg-tr" aria-hidden="true">
          <i className="vg-rain" style={{ height: rH }} />
          {MARCAS_CHUVA_DECENDIO.map(mm => <b key={mm} style={{ bottom: alturaChuvaDecendio(mm) }} />)}
        </div>
        <div className="vg-sc" aria-hidden="true">
          {MARCAS_CHUVA_DECENDIO.map(mm => <span key={mm} style={{ bottom: alturaChuvaDecendio(mm) }}>{mm}</span>)}
        </div>
      </div>
    </div>
  )
}
