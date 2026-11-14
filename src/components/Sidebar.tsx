import type { Priority } from '../types'

type Props = { pr: Priority; onToggle: (k: keyof Priority) => void }

const FIELD_INFO = [
  { label: 'T-07',          value: '42 ha' },
  { label: 'Solo',          value: 'Argiloso' },
  { label: 'Safra anterior',value: 'Soja, milho' },
  { label: 'Umidade hoje',  value: 'Úmido' },
  { label: 'Local',         value: 'Sorriso, MT' },
]

const PRIORITIES = [
  { k: 'risco' as const, label: 'Menor risco',   icon: 'i-shield' },
  { k: 'agua'  as const, label: 'Economizar água',icon: 'i-drop'  },
  { k: 'solo'  as const, label: 'Cuidar do solo', icon: 'i-leaf'  },
  { k: 'prod'  as const, label: 'Maior produção', icon: 'n-seed'  },
]

export function Sidebar({ pr, onToggle }: Props) {
  return (
    <aside className="side" aria-label="Ajustes">
      <div className="sec">
        <h3>Talhão</h3>
        <div className="list">
          {FIELD_INFO.map(item => (
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
