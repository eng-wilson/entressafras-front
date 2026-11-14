import { useRef, useCallback } from 'react'
import { THIS_RAIN, MONTHS_SHORT, LEN, MONTHS } from '../data/mock'

const rainClass = (mm: number) =>
  mm < 60 ? 'dry' : mm < 150 ? 'low' : mm <= 300 ? 'good' : 'wet'
const rainLabel: Record<string, string> = { dry: 'Seco', low: 'Pouca chuva', good: 'Chuva boa', wet: 'Muita chuva' }
const rainIcon = (mm: number, mi: number) => {
  const rk = rainClass(mm)
  if (rk === 'dry') return '/canvas-icons.svg#w-sun'
  if (rk === 'low') return '/canvas-icons.svg#w-drizzle'
  return (mi >= 2 && mi <= 4) ? '/canvas-icons.svg#w-mixed' : '/canvas-icons.svg#w-rain'
}

type Props = { idx: number; onIdx: (i: number) => void }

export function MonthStrip({ idx, onIdx }: Props) {
  const activeM = Math.floor(idx / 3)
  const decInM = idx % 3
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

  const m = Math.floor(idx / 3), d = idx % 3
  const days = d === 0 ? '1 a 10' : d === 1 ? '11 a 20' : `21 a ${LEN[m]}`
  const mmM = THIS_RAIN[m]
  const rkM = rainClass(mmM)
  const sliderText = `${days} de ${MONTHS[m]}, ${rainLabel[rkM]}, ${mmM} milímetros no mês`

  const knobPct = `${((idx + 0.5) / 36 * 100).toFixed(3)}%`
  const fillPct  = `${(idx / 35 * 100).toFixed(3)}%`
  const decNum = String(d + 1)

  return (
    // Wrapper position:relative → scrub e selnum se posicionam aqui, fora do grid
    <div style={{ position: 'relative' }}>
      <div className="months">
        {MONTHS_SHORT.map((month, mi) => {
          const mm = THIS_RAIN[mi]
          const rk = rainClass(mm)
          const icon = rainIcon(mm, mi)
          const isPast = mi <= 1
          const isActive = mi === activeM

          return (
            <button
              key={month}
              type="button"
              className={`mo${isActive ? ' hi' : ''}${isPast ? ' past' : ''}`}
              onClick={() => onIdx(mi * 3 + decInM)}
              title={`${month}: ${rainLabel[rk]} · ${mm} mm`}
              aria-pressed={isActive}
              aria-label={`${month}: ${rainLabel[rk]}, ${mm} milímetros`}
            >
              <span className="t">{month}</span>
              <span className="wx-wrap">
                <svg className="wx" aria-hidden="true">
                  <use href={icon} />
                </svg>
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
