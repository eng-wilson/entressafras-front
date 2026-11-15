import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import './quadmap.css'
import type { RotacaoDef } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import {
  aptidao, COR_ROT, detalheSafra, faixa, faixaDaNota, motivo, motivoDetalhe, NOME_EIXO as NOME, nomeRot,
  PISO, resultadoSafra, reais, receitaSafra, type Eixo, type Faixa,
} from '../logic/aptidao'
import { BarraPrioridade } from './BarraPrioridade'
import type { Resiliencia, ResRotacao, ResSafra } from '../logic/resiliencia'
import { janelaLabel as janela } from '../logic/periodo'
import { MemoriaCalculo } from './MemoriaCalculo'
import type { Priority } from '../types'
import { ordinal, reaisFmt, t } from '../i18n'

const S = 360 // lado do SVG
const C = S / 2 // centro = 0
const R = 144 // do centro à borda do quadrado (canto = 100); margem só para os rótulos
const L = C - R // borda esquerda/superior do quadrado

// Cada prioridade é um quadrante; o eixo corre do centro (0) até o canto (100).
const DIR: Record<Eixo, [number, number]> = {
  risco: [-1, -1],
  agua: [1, -1],
  solo: [1, 1],
  prod: [-1, 1],
}
const ORDEM: Eixo[] = ['risco', 'agua', 'solo', 'prod']

const ponto = (k: Eixo, v: number): [number, number] => {
  const [dx, dy] = DIR[k]
  return [C + (dx * R * v) / 100, C + (dy * R * v) / 100]
}

const SEM_DADO = { nivel: 0, rotulo: 'Sem dado', cls: 'nd' } as const

/** Rótulo de origem: a rotação atual do talhão, uma salva pelo agricultor ou a posição na recomendação da API. */
const origem = (rots: RotacaoDef[], i: number) =>
  rots[i].historico ? t('Sua rotação atual (histórico)')
    : rots[i].salva ? t('Salva')
      : t('Recomendada · {ord}', { ord: ordinal(rots.slice(0, i + 1).filter(x => !x.salva && !x.historico).length) })

/** Eixo de maior nota: o número da rotação fica nesse vértice, para não depender só da cor. */
const melhorEixo = (a: Record<Eixo, number | null>) =>
  ORDEM.reduce((m, k) => ((a[k] ?? -1) > (a[m] ?? -1) ? k : m), ORDEM[0])

function Nota({ f }: { f: Faixa | typeof SEM_DADO }) {
  return (
    <>
      <span className={`qm-dots ${f.cls}`} aria-hidden="true">
        {[1, 2, 3].map(n => <i key={n} className={n <= f.nivel ? 'f' : undefined} />)}
      </span>
      <span className={`qm-fx ${f.cls}`}>{t(f.rotulo)}</span>
    </>
  )
}

/** Uma safra da rotação: resiliência (do clima), consumo de água e receita. */
function Safra({ r, n, s }: { r: RotacaoDef; n: 0 | 1; s: ResSafra }) {
  const receita = receitaSafra(r.ct, n)
  const [memoria, setMemoria] = useState(false)
  return (
    <li className="qm-sf">
      <span className="qm-sfh">
        <b>{n === 0 ? t('{ord} safra', { ord: ordinal(1) }) : s.cobertura ? t('{ord} safra · cobertura', { ord: ordinal(2) }) : t('{ord} safra', { ord: ordinal(2) })}</b> <strong>{t(s.nome)}</strong>
        <span className="qm-sfd">{janela(s.de, s.ate)}</span>
      </span>
      <ul className="qm-ev">
        <li title={detalheSafra(s)}>
          <span className="qm-en">{t(NOME.risco)}</span>
          {s.seguranca == null ? (
            <>
              <Nota f={SEM_DADO} />
              <span className="qm-why">{t('a API não trouxe o risco desta cultura')}</span>
            </>
          ) : (
            <>
              <Nota f={faixa(s.seguranca)} />
              <span className="qm-why">{resultadoSafra(s)}</span>
            </>
          )}
        </li>
        <li title={t('Consumo de água da cultura no ciclo (Kc × ET0) e chuva média na mesma janela')}>
          <span className="qm-en">{t('Consumo de água')}</span>
          <span className="qm-why qm-span">{s.consumo == null ? t('sem dado') : t('~{mm} mm no ciclo', { mm: s.consumo })}{s.chuva != null && ` · ${t('chove ~{mm} mm em média', { mm: s.chuva })}`}</span>
        </li>
        <li>
          <span className="qm-en">{t('Receita')}</span>
          <span className="qm-why qm-span">{receita ? reais(receita) : t('não é vendida')}</span>
        </li>
      </ul>
      <button type="button" className="qm-more" onClick={() => setMemoria(true)}>{t('De onde vêm estes números')}</button>
      {memoria && (
        <MemoriaCalculo
          s={s} n={n} rotacao={nomeRot(r)} rotId={r.id} api={r.safras[n]?.api}
          onFechar={() => setMemoria(false)}
        />
      )}
    </li>
  )
}

/** Detalhe por safra de uma rotação, em modal (no card, a lista expandida quebrava a grade). */
function PorSafra({ r, rot, num, onFechar }: { r: RotacaoDef; rot: ResRotacao; num: number; onFechar: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialogo.current!
    el.showModal()
    return () => el.close()
  }, [])
  return createPortal(
    <dialog className="culturas-dialog qm-modal" ref={dialogo} aria-labelledby="qm-ps-titulo" onClose={e => { if (!e.currentTarget.open) onFechar() }}>
      <header>
        <div className="qm-ch">
          <span className={`qm-num${r.ct.atual ? ' atual' : ''}`} style={{ '--qm-cor': COR_ROT[r.cor] } as CSSProperties} aria-hidden="true">{num}</span>
          <div>
            <h2 id="qm-ps-titulo">{nomeRot(r)}</h2>
            <p className="qm-modal-sub">{t('Por safra')}</p>
          </div>
        </div>
        <button className="tbtn" type="button" onClick={onFechar}>{t('Fechar')}</button>
      </header>
      <ul className="qm-sfs">
        {rot.safras.map((s, n) => <Safra key={n} r={r} n={n as 0 | 1} s={s} />)}
      </ul>
      <p className="qm-sfn">{t('Economia de água e saúde do solo valem para o ciclo inteiro: dependem de como as duas safras se combinam.')}</p>
    </dialog>,
    document.body,
  )
}

type Props = { sel: number[]; pr: Priority; res: Resiliencia | null }

export function QuadMap({ sel, pr, res }: Props) {
  const { rotacoes: rots } = useConjunto()
  const [porSafra, setPorSafra] = useState<number | null>(null)
  // Rotação em destaque: mouse ou foco no card (ou mouse na área do gráfico) apaga as outras.
  const [destaque, setDestaque] = useState<number | null>(null)
  const dados = sel.map(i => {
    const rot = res?.rotacoes[i] ?? null
    return { i, rot, a: aptidao(i, rot, rots) }
  })
  const resumo = dados
    .map(d => `${d.i + 1}. ${nomeRot(rots[d.i])}: ${ORDEM.map(k => `${t(NOME[k])} ${t(faixaDaNota(d.a[k])?.rotulo ?? 'Sem dado').toLowerCase()}`).join(', ')}`)
    .join('; ')
  // A seleção fica nas linhas das rotações, abaixo: o botão leva o foco até elas.
  const escolher = () => {
    const quadro = document.getElementById('rotation-board')
    quadro?.scrollIntoView({ block: 'nearest' })
    quadro?.focus()
  }

  return (
    <section className="field qmap" aria-labelledby="t-qmap">
      <header className="qm-h">
        <h2 id="t-qmap">{t('Aptidão por prioridade')}</h2>
        <p>{t('Quanto mais perto do canto, melhor naquela prioridade. Quadrantes em azul: prioridades ligadas.')}</p>
      </header>

      {/* Com 3 ou mais, os cards ocupam duas linhas: o gráfico fica centrado na altura deles. */}
      <div className={`qm-g${sel.length >= 3 ? ' centro' : ''}`}>
        <div className="qm-chart">
          {/* O viewBox corta a margem vazia acima dos rótulos de cima e abaixo dos de baixo. */}
          <svg className="qm-svg" viewBox={`0 12 ${S} ${S - 16}`} role="img" aria-label={t('Mapa de aptidão. {resumo}', { resumo })}>
            {/* quadrantes: prioridade marcada pelo agricultor ganha fundo azul */}
            {ORDEM.map(k => {
              const [dx, dy] = DIR[k]
              return <rect key={k} x={dx < 0 ? L : C} y={dy < 0 ? L : C} width={R} height={R} className={`qm-q${pr[k] ? ' on' : ''}`} />
            })}
            {/* quadrados concêntricos = mesmo valor nos quatro eixos */}
            {[25, 50, 75, 100].map(v => {
              const h = (R * v) / 100
              return <rect key={v} x={C - h} y={C - h} width={h * 2} height={h * 2} className={`qm-ring${v === 100 ? ' out' : ''}`} />
            })}
            <line x1={C} y1={L - 6} x2={C} y2={S - L + 6} className="qm-ax" />
            <line x1={L - 6} y1={C} x2={S - L + 6} y2={C} className="qm-ax" />
            {ORDEM.map(k => {
              const [x, y] = ponto(k, 100)
              return <line key={k} x1={C} y1={C} x2={x} y2={y} className="qm-diag" />
            })}

            {/* uma área por rotação marcada, com o número dela no vértice de maior nota */}
            {dados.map(({ i, a }) => {
              const topo = melhorEixo(a)
              const [bx, by] = ponto(topo, a[topo] ?? PISO)
              const estado = destaque == null ? '' : destaque === i ? ' on' : ' dim'
              return (
                <g key={i} className={`qm-rot${estado}`} style={{ color: COR_ROT[rots[i].cor] }}
                  onMouseEnter={() => setDestaque(i)} onMouseLeave={() => setDestaque(null)}>
                  <polygon
                    points={ORDEM.map(k => ponto(k, a[k] ?? PISO).join(',')).join(' ')}
                    className={`qm-poly${rots[i].ct.atual ? ' atual' : ''}`}
                  />
                  {ORDEM.filter(k => k !== topo).map(k => {
                    const [x, y] = ponto(k, a[k] ?? PISO)
                    return (
                      <circle key={k} cx={x} cy={y} r={4.5} className={`qm-pt${a[k] == null ? ' nd' : ''}`}>
                        <title>{`${nomeRot(rots[i])} · ${t(NOME[k])}: ${a[k] ?? t('sem dado')}`}</title>
                      </circle>
                    )
                  })}
                  <circle cx={bx} cy={by} r={9} className="qm-badge">
                    <title>{`${nomeRot(rots[i])} · ${t(NOME[topo])}: ${a[topo] ?? t('sem dado')}`}</title>
                  </circle>
                  <text x={bx} y={by} className="qm-badge-n" aria-hidden="true">{i + 1}</text>
                </g>
              )
            })}
            <circle cx={C} cy={C} r={3} className="qm-o" />

            {/* nomes fora do quadrado, 100 nos cantos, 0 no centro */}
            <text x={L} y={L - 12} className={`qm-lb${pr.risco ? ' on' : ''}`}>{t(NOME.risco)}</text>
            <text x={S - L} y={L - 12} textAnchor="end" className={`qm-lb${pr.agua ? ' on' : ''}`}>{t(NOME.agua)}</text>
            <text x={L} y={S - L + 22} className={`qm-lb${pr.prod ? ' on' : ''}`}>{t(NOME.prod)}</text>
            <text x={S - L} y={S - L + 22} textAnchor="end" className={`qm-lb${pr.solo ? ' on' : ''}`}>{t(NOME.solo)}</text>
            <text x={C + 6} y={C - 6} className="qm-n">0</text>
            <text x={L - 6} y={L + 4} textAnchor="end" className="qm-n">100</text>
            <text x={S - L + 6} y={L + 4} className="qm-n">100</text>
            <text x={L - 6} y={S - L + 4} textAnchor="end" className="qm-n">100</text>
            <text x={S - L + 6} y={S - L + 4} className="qm-n">100</text>
          </svg>
        </div>

        <div className="qm-side">
          <ul className="qm-cards">
            {dados.map(({ i, a, rot }) => {
              const atual = !!rots[i].ct.atual
              return (
                <li
                  key={i}
                  className={`qm-card${destaque === i ? ' on' : ''}`}
                  style={{ '--qm-cor': COR_ROT[rots[i].cor] } as CSSProperties}
                  onMouseEnter={() => setDestaque(i)}
                  onMouseLeave={() => setDestaque(null)}
                  onFocus={() => setDestaque(i)}
                  onBlur={() => setDestaque(null)}
                >
                  <div className="qm-ch">
                    <span className={`qm-num${atual ? ' atual' : ''}`} aria-hidden="true">{i + 1}</span>
                    <span className="qm-nome">{nomeRot(rots[i])}</span>
                    {atual && <span className="ct-tag">{t('Atual')}</span>}
                  </div>
                  <p className="qm-tipo">{origem(rots, i)}</p>
                  <ul className="qm-eixos">
                    {ORDEM.map(k => {
                      const m = motivo(rots[i], k, rot)
                      const d = motivoDetalhe(k, rot)
                      const dica = [m, d].filter(Boolean).join('\n')
                      const lucro = k === 'prod' ? rots[i].lucro : null
                      return (
                        <Fragment key={k}>
                          {/* Mesma linha do painel direito (ícone, nome, barra, faixa), na escala do card */}
                          <li className={`bp-linha bp-compacto${pr[k] ? ' on' : ''}`} title={dica || undefined}>
                            <BarraPrioridade k={k} nota={a[k]} f={faixaDaNota(a[k])} />
                          </li>
                          {/* Lucro estimado da API, dentro de Produtividade; só aparece quando o backend envia */}
                          {lucro != null && (
                            <li className="qm-lucro">
                              <span className="qm-en">{t('Lucro estimado')}</span>
                              <span className={`qm-lucro-v${lucro < 0 ? ' neg' : ''}`}>{reaisFmt(lucro)}/ha</span>
                            </li>
                          )}
                        </Fragment>
                      )
                    })}
                  </ul>
                  {rot && (
                    <button type="button" className="qm-disc" aria-haspopup="dialog" onClick={() => setPorSafra(i)}>
                      <span>{t('Por safra')}</span>
                      <svg viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {porSafra != null && res?.rotacoes[porSafra] && (
            <PorSafra r={rots[porSafra]} rot={res.rotacoes[porSafra]} num={porSafra + 1} onFechar={() => setPorSafra(null)} />
          )}
          {sel.length < 2 && <p className="qm-hint">{t('Marque mais uma rotação na lista abaixo para comparar.')}</p>}
          <button type="button" className="qm-escolher" onClick={escolher}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
            </svg>
            {t('Escolher rotações na lista')}
          </button>
        </div>
      </div>
    </section>
  )
}
