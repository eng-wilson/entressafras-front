import type { EstadoClima, EstadoCultura } from '../types'
import { periodoLabel } from '../logic/periodo'
import { climaDoPeriodo } from '../logic/clima'
import { useMemo } from 'react'
import { STAGES } from '../data/mock'
import { tempGauge } from '../logic/tempGauge'
import { soilGauge } from '../logic/soilGauge'
import { RainGauge } from './RainGauge'
import { IsoField } from './IsoField'
import { SoilMoistureBar } from './SoilMoistureBar'
import { TempRangeBar } from './TempRangeBar'

export function Simulation({ idx, clima, cultura }: { idx: number; clima: EstadoClima; cultura: EstadoCultura }) {
  const periodLabel = periodoLabel(idx)
  const periodo = climaDoPeriodo(clima.dados?.decendios ?? null, idx)
  const cargando = clima.status === 'carregando'
  const cur = STAGES.find(x => idx >= x.from && idx <= x.to)!
  const covered = cur.k === 'straw'
  const soil = useMemo(() => soilGauge(idx, cur.crop, covered), [idx, cur.crop, covered])
  const temp = useMemo(() => tempGauge(cur.crop, cur.k, covered, {
    tmin: periodo.tmin, tmax: periodo.tmax,
    tminExtremo: clima.dados?.decendios[idx]?.tmin_extremo_medio ?? null,
  }, cultura.dados), [periodo.tmin, periodo.tmax, clima.dados, idx, cur.crop, cur.k, covered, cultura.dados])

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
            <RainGauge chuvaDecendio={periodo.chuvaDecendio} carregando={cargando} />
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
          <TempRangeBar temp={temp} carregando={cargando} carregandoReferencia={!!cur.crop && cultura.status === 'carregando'} />
        </div>
      </div>
    </section>
  )
}
