import { useRef, useCallback } from 'react'
import { MONTHS, LEN } from '../data/mock'

type Props = { idx: number; onChange: (v: number) => void }

export function DecadeSlider({ idx, onChange }: Props) {
  const scrubRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const scrubTo = useCallback((clientX: number) => {
    const el = scrubRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const travel = Math.max(1, r.width - 28)
    const v = Math.max(0, Math.min(35, Math.round((clientX - r.left - 14) / travel * 35)))
    if (v !== idx) onChange(v)
  }, [idx, onChange])

  const m = Math.floor(idx / 3), d = idx % 3
  const days = d === 0 ? '1 a 10' : d === 1 ? '11 a 20' : `21 a ${LEN[m]}`
  const periodLabel = `${days} de ${MONTHS[m]}`

  const knobPct = `${((idx + 0.5) / 36 * 100).toFixed(3)}%`
  const fillPct  = `${(idx / 35 * 100).toFixed(3)}%`

  return (
    <div style={{ position: 'relative', paddingTop: 20 }}>
      {/* Décimo (1/2/3) flutuante acima do knob */}
      <div
        className="selnum"
        style={{
          position: 'absolute',
          top: 0,
          left: `calc(${knobPct} - 10px)`,
          width: 20,
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#0A64D6',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}
      >
        {d + 1}
      </div>

      {/* Scrub container com pointer events */}
      <div
        ref={scrubRef}
        className="scrub"
        style={{ position: 'relative', height: 28, cursor: 'pointer', touchAction: 'none' }}
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
        {/* Trilho visual */}
        <div
          className="track"
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: `${100 / 72}%`,
            right: `${100 / 72}%`,
            height: 4,
            background: 'var(--fill)',
            borderRadius: 2,
          }}
        >
          {/* Fill */}
          <div
            className="fill"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: fillPct,
              background: '#0A64D6',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Knob */}
        <div
          className="knob"
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            left: knobPct,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'white',
            border: '2px solid #0A64D6',
            boxShadow: '0 .5px 3px rgba(0,0,0,.16), 0 3px 8px rgba(0,0,0,.12)',
          }}
        />

        {/* Native range input — invisible, handles keyboard and accessibility */}
        <input
          type="range"
          min={0}
          max={35}
          step={1}
          value={idx}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'inherit',
            margin: 0,
            width: '100%',
            height: '100%',
          }}
          aria-label="Arraste para simular um período"
          aria-valuetext={periodLabel}
        />
      </div>
    </div>
  )
}
