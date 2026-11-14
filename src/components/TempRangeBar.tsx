import type { TempResult } from '../types'

export function TempRangeBar({ temp }: { temp: TempResult }) {
  const W = 268

  return (
    <div className="pl" aria-label={temp.aria}>
      <div className="pl-r">
        <svg className="ic" aria-hidden="true">
          <use href="/canvas-icons.svg#i-temp" />
        </svg>
        <span>Temperatura</span>
        <span className={`pl-s ${temp.cls}`}>
          <svg className="ic" aria-hidden="true">
            <use href={`/canvas-icons.svg#${temp.icon.replace('#', '')}`} />
          </svg>
          {temp.label}
        </span>
      </div>
      <div className="pl-b" style={{ position: 'relative' }} aria-hidden="true">
        <svg viewBox="-8 0 284 16" width="100%" height="16">
          <defs>
            <linearGradient id="tg-grad" x1="0" x2="1">
              <stop offset={temp.z0} stopColor={temp.c0} />
              <stop offset={temp.z1} stopColor={temp.c1} />
              <stop offset={temp.z2} stopColor={temp.c2} />
              <stop offset={temp.z3} stopColor={temp.c3} />
              <stop offset={temp.z4} stopColor={temp.c4} />
              <stop offset={temp.z5} stopColor={temp.c5} />
              <stop offset={temp.z6} stopColor={temp.c6} />
              <stop offset={temp.z7} stopColor={temp.c7} />
              <stop offset={temp.z8} stopColor={temp.c8} />
            </linearGradient>
          </defs>
          {/* Full track (opacity .4) */}
          <rect x="0" y="5" width={W} height="6" rx="3" fill="url(#tg-grad)" opacity=".4" />
          {/* Min–max capsule */}
          <rect x={temp.rx} y="2.5" width={temp.rw} height="11" rx="5.5"
            fill="url(#tg-grad)" stroke="white" strokeWidth="1.5" />
          {/* Threshold marks */}
          {temp.x1 >= 0 && <line x1={temp.x1} y1="1" x2={temp.x1} y2="15" stroke="rgba(0,0,0,.2)" strokeWidth="1" />}
          {temp.x2 >= 0 && <line x1={temp.x2} y1="1" x2={temp.x2} y2="15" stroke="rgba(0,0,0,.2)" strokeWidth="1" />}
          {temp.x3 >= 0 && <line x1={temp.x3} y1="1" x2={temp.x3} y2="15" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />}
          {temp.x4 >= 0 && <line x1={temp.x4} y1="1" x2={temp.x4} y2="15" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />}
        </svg>
        {/* Callouts: merged when distance < 19% of track */}
        {temp.merged ? (
          <div className="vtag" style={{ position: 'absolute', top: '100%', left: `calc(${(temp.loX + temp.rw / 2) / W * 100}% - 36px)`, marginTop: 4 }}>
            <span className="mk">mín {temp.loLabel} máx {temp.hiLabel}</span>
          </div>
        ) : (
          <>
            <div className="vtag" style={{ position: 'absolute', top: '100%', left: `calc(${temp.loX / W * 100}% - 20px)`, marginTop: 4 }}>
              <span className="mk">mín {temp.loLabel}</span>
            </div>
            <div className="vtag" style={{ position: 'absolute', top: '100%', left: `calc(${temp.hiX / W * 100}% - 20px)`, marginTop: 4 }}>
              <span className="mk">máx {temp.hiLabel}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
