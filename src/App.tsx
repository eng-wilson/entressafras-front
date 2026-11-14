import { useState } from 'react'
import type { AppState } from './types'
import { Sidebar } from './components/Sidebar'
import { Simulation } from './components/Simulation'
import { Rotations } from './components/Rotations'
import { Inspector } from './components/Inspector'

const DEFAULT: AppState = {
  idx: 10,
  mode: 'cal',
  pr: { risco: true, agua: false, solo: true, prod: false },
}

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT)
  const setIdx  = (idx: number) => setState(s => ({ ...s, idx }))
  const setMode = (mode: 'cal'|'cmp') => setState(s => ({ ...s, mode }))
  const togglePr = (k: keyof AppState['pr']) =>
    setState(s => ({ ...s, pr: { ...s.pr, [k]: !s.pr[k] } }))

  return (
    <div className="app">
      <header className="bar">
        <div className="app-name">Field Shift</div>
        <button className="tbtn" type="button">
          <svg className="ic" aria-hidden="true">
            <use href="/canvas-icons.svg#i-info" />
          </svg>
          Como funciona
        </button>
      </header>
      <Sidebar pr={state.pr} onToggle={togglePr} />
      <main className="main">
        <Simulation idx={state.idx} />
        <Rotations
          idx={state.idx} mode={state.mode} pr={state.pr}
          onIdx={setIdx} onMode={setMode}
        />
      </main>
      <Inspector idx={state.idx} pr={state.pr} />
    </div>
  )
}
