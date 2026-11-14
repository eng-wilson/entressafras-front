import { THIS_RAIN } from '../data/mock'

const rainClass = (mm: number) =>
  mm < 60 ? 'dry' : mm < 150 ? 'low' : mm <= 300 ? 'good' : 'wet'
const rainLabel: Record<string, string> = {
  dry: 'Seco', low: 'Pouca chuva', good: 'Chuva boa', wet: 'Muita chuva',
}

export function RainGauge({ idx }: { idx: number }) {
  const m = Math.floor(idx / 3)
  const mm = THIS_RAIN[m]
  const rk = rainClass(mm)
  const rH = (Math.min(mm, 400) / 400 * 100).toFixed(1) + '%'

  return (
    <div
      className="vg"
      role="img"
      aria-label={`Chuva do mês: ${mm} milímetros, ${rainLabel[rk]}`}
    >
      <span className="vg-l">
        <svg className="ic" aria-hidden="true" width="13" height="13">
          <use href="/canvas-icons.svg#i-drop" />
        </svg>
        Chuva do mês
      </span>
      <span className="vg-v">{mm}<small> mm</small></span>
      <span className={`ms-h ${rk}`}>{rainLabel[rk]}</span>
      <div className="vg-w">
        <div className="vg-tr" aria-hidden="true">
          <i className="vg-rain" style={{ height: rH }} />
          <b style={{ bottom: '15%' }} />
          <b style={{ bottom: '37.5%' }} />
          <b style={{ bottom: '75%' }} />
        </div>
        <div className="vg-sc" aria-hidden="true">
          <span style={{ bottom: '75%' }}>300</span>
          <span style={{ bottom: '37.5%' }}>150</span>
          <span style={{ bottom: '15%' }}>60</span>
        </div>
      </div>
    </div>
  )
}
