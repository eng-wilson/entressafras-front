import type { EstadoClima, Priority, Talhao } from '../types'
import { fmtCoord, fmtHaCurto } from '../logic/geo'
import { rotuloSolo } from '../logic/solo'
import { registroMaisRecente, resumoSafra } from '../logic/historico'
import { chuvaDoAno } from '../logic/clima'
import { inteiro, SEM_DADO } from '../logic/formato'
import { NOME_EIXO } from '../logic/aptidao'

/** Ações da lista do talhão: cada linha editável abre o que muda aquele dado. */
export type AcaoTalhao = 'redesenhar' | 'solo' | 'historico'

type Props = {
  pr: Priority
  onToggle: (k: keyof Priority) => void
  talhao: Talhao
  clima: EstadoClima
  onAcao: (a: AcaoTalhao) => void
  /** Volta ao mapa para escolher outro talhão ou desenhar um novo. */
  onTrocar: () => void
}

type Info = { label: string; value: string; dica?: string; acao?: { a: AcaoTalhao; dica: string } }

/** Chuva média do ano agrícola no ponto do talhão (soma dos decêndios da API; sem soma parcial). */
function chuvaAno(clima: EstadoClima): { value: string; dica?: string } {
  if (clima.status === 'carregando') return { value: '…' }
  const mm = chuvaDoAno(clima.dados?.decendios ?? null)
  if (mm === null || !clima.dados) return { value: SEM_DADO }
  return { value: `${inteiro(mm)} mm`, dica: `Média de ${clima.dados.safras.length} safras, NASA POWER` }
}

function infoDo(t: Talhao, clima: EstadoClima): Info[] {
  const ultima = resumoSafra(registroMaisRecente(t.historico)?.registro)
  return [
    { label: t.nome, value: fmtHaCurto(t.areaHa), acao: { a: 'redesenhar', dica: 'Redesenhar o contorno do talhão' } },
    { label: 'Solo', value: rotuloSolo(t), acao: { a: 'solo', dica: 'Editar o solo do talhão' } },
    { label: 'Histórico', value: ultima || 'Registrar', acao: { a: 'historico', dica: 'Registrar as safras anteriores' } },
    // A umidade saiu daqui: a cena mostra a do decêndio simulado. A chuva do ano situa o talhão no regime de chuvas.
    { label: 'Chuva no ano', ...chuvaAno(clima) },
    { label: 'Local', value: t.local || fmtCoord(t.centro) },
  ]
}

// Mesmos nomes dos quadrantes do mapa de comparação (logic/aptidao)
const PRIORITIES = [
  { k: 'risco' as const, label: NOME_EIXO.risco, icon: 'i-shield' },
  { k: 'agua'  as const, label: NOME_EIXO.agua,  icon: 'i-drop'   },
  { k: 'solo'  as const, label: NOME_EIXO.solo,  icon: 'i-leaf'   },
  { k: 'prod'  as const, label: NOME_EIXO.prod,  icon: 'n-seed'   },
]

export function Sidebar({ pr, onToggle, talhao, clima, onAcao, onTrocar }: Props) {
  return (
    <aside className="side" aria-label="Ajustes">
      <div className="sec">
        <div className="sec-h">
          <h3>Talhão</h3>
          <button className="sec-a" type="button" onClick={onTrocar}
            title="Trocar de talhão ou adicionar um novo" aria-label="Trocar de talhão ou adicionar um novo">
            <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-swap" /></svg>
          </button>
        </div>
        <div className="list">
          {infoDo(talhao, clima).map(item => item.acao ? (
            <button
              key={item.label}
              type="button"
              className="item item-btn"
              title={item.acao.dica}
              aria-label={`${item.label}: ${item.value}. ${item.acao.dica}`}
              onClick={() => onAcao(item.acao!.a)}
            >
              <span>{item.label}</span>
              <span className="v">{item.value}<span className="chev" aria-hidden="true">›</span></span>
            </button>
          ) : (
            <div key={item.label} className="item" title={item.dica}>
              <span>{item.label}</span>
              <span className="v">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <h3>O que importa</h3>
        <p className="prh">Destaca no mapa de aptidão o que você marcar. A ordem das rotações vem da recomendação da API.</p>
        <div className="list">
          {PRIORITIES.map(({ k, label, icon }) => (
            <div key={k} className="item">
              <span className="pil">
                <svg className="ic" aria-hidden="true">
                  <use href={`/canvas-icons.svg#${icon}`} />
                </svg>
                {label}
              </span>
              <button
                className="sw"
                type="button"
                role="switch"
                aria-checked={pr[k]}
                aria-label={label}
                onClick={() => onToggle(k)}
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
