import { useRef, useCallback } from 'react'
import { MONTHS_SHORT } from '../data/mock'
import type { Decendio } from '../types'
import { classeChuva, classeChuvaDecendio, ROTULO_CHUVA, iconeChuva } from '../logic/chuva'
import { chuvaMeses, climaDoPeriodo } from '../logic/clima'
import { periodoLabel, mesDe, decendioDoMes } from '../logic/periodo'
import { inteiro } from '../logic/formato'
import type { Diagnostico } from '../logic/diagnostico'
import { ROTULO_CLASSE, type FaixaCalendario } from '../logic/rascunho'

type Props = {
  idx: number; decendios: Decendio[] | null; onIdx: (i: number) => void
  /** Diagnóstico da rotação selecionada: marca os decêndios críticos e a zona que mais pesa. */
  diag?: Diagnostico | null
  /** Rascunho aberto: cor de risco de plantar a cultura selecionada em cada decêndio (sweep da API). */
  faixa?: FaixaCalendario | null
}

export function MonthStrip({ idx, onIdx, decendios, diag = null, faixa = null }: Props) {
  const zona = diag?.decisivo ?? null
  const naZonaIdx = !!zona && idx >= zona.de && idx <= zona.ate
  /**
   * Zona que mais pesa: cada número ganha o fundo do nível; juntos formam uma faixa contínua que cobre a
   * divisória dos meses. Pontas arredondadas (zs/ze); o decêndio simulado fica sólido (zcur).
   */
  const marca = (i: number) => {
    if (faixa) {
      const p = faixa.pontos[i]
      return p ? `z ${p.cls}${p.regional ? ' reg' : ''}${i === faixa.melhor ? ' zm' : ''}` : ''
    }
    if (!zona || i < zona.de || i > zona.ate) return ''
    return `zc ${zona.cls}${i === zona.de ? ' zs' : ''}${i === zona.ate ? ' ze' : ''}${i === idx ? ' zcur' : ''}`
  }
  /** Dica do decêndio colorido: "Plantio em 1 a 10 de setembro: favorável; fora da data usual da região". */
  const tituloFaixa = (i: number) => {
    const p = faixa?.pontos[i]
    if (!p) return undefined
    const temp = p.temperaturaOk ? '' : ', temperatura fora dos limites da cultura'
    return `Plantio em ${periodoLabel(i)}: ${ROTULO_CLASSE[p.cls].toLowerCase()}${temp}; ${p.regional ? 'dentro' : 'fora'} da data usual da região`
  }
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
  const naZona = naZonaIdx ? ', período que mais pesa no clima da rotação' : ''
  const sliderText = periodoLabel(idx) + naZona + (mm == null ? ', chuva sem dado' : `, ${ROTULO_CHUVA[classeChuvaDecendio(mm)]}, ${inteiro(mm)} milímetros no decêndio`) + (periodo.tmin == null || periodo.tmax == null ? '' : `, de ${inteiro(periodo.tmin)} a ${inteiro(periodo.tmax)} graus`)

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
                {[0, 1, 2].map(d => <i key={d} className={marca(mi * 3 + d) || undefined} title={tituloFaixa(mi * 3 + d)}>{d + 1}</i>)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Número do decêndio acima do knob — absoluto relativo ao wrapper */}
      {/* Dentro da zona, o decêndio simulado já aparece sólido na faixa: o número flutuante sai */}
      <span className="selnum" style={{ left: knobPct, visibility: naZonaIdx ? 'hidden' : undefined }} aria-hidden="true">
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
        {/* Zona que mais pesa no selo da rotação selecionada, sobre o trilho */}
        {zona && (
          <span className="zrail" aria-hidden="true">
            <span
              className={`zseg ${zona.cls}`}
              style={{ left: `${Math.max(0, (zona.de - 0.5) / 35 * 100).toFixed(3)}%`, width: `${((zona.ate - zona.de + 1) / 35 * 100).toFixed(3)}%` }}
            />
          </span>
        )}
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
