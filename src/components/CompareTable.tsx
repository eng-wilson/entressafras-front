import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { CT } from '../data/mock'
import { rankRotations } from '../logic/rank'
import type { Priority, StatusLevel } from '../types'

type Props = { pr: Priority }

type Hint = {
  cls: StatusLevel | 'mk-off'
  icon: string
  title: string
  text: string
  aria: string
}

const ICON_OK = '#i-okc'
const ICON_ALERT = '#i-alert'
const ICON_X = '#i-xc'

// Histórico de chuva suficiente (n de 10 anos) -> ícone de status
function hist(n: number | null): Hint {
  if (n == null) return { cls: 'mk-off', icon: ICON_OK, title: '', text: '', aria: '' }
  const [cls, icon, title] =
    n >= 7
      ? (['good', ICON_OK, 'Histórico favorável'] as const)
      : n >= 4
        ? (['warn', ICON_ALERT, 'Histórico arriscado'] as const)
        : (['risk', ICON_X, 'Histórico desfavorável'] as const)
  const text = `Foi suficiente em ${n} dos últimos 10 anos`
  return { cls, icon, title, text, aria: `${title}: ${text.toLowerCase()}` }
}

function pestHint(pest: string, why: string): Hint {
  const lo = /Menor/.test(pest)
  const title = lo ? 'Ciclo de pragas interrompido' : 'Ciclo de pragas mantido'
  return {
    cls: lo ? 'good' : 'warn',
    icon: lo ? ICON_OK : ICON_ALERT,
    title,
    text: why,
    aria: `${title}: ${why}`,
  }
}

function HintIcon({ h }: { h: Hint }) {
  if (h.cls === 'mk-off') return null
  return (
    <span className={`ct-wi ${h.cls}`} tabIndex={0} aria-label={h.aria}>
      <svg className="ic" aria-hidden="true">
        <use href={`/canvas-icons.svg${h.icon}`} />
      </svg>
      <span className="ct-tip ct-tip2" role="tooltip">
        <b>{h.title}</b>
        <span>{h.text}</span>
      </span>
    </span>
  )
}

// Wrappers de semântica ARIA que não participam do layout da grid
const CONTENTS: CSSProperties = { display: 'contents' }

export function CompareTable({ pr }: Props) {
  const rpos = useMemo(() => rankRotations(pr), [pr])

  // Renderiza já na ordem do ranking: foco e leitor de tela seguem a ordem visual
  const sorted = useMemo(
    () => CT.map((r, i) => ({ r, i })).sort((a, b) => rpos[a.i] - rpos[b.i]),
    [rpos],
  )

  return (
    <>
      <div role="table" aria-label="Comparação das rotações" className="ctab">
        <div role="row" style={CONTENTS}>
          <div role="columnheader" className="ct-h">Rotação</div>
          <div role="columnheader" className="ct-h">Umidade necessária</div>
          <div role="columnheader" className="ct-h">Risco de pragas</div>
          <div role="columnheader" className="ct-h">
            Produção <span className="ct-u">(sc/ha)</span>
          </div>
        </div>

        {sorted.map(({ r, i }) => {
          const ra = 2 + rpos[i] * 2
          const rb = ra + 1
          const cur = r.atual ? ' ct-cur' : ''
          const rowA: CSSProperties = { gridRow: ra }
          const rowB: CSSProperties = { gridRow: rb }
          const rowSpan: CSSProperties = { gridRow: `${ra} / span 2` }

          const w1nd = /Sem/.test(r.w1) ? ' ct-nd' : ''
          const w2nd = /Sem/.test(r.w2) ? ' ct-nd' : ''
          const y1nd = /^\d/.test(r.y1) ? '' : ' ct-nd'
          const y2nd = /^\d/.test(r.y2) ? '' : ' ct-nd'
          const pestCls = /Menor/.test(r.pest) ? 'ct-lo' : 'ct-hi'

          return (
            <div key={i} role="row" style={CONTENTS}>
              {/* Rotação: 2 sub-linhas */}
              <div role="cell" style={CONTENTS}>
                <div className={`ct-c ct-rot ct-top${cur}`} style={rowA}>
                  <span className="rk">{rpos[i] + 1}</span>
                  <span className="ct-cn">{r.c1}</span>
                  {r.atual && <span className="ct-tag">Atual</span>}
                </div>
                <div className={`ct-c ct-rot ct-2${cur}`} style={rowB}>
                  <span className="rk ct-ghost" aria-hidden="true" />
                  <span className="ct-cn">
                    <span className="ct-dep">depois</span>
                    {r.c2}
                  </span>
                </div>
              </div>

              {/* Umidade necessária + histórico */}
              <div role="cell" style={CONTENTS}>
                <div className={`ct-c ct-top ct-num ct-wv${w1nd}`} style={rowA}>
                  <span className="ct-wn">{r.w1}</span>
                  <HintIcon h={hist(r.f1)} />
                </div>
                <div className={`ct-c ct-2 ct-num ct-wv${w2nd}`} style={rowB}>
                  <span className="ct-wn">{r.w2}</span>
                  <HintIcon h={hist(r.f2)} />
                </div>
              </div>

              {/* Risco de pragas: 1 célula que ocupa as 2 sub-linhas */}
              <div role="cell" style={CONTENTS}>
                <div className="ct-c ct-top ct-span" style={rowSpan}>
                  <span className={`ct-pst ${pestCls}`}>
                    <span className="ct-pn">{r.pest}</span>
                    <HintIcon h={pestHint(r.pest, r.pestWhy)} />
                  </span>
                </div>
              </div>

              {/* Produção (sc/ha) */}
              <div role="cell" style={CONTENTS}>
                <div className={`ct-c ct-top ct-num${y1nd}`} style={rowA}>{r.y1}</div>
                <div className={`ct-c ct-2 ct-num${y2nd}`} style={rowB}>{r.y2}</div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="cfoot">
        Umidade necessária: água que a cultura consome no ciclo; o ícone mostra se a chuva foi
        suficiente nos últimos 10 anos (passe o mouse). Produção: sacas de 60 kg por hectare,
        valores ilustrativos. A chuva anual do catálogo de culturas é uma referência separada do consumo por ciclo.
      </p>
    </>
  )
}
