import { useMemo } from 'react'
import { rankRotations } from '../logic/rank'
import { NOME_EIXO, SEM_CRITERIO, motivoSafra, resultadoSafra, safraLimitante } from '../logic/aptidao'
import type { Resiliencia, ResSafra } from '../logic/resiliencia'
import { classeAnos } from '../logic/status'
import type { ClimaDecendios } from '../types'
import { MONTHS_SHORT, type ConjuntoRotacoes, type RotacaoDef } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import { diasDe, mesDe } from '../logic/periodo'
import { textoFase, type Diagnostico } from '../logic/diagnostico'

const SELO = {
  good: { icon: 'i-okc', rotulo: 'Bom' },
  warn: { icon: 'i-alert', rotulo: 'Atenção' },
  risk: { icon: 'i-xc', rotulo: 'Risco' },
} as const
const COR_WHY = {
  good: { bg: '#E3F5E8', color: '#1E7A3C' },
  warn: { bg: '#FFF1DB', color: '#9A5B00' },
  risk: { bg: '#FDE2E4', color: '#A3000D' },
} as const

/** Selo de resiliência de uma safra; sem clima, um selo neutro. */
function Selo({ anos }: { anos: number | null | undefined }) {
  if (anos == null) return <span className="gs neu">Sem dado</span>
  const cls = classeAnos(anos)
  return (
    <span className={`gs ${cls}`}>
      <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${SELO[cls].icon}`} /></svg>
      {SELO[cls].rotulo}
    </span>
  )
}

const chuvaBastou = (s: ResSafra | undefined) =>
  !s ? 'Aguardando o clima do talhão.' : s.anos === null ? SEM_CRITERIO : `${maiuscula(resultadoSafra(s))}.`

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
/** "21 a 31 out": o decêndio inteiro, como na API. */
const decendio = (idx: number) => `${diasDe(idx)} ${MONTHS_SHORT[mesDe(idx)].toLowerCase()}`

/** Solo e pragas vêm do perfil local (mock); "O que você ganha" só vale para a rotação que o agricultor já faz. */
function motivosMock(d: RotacaoDef) {
  const r = d.ct
  const cor = (bom: boolean) => (bom ? COR_WHY.good : COR_WHY.warn)
  return [
    { ...cor(r.soil === 'Melhora'), icon: 'i-leaf', title: NOME_EIXO.solo, desc: `${r.soilWhy}.` },
    { ...cor(r.pest === 'Menor risco'), icon: 'i-bug', title: 'Pragas', desc: r.pestWhy },
    ...(r.atual ? [{ ...COR_WHY.good, icon: 'i-check', title: 'O que você ganha', desc: 'Você já conhece as duas culturas e vende os grãos.' }] : []),
  ]
}

/** Fonte das rotações; o "ranking de teste" só aparece enquanto a própria API avisar que ele é MOCK. */
function rodape(c: ConjuntoRotacoes) {
  if (c.origem === 'local') return 'Solo, ciclos e rotações ainda ilustrativos (mock).'
  const mock = c.avisos.some(a => /\bMOCK\b/.test(a))
  return `Rotações e datas: API Entressafras${mock ? ' (ranking ainda de teste)' : ''}. Solo, pragas, produção e preços ilustrativos (mock).`
}

type Props = {
  clima: ClimaDecendios | null
  /** Rotação selecionada (posição no conjunto de rotações). */
  rotIdx: number
  diag: Diagnostico | null
  onVerDados: () => void
  res: Resiliencia | null
}

export function Inspector({ clima, onVerDados, res, rotIdx, diag }: Props) {
  const rot = res?.rotacoes[rotIdx] ?? null
  const conj = useConjunto()
  const rpos = useMemo(() => rankRotations(conj.rotacoes), [conj.rotacoes])
  const selRank = rpos[rotIdx] + 1
  const def = conj.rotacoes[rotIdx]
  const ct = def.ct
  const defs = def.safras
  const lim = rot ? safraLimitante(rot) : null
  const clsLim = lim?.anos != null ? classeAnos(lim.anos) : null
  const whyRisco = {
    ...(clsLim ? COR_WHY[clsLim] : { bg: '#F2F2F7', color: '#3A3A3C' }),
    icon: 'i-shield', title: NOME_EIXO.risco,
    desc: !lim ? 'Aguardando as rotações.' : lim.anos == null ? `${lim.nome}: ${SEM_CRITERIO}` : `${maiuscula(motivoSafra(lim))}.`,
  }

  return (
    <aside className="insp" aria-label="Detalhe da rotação selecionada">
      <div className="eyebrow">Selecionada</div>
      <h2>{ct.c1} <span className="then">depois</span> {minuscula(ct.c2)}</h2>
      <span className="verdict">
        <span className={`dot ${clsLim ?? 'none'}`} />
        {lim ? maiuscula(motivoSafra(lim)) : 'Aguardando o clima do talhão'}
      </span>

      <div className="why dt">
        <h3>Datas da rotação</h3>
        <div className="list">
          {defs.map((d, n) => {
            const sf = rot?.safras[n]
            const crit = diag?.criticos.filter(p => p.safra === n) ?? []
            return (
              <div key={d.nome} className="dt-i">
                <div className="dt-h">
                  <span className="dt-n">
                    <span className="dt-k">{n === 0 ? 'Safra principal' : d.cobertura ? 'Segunda safra · cobertura' : 'Segunda safra'}</span>
                    <strong>{d.nome}</strong>
                  </span>
                  <Selo anos={sf ? sf.anos : undefined} />
                </div>
                <div className="dt-d">
                  <span><small>Plantio</small>{decendio(d.de)}</span>
                  <span><small>Colheita</small>{decendio(d.ate)}</span>
                </div>
                <p>{chuvaBastou(sf)}{crit.map(p => ` ${textoFase(p)}`).join('')}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="why">
        <h3>Por que ficou em {selRank}º</h3>
        <div className="list">
          {[whyRisco, ...motivosMock(def)].map(item => (
            <div key={item.title} className="wi">
              <span className="wic" style={{ background: item.bg, color: item.color }}>
                <svg className="ic" aria-hidden="true">
                  <use href={`/canvas-icons.svg#${item.icon}`} />
                </svg>
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="link" type="button" onClick={onVerDados}>
        Ver todos os dados
        <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
      </button>

      <p className="foot" title={clima?.aviso_resolucao}>
        {clima ? `Chuva e temperatura: ${clima.fonte}, média de ${clima.safras.length} safras (${clima.safras[0]} a ${clima.safras.at(-1)}). Requisitos das culturas: catálogo EcoCrop, quando disponível. ${rodape(conj)} A decisão é sua e do seu agrônomo.` : `Clima indisponível. Requisitos das culturas: catálogo EcoCrop, quando disponível. ${rodape(conj)} A decisão é sua e do seu agrônomo.`}
      </p>
    </aside>
  )
}
