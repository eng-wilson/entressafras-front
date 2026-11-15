import type { SoilResult } from '../types'
import { t } from '../i18n'

// Widget de umidade do solo (padrão dos widgets da cena). A posição vem de soilGauge.ts em unidades da
// trilha antiga (0–TRILHA); aqui vira porcentagem da largura do medidor.
const TRILHA = 268
const pct = (x: number) => `${Math.max(0, Math.min(TRILHA, x)) / TRILHA * 100}%`

export function SoilMoistureBar({ soil }: { soil: SoilResult }) {
  const grad = `linear-gradient(90deg, ${soil.c0} 0, ${soil.c1} 45%, ${soil.c2} 45%, ${soil.c3} 55%, ${soil.c4} 55%, ${soil.c5} 100%)`
  const cls = soil.semDado ? 'neu' : soil.cls
  return (
    <div className="pl wg" aria-label={soil.aria}>
      <span className="wg-h">
        <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-drop" /></svg>
        {t('Água para a cultura')}
      </span>
      <span className="wg-v">{soil.val}</span>
      <span className={`pl-s wg-s ${cls}`}>
        <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${soil.icon.replace('#', '')}`} /></svg>
        {soil.label}
      </span>
      {!soil.semDado && <div className="wg-g" aria-hidden="true">
        <div className="wg-tr" style={{ background: grad }}>
          {soil.m1 != null && <b className="claro" style={{ left: pct(soil.m1) }} />}
          {soil.m2 != null && <b className="claro" style={{ left: pct(soil.m2) }} />}
          <span className={`wg-dot ${soil.cls}`} style={{ left: pct(soil.cx) }} />
        </div>
      </div>}
      <span className="wg-f">{soil.unit}</span>
    </div>
  )
}
