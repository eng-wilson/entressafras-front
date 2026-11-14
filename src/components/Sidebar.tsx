import type { Priority, Talhao } from '../types'
import { fmtCoord, fmtHaCurto } from '../logic/geo'
import { rotuloSolo } from '../logic/solo'
import { registroMaisRecente, resumoSafra } from '../logic/historico'

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

const PRIORITIES = [
  { k: 'risco' as const, label: 'Menor risco',   icon: 'i-shield' },
  { k: 'agua'  as const, label: 'Economizar água',icon: 'i-drop'  },
  { k: 'solo'  as const, label: 'Cuidar do solo', icon: 'i-leaf'  },
  { k: 'prod'  as const, label: 'Maior produção', icon: 'n-seed'  },
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
        <p className="prh">A ordem das rotações segue o que você marcar.</p>
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
