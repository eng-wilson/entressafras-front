import { useRef, useCallback } from 'react'
import { MONTHS_SHORT } from '../data/mock'
import type { Decendio } from '../types'
import { classeChuva, classeChuvaDecendio, ROTULO_CHUVA, iconeChuva } from '../logic/chuva'
import { chuvaMeses, climaDoPeriodo } from '../logic/clima'
import { periodoLabel, mesDe, decendioDoMes } from '../logic/periodo'
import { inteiro } from '../logic/formato'

type Props = { idx: number; decendios: Decendio[] | null; onIdx: (i: number) => void }

export function MonthStrip({ idx, onIdx, decendios }: Props) {
  const activeM = mesDe(idx)
  const decInM = decendioDoMes(idx)
  const scrubRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const scrubTo = useCallback((clientX: number) => {
    const el = scrubRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const travel = Math.max(1, r.width - 28)
    const v = Math.max(0, Math.min(35, Math.round((clientX - r.left - 14) / travel * 35)))
    if (v !== idx) onIdx(v)
  }, [idx, onIdx])

  const d = decendioDoMes(idx)
  const meses = chuvaMeses(decendios)
  const periodo = climaDoPeriodo(decendios, idx)
  const mm = periodo.chuvaDecendio
  const sliderText = periodoLabel(idx) + (mm == null ? ', chuva sem dado' : `, ${ROTULO_CHUVA[classeChuvaDecendio(mm)]}, ${inteiro(mm)} milímetros no decêndio`) + (periodo.tmin == null || periodo.tmax == null ? '' : `, de ${inteiro(periodo.tmin)} a ${inteiro(periodo.tmax)} graus`)

  const knobPct = `${((idx + 0.5) / 36 * 100).toFixed(3)}%`
  const fillPct  = `${(idx / 35 * 100).toFixed(3)}%`
  const decNum = String(d + 1)

  return (
    // Wrapper position:relative → scrub e selnum se posicionam aqui, fora do grid
    <div style={{ position: 'relative' }}>
      <div className="months">
        {MONTHS_SHORT.map((month, mi) => {
          const mm = meses[mi]
          const label = mm == null ? 'sem dado' : ROTULO_CHUVA[classeChuva(mm)]
          const icon = mm == null ? null : iconeChuva(mm, mi)
          const isPast = mi <= 1
          const isActive = mi === activeM

          return (
            <button
              key={month}
              type="button"
              className={`mo${isActive ? ' hi' : ''}${isPast ? ' past' : ''}`}
              onClick={() => onIdx(mi * 3 + decInM)}
              title={`${month}: ${label}${mm == null ? "" : `, ${inteiro(mm)} mm no mês`}`}
              aria-pressed={isActive}
              aria-label={`${month}: ${label}${mm == null ? "" : `, ${inteiro(mm)} milímetros no mês`}`}
            >
              <span className="t">{month}</span>
              <span className="wx-wrap">
                {icon && <svg className="wx" aria-hidden="true">
                  <use href={icon} />
                </svg>}
              </span>
              <span className="dec" aria-hidden="true">
                <i>1</i><i>2</i><i>3</i>
              </span>
            </button>
          )
        })}
      </div>

      {/* Número do decêndio acima do knob — absoluto relativo ao wrapper */}
      <span className="selnum" style={{ left: knobPct }} aria-hidden="true">
        {decNum}
      </span>

      {/* Trilho do slider — position:absolute via CSS relativo ao wrapper */}
      <div
        ref={scrubRef}
        className="scrub"
        onPointerDown={e => {
          if (e.button !== 0) return
          e.preventDefault()
          dragging.current = true
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          scrubTo(e.clientX)
        }}
        onPointerMove={e => {
          if (!dragging.current) return
          e.preventDefault()
          scrubTo(e.clientX)
        }}
        onPointerUp={e => {
          if (!dragging.current) return
          dragging.current = false
          ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
        }}
        onPointerCancel={() => { dragging.current = false }}
      >
        <span className="track" aria-hidden="true">
          <span className="fill" style={{ width: fillPct }} />
        </span>
        <span className="knob" style={{ left: knobPct }} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={35}
          step={1}
          value={idx}
          onChange={e => onIdx(Number(e.target.value))}
          aria-label="Arraste para simular um período"
          aria-valuetext={sliderText}
        />
      </div>
    </div>
  )
}
