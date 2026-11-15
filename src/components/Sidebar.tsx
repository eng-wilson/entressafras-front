import type { Priority, Talhao } from '../types'
import { fmtCoord, fmtHaCurto } from '../logic/geo'
import { rotuloSolo } from '../logic/solo'
import { registroMaisRecente, resumoSafra } from '../logic/historico'
import { NOME_EIXO } from '../logic/aptidao'

type Props = {
  pr: Priority
  onToggle: (k: keyof Priority) => void
  talhao: Talhao
  onEditar: (modo: 'editar' | 'redesenhar') => void
}

type Info = { label: string; value: string; editar?: { modo: 'editar' | 'redesenhar'; dica: string } }

function infoDo(t: Talhao): Info[] {
  return [
    { label: t.nome, value: fmtHaCurto(t.areaHa), editar: { modo: 'redesenhar', dica: 'Redesenhar o contorno do talhão' } },
    { label: 'Solo', value: rotuloSolo(t), editar: { modo: 'editar', dica: 'Editar nome e solo do talhão' } },
    { label: 'Safra anterior', value: resumoSafra(registroMaisRecente(t.historico)?.registro) || '—' },
    // Ainda vem do mock: umidade real depende do SMAP/NASA POWER.
    { label: 'Umidade hoje', value: 'Úmido' },
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

export function Sidebar({ pr, onToggle, talhao, onEditar }: Props) {
  return (
    <aside className="side" aria-label="Ajustes">
      <div className="sec">
        <h3>Talhão</h3>
        <div className="list">
          {infoDo(talhao).map(item => item.editar ? (
            <button
              key={item.label}
              type="button"
              className="item item-btn"
              title={item.editar.dica}
              aria-label={`${item.label}: ${item.value}. ${item.editar.dica}`}
              onClick={() => onEditar(item.editar!.modo)}
            >
              <span>{item.label}</span>
              <span className="v">{item.value}</span>
            </button>
          ) : (
            <div key={item.label} className="item">
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
