import { useState } from 'react'
import type { RotacaoDef } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import {
  aptidao, COR_ROT, detalheSafra, faixa, faixaAnos, motivo, motivoDetalhe, NOME_EIXO as NOME, nomeRot,
  PISO, resultadoSafra, textoNivel, reais, receitaSafra, type Eixo, type Faixa,
} from '../logic/aptidao'
import type { Resiliencia, ResRotacao, ResSafra } from '../logic/resiliencia'
import { janelaLabel as janela } from '../logic/periodo'
import { MemoriaCalculo } from './MemoriaCalculo'
import type { Priority } from '../types'

const S = 320 // lado do SVG
const C = S / 2 // centro = 0
const R = 128 // do centro à borda do quadrado (canto = 100)
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
/** Resiliência usa os níveis de risco do ZARC; os demais eixos, a nota 0–100. */
const faixaOu = (k: Eixo, v: number | null, rot: ResRotacao | null): Faixa | typeof SEM_DADO =>
  v == null ? SEM_DADO : k === 'risco' && rot?.anos != null ? faixaAnos(rot.anos) : faixa(v)

function Nota({ f }: { f: Faixa | typeof SEM_DADO }) {
  return (
    <>
      <span className={`qm-dots ${f.cls}`} aria-hidden="true">
        {[1, 2, 3].map(n => <i key={n} className={n <= f.nivel ? 'f' : undefined} />)}
      </span>
      <span className={`qm-fx ${f.cls}`}>{f.rotulo}</span>
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
        <b>{n === 0 ? '1ª safra' : s.cobertura ? '2ª safra · cobertura' : '2ª safra'}</b> {s.nome}
        <span className="qm-sfd">{janela(s.de, s.ate)}</span>
      </span>
      <ul className="qm-ev">
        <li title={detalheSafra(s)}>
          <span className="qm-en">{NOME.risco}</span>
          {s.anos == null ? (
            <>
              <Nota f={SEM_DADO} />
              <span className="qm-why">sem critério do ZARC para esta cultura</span>
            </>
          ) : (
            <>
              <Nota f={faixaAnos(s.anos)} />
              <span className="qm-why">{resultadoSafra(s)} · {textoNivel(s.anos)}</span>
            </>
          )}
        </li>
        <li title="Consumo de água da cultura no ciclo (Kc × ET0) e chuva média na mesma janela">
          <span className="qm-en">Consumo de água</span>
          <span className="qm-why qm-span">{s.consumo == null ? 'sem dado' : `~${s.consumo} mm no ciclo`}{s.chuva != null && ` · chove ~${s.chuva} mm em média`}</span>
        </li>
        <li>
          <span className="qm-en">Receita</span>
          <span className="qm-why qm-span">{receita ? reais(receita) : 'não é vendida'}</span>
        </li>
      </ul>
      <button type="button" className="qm-more" onClick={() => setMemoria(true)}>De onde vêm estes números</button>
      {memoria && (
        <MemoriaCalculo
          s={s} n={n} rotacao={nomeRot(r)} rotId={r.id} api={r.safras[n]?.api}
          onFechar={() => setMemoria(false)}
        />
      )}
    </li>
  )
}

type Props = { sel: number[]; pr: Priority; res: Resiliencia | null }

export function QuadMap({ sel, pr, res }: Props) {
  const { rotacoes: rots } = useConjunto()
  const [abertas, setAbertas] = useState<number[]>([])
  const alternar = (i: number) => setAbertas(a => (a.includes(i) ? a.filter(x => x !== i) : [...a, i]))
  const dados = sel.map(i => {
    const rot = res?.rotacoes[i] ?? null
    return { i, rot, a: aptidao(i, rot, rots) }
  })
  const resumo = dados
    .map(d => `${nomeRot(rots[d.i])}: ${ORDEM.map(k => `${NOME[k]} ${faixaOu(k, d.a[k], d.rot).rotulo.toLowerCase()}`).join(', ')}`)
    .join('; ')

  return (
    <section className="field qmap" aria-labelledby="t-qmap">
      <div className="fh">
        <span className="fl" id="t-qmap">
          <svg className="ic" aria-hidden="true">
            <use href="/canvas-icons.svg#i-layers" />
          </svg>
          Aptidão por prioridade
        </span>
        <span className="qm-sub">Quanto mais perto do canto, melhor naquela prioridade</span>
      </div>

      <div className="qm-g">
        <svg className="qm-svg" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`Mapa de aptidão. ${resumo}`}>
          {/* quadrantes: prioridade marcada pelo agricultor ganha fundo azul */}
          {ORDEM.map(k => {
            const [dx, dy] = DIR[k]
            return (
              <rect
                key={k}
                x={dx < 0 ? L : C}
                y={dy < 0 ? L : C}
                width={R}
                height={R}
                className={`qm-q${pr[k] ? ' on' : ''}`}
              />
            )
          })}
          {/* quadrados concêntricos = mesmo valor nos quatro eixos */}
          {[25, 50, 75, 100].map(v => {
            const h = (R * v) / 100
            return (
              <rect key={v} x={C - h} y={C - h} width={h * 2} height={h * 2} className={`qm-ring${v === 100 ? ' out' : ''}`} />
            )
          })}
          <line x1={C} y1={L - 6} x2={C} y2={S - L + 6} className="qm-ax" />
          <line x1={L - 6} y1={C} x2={S - L + 6} y2={C} className="qm-ax" />
          {ORDEM.map(k => {
            const [x, y] = ponto(k, 100)
            return <line key={k} x1={C} y1={C} x2={x} y2={y} className="qm-diag" />
          })}

          {/* uma área por rotação selecionada */}
          {dados.map(({ i, a }) => (
            <g key={i} className="qm-rot" style={{ color: COR_ROT[rots[i].cor] }}>
              <polygon
                points={ORDEM.map(k => ponto(k, a[k] ?? PISO).join(',')).join(' ')}
                className={`qm-poly${rots[i].ct.atual ? ' atual' : ''}`}
              />
              {ORDEM.map(k => {
                const [x, y] = ponto(k, a[k] ?? PISO)
                return (
                  <circle key={k} cx={x} cy={y} r={4.5} className={`qm-pt${a[k] == null ? ' nd' : ''}`}>
                    <title>{`${nomeRot(rots[i])} · ${NOME[k]}: ${a[k] ?? 'sem dado'}`}</title>
                  </circle>
                )
              })}
            </g>
          ))}
          <circle cx={C} cy={C} r={3} className="qm-o" />

          {/* rótulos como no esboço: nomes fora do quadrado, 100 nos cantos, 0 no centro */}
          <text x={L} y={L - 12} className={`qm-lb${pr.risco ? ' on' : ''}`}>{NOME.risco}</text>
          <text x={S - L} y={L - 12} textAnchor="end" className={`qm-lb${pr.agua ? ' on' : ''}`}>{NOME.agua}</text>
          <text x={L} y={S - L + 22} className={`qm-lb${pr.prod ? ' on' : ''}`}>{NOME.prod}</text>
          <text x={S - L} y={S - L + 22} textAnchor="end" className={`qm-lb${pr.solo ? ' on' : ''}`}>{NOME.solo}</text>
          <text x={C + 6} y={C - 6} className="qm-n">0</text>
          <text x={L - 8} y={L + 4} textAnchor="end" className="qm-n">100</text>
          <text x={S - L + 8} y={L + 4} className="qm-n">100</text>
          <text x={L - 8} y={S - L + 4} textAnchor="end" className="qm-n">100</text>
          <text x={S - L + 8} y={S - L + 4} className="qm-n">100</text>
        </svg>

        <ul className="qm-lg">
          {dados.map(({ i, a, rot }) => {
            const aberta = abertas.includes(i) && !!rot
            return (
            <li key={i}>
              <span className={`qm-sw${rots[i].ct.atual ? ' atual' : ''}`} style={{ color: COR_ROT[rots[i].cor] }} />
              <div>
                <b>
                  {nomeRot(rots[i])}
                  {rots[i].ct.atual && <span className="ct-tag">Atual</span>}
                </b>
                <ul className="qm-ev">
                  {ORDEM.map(k => {
                    const m = motivo(rots[i], k, rot)
                    const d = motivoDetalhe(k, rot)
                    return (
                      <li key={k} className={pr[k] ? 'on' : undefined} title={`${a[k] == null ? 'Sem nota' : `Nota ${a[k]} de 100`}${d ? `
${d}` : ''}`}>
                        <span className="qm-en">{NOME[k]}</span>
                        <Nota f={faixaOu(k, a[k], rot)} />
                        <span className="qm-why">{m}</span>
                      </li>
                    )
                  })}
                </ul>
                {rot && (
                  <button
                    type="button"
                    className="qm-more"
                    aria-expanded={aberta}
                    aria-controls={`qm-sf-${i}`}
                    onClick={() => alternar(i)}
                  >
                    {aberta ? 'Ocultar safras' : 'Ver por safra'}
                  </button>
                )}
                {aberta && (
                  <div id={`qm-sf-${i}`}>
                    <ul className="qm-sfs">
                      {rot.safras.map((s, n) => <Safra key={n} r={rots[i]} n={n as 0 | 1} s={s} />)}
                    </ul>
                    <p className="qm-sfn">Economia de água e saúde do solo valem para o ciclo inteiro: dependem de como as duas safras se combinam.</p>
                  </div>
                )}
              </div>
            </li>
            )
          })}
          {sel.length < 2 && <li className="qm-hint">Marque mais uma rotação na tabela para comparar.</li>}
        </ul>
      </div>
    </section>
  )
}
