import type { SoilResult } from '../types'

export function SoilMoistureBar({ soil }: { soil: SoilResult }) {
  const W = 268
  const statusColor = soil.cls === 'good' ? 'var(--good)' : soil.cls === 'warn' ? 'var(--warn)' : 'var(--risk)'

  return (
    <div className="pl" aria-label={soil.aria}>
      <div className="pl-r">
        <svg className="ic" aria-hidden="true">
          <use href="/canvas-icons.svg#i-drop" />
        </svg>
        <span>Umidade do solo</span>
        <span className={`pl-s ${soil.cls}`}>
          <svg className="ic" aria-hidden="true">
            <use href={`/canvas-icons.svg#${soil.icon.replace('#', '')}`} />
          </svg>
          {soil.label}
        </span>
      </div>
      <div className="pl-b" style={{ position: 'relative' }} aria-hidden="true">
        <svg viewBox="-8 0 284 16" width="100%" height="16">
          <defs>
            <linearGradient id="sg-grad" x1="0" x2="1">
              <stop offset="0" stopColor={soil.c0} />
              <stop offset=".33" stopColor={soil.c1} />
              <stop offset=".33" stopColor={soil.c2} />
              <stop offset=".6" stopColor={soil.c3} />
              <stop offset=".6" stopColor={soil.c4} />
              <stop offset="1" stopColor={soil.c5} />
            </linearGradient>
          </defs>
          <rect x="0" y="5" width={W} height="6" rx="3" fill="url(#sg-grad)" />
          {soil.m1 != null && (
            <line x1={soil.m1} y1="2" x2={soil.m1} y2="14"
              stroke="white" strokeWidth="1.5" opacity=".6" />
          )}
          {soil.m2 != null && (
            <line x1={soil.m2} y1="2" x2={soil.m2} y2="14"
              stroke="white" strokeWidth="1.5" opacity=".6" />
          )}
          <circle cx={soil.cx} cy="8" r="5.5" fill="white" stroke={statusColor} strokeWidth="2" />
        </svg>
        <div
          className="vtag"
          style={{
            position: 'absolute',
            top: '100%',
            left: `calc(${soil.cx / W * 100}% - 24px)`,
            marginTop: 4,
          }}
        >
          <span className="mk">{soil.val}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--label2)', marginTop: 4 }}>{soil.unit}</div>
    </div>
  )
}
