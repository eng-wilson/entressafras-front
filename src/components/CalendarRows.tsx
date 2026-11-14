import { useMemo } from 'react'
import { FREQ } from '../data/mock'
import { rankRotations } from '../logic/rank'
import { rotationStatus } from '../logic/status'
import type { Priority } from '../types'

type BarDef = { cls: 'good' | 'warn' | 'risk' | 'bare' | null; s: number; e: number; label: string }
type RotDef = {
  id: 'r1' | 'r2' | 'r3' | 'r4'
  name: string
  after: string
  atual?: boolean
  hasPest?: boolean
  bars: BarDef[]
}

// null bar class → inherits the rotation's status class
const ROTATIONS: RotDef[] = [
  {
    id: 'r1', name: 'Soja', after: 'crotalária + milheto',
    bars: [
      { cls: 'good', s: 1.7, e: 5.3, label: 'Soja' },
      { cls: null, s: 5.3, e: 9.4, label: 'Crotalária + milheto' },
      { cls: 'bare', s: 9.4, e: 12, label: '' },
    ],
  },
  {
    id: 'r2', name: 'Soja', after: 'sorgo',
    bars: [
      { cls: 'good', s: 1.7, e: 5.3, label: 'Soja' },
      { cls: null, s: 5.4, e: 9.4, label: 'Sorgo' },
      { cls: 'bare', s: 9.4, e: 12, label: '' },
    ],
  },
  {
    id: 'r3', name: 'Soja precoce', after: 'milho + braquiária',
    bars: [
      { cls: 'good', s: 1, e: 4.4, label: 'Soja precoce' },
      { cls: null, s: 4.4, e: 9, label: 'Milho + braquiária' },
      { cls: 'bare', s: 9, e: 12, label: '' },
    ],
  },
  {
    id: 'r4', name: 'Soja', after: 'milho safrinha', atual: true, hasPest: true,
    bars: [
      { cls: null, s: 1.7, e: 5.3, label: 'Soja' },
      { cls: 'good', s: 5.6, e: 9.6, label: 'Milho safrinha' },
      { cls: 'bare', s: 9.6, e: 12, label: '' },
    ],
  },
]

export function CalendarRows({ pr }: { pr: Priority }) {
  const rpos = useMemo(() => rankRotations(pr), [pr])
  const statuses = useMemo(() => ({
    r1: rotationStatus(FREQ.r1),
    r2: rotationStatus(FREQ.r2),
    r3: rotationStatus(FREQ.r3),
    r4: rotationStatus(FREQ.r4),
  }), [])

  // Sort rows in DOM order by rank position (not CSS order)
  const sorted = useMemo(
    () => [...ROTATIONS].sort((a, b) => {
      const ia = ROTATIONS.indexOf(a)
      const ib = ROTATIONS.indexOf(b)
      return rpos[ia] - rpos[ib]
    }),
    [rpos]
  )

  return (
    <div className="rlist" role="list" aria-label="Rotações de cultura">
      {sorted.map(rot => {
        const ri = ROTATIONS.indexOf(rot)
        const st = statuses[rot.id]
        const rank = rpos[ri] + 1
        const isLast = rpos[ri] === 3

        return (
          <div
            key={rot.id}
            className={`row${rot.atual ? ' sel' : ''}${isLast ? ' rlast' : ''}`}
            role="listitem"
          >
            <div className="rh">
              <span className="rk">{rank}</span>
              <span className="nm">
                {rot.name} <span className="then">depois</span> {rot.after}
              </span>
              {rot.atual && <span className="tag">Atual</span>}
              {rot.hasPest && (
                <span className="pest">
                  <svg className="ic" aria-hidden="true">
                    <use href="/canvas-icons.svg#i-bug" />
                  </svg>
                  Mais pragas
                </span>
              )}
              {/* StatusBadge: CSS tooltip via .ct-tip .ct-tip2 inside .stw */}
              <span
                className={`st stw ${st.cls}`}
                tabIndex={0}
                role="status"
                aria-label={st.aria}
              >
                <svg className="ic" aria-hidden="true">
                  <use href={`/canvas-icons.svg#${st.icon.replace('#', '')}`} />
                </svg>
                {st.label}
                <span className="ct-tip ct-tip2 tip-r" role="tooltip">
                  <b>{st.title}</b>
                  <span>{st.text}</span>
                </span>
              </span>
            </div>

            {/* Timeline bars: position is percentage of 12-month timeline */}
            <div className="tl">
              {rot.bars.map((bar, bi) => {
                const cls = bar.cls ?? st.cls
                const left = `${(bar.s / 12 * 100).toFixed(2)}%`
                const width = `calc(${((bar.e - bar.s) / 12 * 100).toFixed(2)}% - 2px)`
                return bar.label ? (
                  <div key={bi} className={`b ${cls}`} style={{ left, width }}>
                    {bar.label}
                  </div>
                ) : (
                  <div key={bi} className="b bare" style={{ left, width }} />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
