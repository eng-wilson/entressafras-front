import { Fragment, useMemo, type ReactNode } from 'react'
import { rankRotations } from '../logic/rank'
import { classeSeguranca, rotationStatus } from '../logic/status'
import type { Resiliencia } from '../logic/resiliencia'
import { textoCritico, type Diagnostico, type PeriodoCritico } from '../logic/diagnostico'
import { useConjunto } from '../state/conjunto'
import { COR_ROT } from '../logic/aptidao'
import { t } from '../i18n'

// Barra com rótulo = safra (na ordem de safras da rotação) e ganha a cor da própria resiliência; sem rótulo = pousio.
const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

type Props = {
  res: Resiliencia | null
  /** Rotação selecionada (posição no conjunto de rotações). */
  sel: number
  /** Seleciona a rotação; com `idx`, leva a simulação a esse decêndio (senão, ao período decisivo). */
  onSel: (rot: number, idx?: number) => void
  diags: Diagnostico[] | null
  /** Decêndio simulado: cursor na linha selecionada. */
  idx: number
  /** Linha de rascunho "Nova rotação", acima das rotações. */
  rascunho?: ReactNode
  /** Remove uma rotação salva pelo agricultor (tag "Nova"). */
  onRemoverSalva?: (id: string) => void
  /**
   * Modo Comparação: as mesmas linhas, com uma caixa na cor da rotação (a mesma dos cards e do mapa) para marcar o
   * que comparar. Clicar na linha marca ou desmarca; o cursor do decêndio some (a comparação vale para o ciclo todo).
   */
  cmp?: { sel: number[]; onToggle: (rot: number) => void }
}

/** Trecho da barra (em % da largura dela) ocupado pelo período crítico, pela janela real da safra em decêndios. */
function trecho(p: PeriodoCritico, de: number, ate: number) {
  const n = ate - de + 1
  return { left: `${((p.de - de) / n * 100).toFixed(2)}%`, width: `${((p.ate - p.de + 1) / n * 100).toFixed(2)}%` }
}

export function CalendarRows({ res, sel, onSel, diags, idx, rascunho, onRemoverSalva, cmp }: Props) {
  const { rotacoes: ROTATIONS } = useConjunto()
  const rpos = useMemo(() => rankRotations(ROTATIONS), [ROTATIONS])
  const statuses = useMemo(
    () => ROTATIONS.map((_, ri) => {
      const rot = res?.rotacoes[ri]
      return rot ? rotationStatus(rot.safras.map(s => [s.risco?.pct ?? null, t(s.nome).toLowerCase()])) : null
    }),
    [res, ROTATIONS],
  )

  // Ordem na tela: a rotação atual do talhão (última cadastrada) primeiro, para servir de referência; depois as
  // demais pela posição no ranking. O número de cada linha continua sendo a posição no ranking.
  const sorted = useMemo(
    () => [...ROTATIONS].sort((a, b) =>
      Number(!!b.ct.atual) - Number(!!a.ct.atual) || rpos[ROTATIONS.indexOf(a)] - rpos[ROTATIONS.indexOf(b)]),
    [rpos, ROTATIONS]
  )

  return (
    <>
    {rascunho}
    <div className="rlist" role="list" aria-label={t('Rotações de cultura')}>
      {sorted.map((rot, pos) => {
        const ri = ROTATIONS.indexOf(rot)
        const st = statuses[ri]
        const safras = res?.rotacoes[ri].safras
        const rank = rpos[ri] + 1
        const isLast = pos === sorted.length - 1
        const criticos = diags?.[ri].criticos ?? []
        const nome = t(rot.ct.c1), depois = minuscula(t(rot.ct.c2))
        const marcada = !!cmp?.sel.includes(ri)
        // Na comparação, a linha marca para comparar; no calendário, seleciona a rotação.
        const acionar = () => (cmp ? cmp.onToggle(ri) : onSel(ri))

        // Separa a rotação do agricultor (no topo) das sugestões da API.
        const separar = pos === 1 && !!sorted[0].ct.atual
        return (
          <Fragment key={rot.id}>
          {separar && <div className="rlist-sep" aria-hidden="true">{t('Sugestões para o seu talhão')}</div>}
          <div
            className={`row rsel${rot.ct.atual ? ' atual' : ''}${rot.salva ? ' saved' : ''}${!cmp && ri === sel ? ' sel' : ''}${isLast ? ' rlast' : ''}`}
            role="listitem"
            onClick={acionar}
          >
            <div className="rh">
              {cmp && (
                <label className={`ct-ck${marcada ? ' on' : ''}`} style={{ color: COR_ROT[rot.cor] }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={marcada}
                    disabled={marcada && cmp.sel.length === 1}
                    onChange={() => cmp.onToggle(ri)}
                    aria-label={t('Comparar {a} depois {b}', { a: nome, b: depois })}
                  />
                </label>
              )}
              <span className="rk">{rank}</span>
              <button
                type="button"
                className="nm nm-b"
                aria-pressed={cmp ? marcada : ri === sel}
                aria-label={cmp
                  ? (marcada ? t('{a} depois {b}. Tirar da comparação', { a: nome, b: depois }) : t('{a} depois {b}. Comparar', { a: nome, b: depois }))
                  : diags?.[ri].decisivo
                    ? t('{a} depois {b}. Selecionar e ver o período que mais pesa: {periodo}', { a: nome, b: depois, periodo: diags[ri].decisivo!.rotulo })
                    : t('{a} depois {b}. Selecionar', { a: nome, b: depois })}
                onClick={e => { e.stopPropagation(); acionar() }}
              >
                {nome} <span className="then">{t('depois')}</span> {depois}
              </button>
              {rot.ct.atual && (
                <span className="tag tag-atual" title={t('A última rotação do histórico do talhão, para comparar com as sugestões.')}>
                  <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-repeat" /></svg>
                  {t('Seu último plantio')}
                </span>
              )}
              {rot.salva && <span className="tag">{t('Nova')}</span>}
              {rot.maisPragas && (
                <span className="pest">
                  <svg className="ic" aria-hidden="true">
                    <use href="/canvas-icons.svg#i-bug" />
                  </svg>
                  {t('Mais pragas')}
                </span>
              )}
              {/* StatusBadge: CSS tooltip via .ct-tip .ct-tip2 inside .stw */}
              {st && (
              <span
                className={`st stw ${st.cls}`}
                tabIndex={0}
                role="status"
                aria-label={st.aria}
              >
                {'icon' in st && (
                <svg className="ic" aria-hidden="true">
                  <use href={`/canvas-icons.svg#${st.icon.replace('#', '')}`} />
                </svg>
                )}
                {st.label}
                <span className="ct-tip ct-tip2 tip-r" role="tooltip">
                  <b>{st.title}</b>
                  <span>{st.text}</span>
                </span>
              </span>
              )}
              {rot.salva && onRemoverSalva && (
                <button type="button" className="rm-salva" aria-label={t('Remover a rotação salva {a} depois {b}', { a: nome, b: depois })}
                  onClick={e => { e.stopPropagation(); onRemoverSalva(rot.salva!.id) }}>
                  {t('Remover')}
                </button>
              )}
            </div>

            {/* Timeline bars: position is percentage of 12-month timeline */}
            <div className="tl">
              {rot.barras.map((bar, bi) => {
                const sf = safras?.[bi]
                const cls = sf?.seguranca != null ? classeSeguranca(sf.seguranca) : 'none'
                const left = `${(bar.s / 12 * 100).toFixed(2)}%`
                const width = `calc(${((bar.e - bar.s) / 12 * 100).toFixed(2)}% - 2px)`
                const def = rot.safras[bi]
                const crit = bar.label && def ? criticos.filter(p => p.safra === bi) : []
                return bar.label ? (
                  <div key={bi} className={`b ${cls}`} style={{ left, width }}>
                    {/* Período crítico: hachura sobre a fase que reprovou, na cor do nível dela; clicar leva a simulação até lá */}
                    {crit.map(p => (
                      <button
                        key={p.fase}
                        type="button"
                        className={`crit ${p.cls}${p === diags?.[ri].decisivo ? ' top' : ''}`}
                        style={trecho(p, def.de, def.ate)}
                        title={t('{texto} Clique para ver na simulação.', { texto: textoCritico(p) })}
                        aria-label={t('Período crítico. {texto} Ver na simulação.', { texto: textoCritico(p) })}
                        onClick={e => { e.stopPropagation(); onSel(ri, p.de) }}
                      />
                    ))}
                    <span className="bl">{t(bar.label)}</span>
                  </div>
                ) : (
                  <div key={bi} className="b bare" style={{ left, width }} />
                )
              })}
              {/* Cursor do decêndio simulado, só na rotação selecionada (mesma escala das barras: 36 decêndios) */}
              {!cmp && ri === sel && (
                <span className="tl-cur" aria-hidden="true" style={{ left: `${(idx / 36 * 100).toFixed(3)}%` }} />
              )}
            </div>
          </div>
          </Fragment>
        )
      })}
    </div>
      {diags?.some(d => d.criticos.length) && (
        <p className="crit-lg">
          <span className="crit-sw" aria-hidden="true" />
          {t('Período crítico: fase com o maior déficit de água. Clique para ver na simulação.')}
        </p>
      )}
    </>
  )
}
