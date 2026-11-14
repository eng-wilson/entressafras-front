import type { TempResult } from '../types'

export function TempRangeBar({ temp, carregando = false, carregandoReferencia = false }: { temp: TempResult; carregando?: boolean; carregandoReferencia?: boolean }) {
  const W = 268
  // Match the SVG's eight-unit inset; .vtag centers itself with translateX(-50%).
  const labelLeft = (x: number) => `${(x + 8) / 284 * 100}%`

  return (
    <div className="pl" aria-label={carregando ? 'Temperatura: carregando' : temp.aria}>
      <div className="pl-r">
        <svg className="ic" aria-hidden="true">
          <use href="/canvas-icons.svg#i-temp" />
        </svg>
        <span>Temperatura</span>
        {carregando || carregandoReferencia ? <span className="sk sk-chip" /> : <span className={`pl-s ${temp.semDado || temp.label === 'Sem referência' ? 'neu' : temp.cls}`}>
          <svg className="ic" aria-hidden="true">
            <use href={`/canvas-icons.svg#${temp.icon.replace('#', '')}`} />
          </svg>
          {temp.label}
        </span>}
      </div>
      <div className="pl-b" style={{ position: 'relative', overflow: 'visible', marginBottom: 28 }} aria-hidden="true">
        <svg viewBox="-8 0 284 16" width="100%" height="16" preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="tg-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
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
          {!temp.semDado && <rect x={temp.rx} y="2.5" width={temp.rw} height="11" rx="5.5"
            fill="url(#tg-grad)" stroke="white" strokeWidth="1.5" />}
          {/* Threshold marks */}
          {temp.x1 >= 0 && <line x1={temp.x1} y1="1" x2={temp.x1} y2="15" stroke="rgba(0,0,0,.2)" strokeWidth="1" />}
          {temp.x2 >= 0 && <line x1={temp.x2} y1="1" x2={temp.x2} y2="15" stroke="rgba(0,0,0,.2)" strokeWidth="1" />}
          {temp.x3 >= 0 && <line x1={temp.x3} y1="1" x2={temp.x3} y2="15" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />}
          {temp.x4 >= 0 && <line x1={temp.x4} y1="1" x2={temp.x4} y2="15" stroke="rgba(0,0,0,.35)" strokeWidth="1.5" />}
        </svg>
        {/* Callouts: merged when distance < 19% of track */}
        {temp.semDado ? (
          <div className="vtag" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 }}>{carregando ? <span className="sk sk-chip" /> : 'Sem dado'}</div>
        ) : temp.merged ? (
          <div className="vtag" style={{ position: 'absolute', top: '100%', left: labelLeft(temp.loX + temp.rw / 2), marginTop: 4 }}>
            <span>mín {temp.loLabel} máx {temp.hiLabel}</span>
          </div>
        ) : (
          <>
            <div className="vtag" style={{ position: 'absolute', top: '100%', left: labelLeft(temp.loX), marginTop: 4 }}>
              <span>mín {temp.loLabel}</span>
            </div>
            <div className="vtag" style={{ position: 'absolute', top: '100%', left: labelLeft(temp.hiX), marginTop: 4 }}>
              <span>máx {temp.hiLabel}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
