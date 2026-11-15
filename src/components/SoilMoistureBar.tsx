import type { SoilResult } from '../types'

// Widget de umidade do solo (padrão dos widgets da cena). A posição vem de soilGauge.ts em unidades da
// trilha antiga (0–TRILHA); aqui vira porcentagem da largura do medidor.
const TRILHA = 268
const pct = (x: number) => `${Math.max(0, Math.min(TRILHA, x)) / TRILHA * 100}%`

export function SoilMoistureBar({ soil }: { soil: SoilResult }) {
  const grad = `linear-gradient(90deg, ${soil.c0} 0, ${soil.c1} 33%, ${soil.c2} 33%, ${soil.c3} 60%, ${soil.c4} 60%, ${soil.c5} 100%)`
  return (
    <div className="pl wg" aria-label={soil.aria}>
      <span className="wg-h">
        <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-drop" /></svg>
        Umidade do solo
      </span>
      <span className="wg-v">{soil.val}</span>
      <span className={`pl-s wg-s ${soil.cls}`}>
        <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${soil.icon.replace('#', '')}`} /></svg>
        {soil.label}
      </span>
      <div className="wg-g" aria-hidden="true">
        <div className="wg-tr" style={{ background: grad }}>
          {soil.m1 != null && <b className="claro" style={{ left: pct(soil.m1) }} />}
          {soil.m2 != null && <b className="claro" style={{ left: pct(soil.m2) }} />}
          <span className={`wg-dot ${soil.cls}`} style={{ left: pct(soil.cx) }} />
        </div>
      </div>
      <span className="wg-f">{soil.unit}</span>
    </div>
  )
}
