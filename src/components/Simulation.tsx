import { useMemo } from 'react'
import { STAGES, MONTHS, LEN } from '../data/mock'
import { tempGauge } from '../logic/tempGauge'
import { soilGauge } from '../logic/soilGauge'
import { RainGauge } from './RainGauge'
import { IsoField } from './IsoField'
import { SoilMoistureBar } from './SoilMoistureBar'
import { TempRangeBar } from './TempRangeBar'

export function Simulation({ idx }: { idx: number }) {
  const m = Math.floor(idx / 3), d = idx % 3
  const days = d === 0 ? '1 a 10' : d === 1 ? '11 a 20' : `21 a ${LEN[m]}`
  const periodLabel = `${days} de ${MONTHS[m]}`

  const cur = STAGES.find(x => idx >= x.from && idx <= x.to)!
  const covered = cur.k === 'straw'
  const soil = useMemo(() => soilGauge(idx, cur.crop, covered), [idx, cur.crop, covered])
  const temp = useMemo(() => tempGauge(cur.crop, cur.k, covered, idx), [idx, cur.crop, cur.k, covered])

  return (
    <section className="trio" aria-label="Resumo do período simulado">
      <div className="trio-h">
        <span className="trio-k">Simulando</span>
        <span className="trio-t">{periodLabel}</span>
      </div>
      <div className="trio-g">
        <section className="field" aria-labelledby="t-field">
          <div className="fh">
            <span className="fl" id="t-field">
              <svg className="ic" aria-hidden="true">
                <use href="/canvas-icons.svg#f-map" />
              </svg>
              Seu talhão
            </span>
          </div>
          <div className="fgrid">
            <RainGauge idx={idx} />
            <IsoField
              crop={cur.crop}
              stageKey={cur.k}
              stageName={cur.name}
              periodLabel={periodLabel}
            />
          </div>
        </section>
        <div className="pills">
          <SoilMoistureBar soil={soil} />
          <TempRangeBar temp={temp} />
        </div>
      </div>
    </section>
  )
}
