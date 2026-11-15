import type { RotacaoDef } from '../data/mock'
import type { ResRotacao } from '../logic/resiliencia'
import type { Diagnostico } from '../logic/diagnostico'
import { classeAnos } from '../logic/status'
import { diasDe, mesDe } from '../logic/periodo'
import { MONTHS_SHORT } from '../data/mock'

const date = (idx: number) => `${diasDe(idx)} ${MONTHS_SHORT[mesDe(idx)].toLowerCase()}`
const STATUS = { good: 'Favorável', warn: 'Arriscado', risk: 'Desfavorável', none: 'Sem dado' }

/** Equal 0–100 scales: these bars show API values, never progress or a forecast. */
export function RiskBars({ def, rot }: { def: RotacaoDef; rot: ResRotacao | null }) {
  return (
    <figure className="insp-risk-chart" aria-label="Risco hídrico no ciclo por cultura, escala de 0 a 100%">
      <figcaption>Risco hídrico no ciclo</figcaption>
      {def.safras.map((s, n) => {
        const sf = rot?.safras[n]
        const pct = sf?.risco?.pct ?? null
        const cls = sf?.anos != null ? classeAnos(sf.anos) : 'none'
        const label = `${s.nome}: ${pct == null ? 'risco não informado' : `risco hídrico de ${pct}%, ${STATUS[cls]}`}${sf?.risco?.metodo === 'MOCK' ? ', valor provisório' : ''}.`
        return (
          <div className={`insp-risk-row ${cls}`} key={`${s.ref}-${n}`} role="img" aria-label={label}>
            <div className="insp-risk-label" aria-hidden="true"><span>{s.nome}</span><strong>{pct == null ? 'Sem dado' : `${pct}%`}</strong></div>
            <div className={`insp-risk-track${pct == null ? ' missing' : ''}`} aria-hidden="true">
              {pct != null && <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />}
            </div>
          </div>
        )
      })}
      <div className="insp-chart-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
    </figure>
  )
}

/** Same agricultural-year axis as the main calendar. Stages use the existing
 * decêndio mapping; only the critical intervals supplied by diagnosis are marked. */
export function CycleTimeline({ def, rot, diag, onVerPeriodo }: {
  def: RotacaoDef; rot: ResRotacao | null; diag: Diagnostico | null; onVerPeriodo: (idx: number) => void
}) {
  return (
    <figure className="insp-cycle-chart" aria-label="Calendário das culturas, de setembro a agosto">
      <figcaption>Ciclo das culturas</figcaption>
      <div className="insp-chart-axis" aria-hidden="true"><span>Set</span><span>Jan</span><span>Mai</span><span>Ago</span></div>
      {def.safras.map((s, n) => {
        const criticos = diag?.criticos.filter(p => p.safra === n) ?? []
        const critico = criticos.find(p => p === diag?.decisivo) ?? criticos[0]
        const sf = rot?.safras[n]
        return (
          <button key={`${s.ref}-${n}`} type="button" className="insp-cycle-row"
            onClick={() => onVerPeriodo(critico?.de ?? s.de)}
            aria-label={`Ver ciclo de ${s.nome} no calendário. Plantio: ${date(s.de)}; fim: ${date(s.ate)}.${critico ? ` Fase crítica: ${critico.nomeFase}, ${critico.rotulo}.` : ''}`}>
            <span className="insp-cycle-name">{s.nome}<svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></span>
            <span className="insp-cycle-track" aria-hidden="true">
              {[0, 1, 2, 3].map(f => {
                const decs = sf?.calc.decendios.filter(d => d.fase === f) ?? []
                if (!decs.length) return null
                return <span key={f} className={`insp-cycle-stage stage-${f}`} style={{ gridColumn: `${decs[0].idx + 1} / ${decs.at(-1)!.idx + 2}` }} />
              })}
              {!sf && <span className="insp-cycle-stage stage-1" style={{ gridColumn: `${s.de + 1} / ${s.ate + 2}` }} />}
              {criticos.map(p => <span key={p.fase} className={`insp-cycle-critical ${p.cls}`} style={{ gridColumn: `${p.de + 1} / ${p.ate + 2}` }}><svg className="ic"><use href="/canvas-icons.svg#i-alert" /></svg></span>)}
            </span>
          </button>
        )
      })}
      {diag?.decisivo && <p className="insp-cycle-legend"><span className={`insp-critical-key ${diag.decisivo.cls}`} aria-hidden="true" /><span>Fase crítica · {diag.decisivo.rotulo}</span></p>}
    </figure>
  )
}
