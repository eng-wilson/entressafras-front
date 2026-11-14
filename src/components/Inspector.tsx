import { useMemo } from 'react'
import { rankRotations } from '../logic/rank'
import type { Priority, ClimaDecendios } from '../types'

const WHY_ITEMS = [
  { bg: '#FDE2E4', color: '#A3000D', icon: 'i-shield', title: 'Menor risco', desc: 'Falta chuva no enchimento da soja, em janeiro.' },
  { bg: '#FFF1DB', color: '#9A5B00', icon: 'i-leaf', title: 'Cuidar do solo', desc: 'Depois do milho, o solo fica descoberto de junho a setembro.' },
  { bg: '#FFF1DB', color: '#9A5B00', icon: 'i-bug', title: 'Pragas', desc: 'Repete soja e milho da safra anterior.' },
  { bg: '#E3F5E8', color: '#1E7A3C', icon: 'i-check', title: 'O que você ganha', desc: 'Você já conhece as duas culturas e vende os grãos.' },
]

type Props = { clima: ClimaDecendios | null; idx: number; pr: Priority; onVerDados: () => void }

export function Inspector({ pr, clima, onVerDados }: Props) {
  const rpos = useMemo(() => rankRotations(pr), [pr])
  const selRank = rpos[3] + 1  // r4 is rotation index 3

  return (
    <aside className="insp" aria-label="Detalhe da rotação selecionada">
      <div className="eyebrow">Selecionada</div>
      <h2>Soja <span className="then">depois</span> milho safrinha</h2>
      <span className="verdict">
        <span className="dot risk" />
        Chuva falha no enchimento da soja
      </span>

      <div className="why dt">
        <h3>Datas da rotação</h3>
        <div className="list">
          <div className="dt-i">
            <div className="dt-h">
              <span className="dt-n">
                <span className="dt-k">Safra principal</span>
                <strong>Soja</strong>
              </span>
              <span className="gs risk">
                <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-xc" /></svg>
                Risco
              </span>
            </div>
            <div className="dt-d">
              <span><small>Plantio</small>21 a 31 out</span>
              <span><small>Colheita</small>1 a 10 fev</span>
            </div>
            <p>Os grãos enchem em janeiro, quando a chuva costuma falhar.</p>
          </div>
          <div className="dt-i">
            <div className="dt-h">
              <span className="dt-n">
                <span className="dt-k">Segunda safra</span>
                <strong>Milho safrinha</strong>
              </span>
              <span className="gs warn">
                <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-alert" /></svg>
                Atenção
              </span>
            </div>
            <div className="dt-d">
              <span><small>Plantio</small>11 a 20 fev</span>
              <span><small>Colheita</small>1 a 10 jun</span>
            </div>
            <p>Plantado logo após a soja, mas enche os grãos em maio, quando as chuvas acabam.</p>
          </div>
        </div>
      </div>

      <div className="why">
        <h3>Por que ficou em {selRank}º</h3>
        <div className="list">
          {WHY_ITEMS.map(item => (
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
        {clima ? `Chuva e temperatura: ${clima.fonte}, média de ${clima.safras.length} safras (${clima.safras[0]} a ${clima.safras.at(-1)}). Requisitos das culturas: catálogo EcoCrop, quando disponível. Solo, ciclos e rotações ainda ilustrativos (mock). A decisão é sua e do seu agrônomo.` : 'Clima indisponível. Requisitos das culturas: catálogo EcoCrop, quando disponível. Solo, ciclos e rotações ilustrativos (mock). A decisão é sua e do seu agrônomo.'}
      </p>
    </aside>
  )
}
