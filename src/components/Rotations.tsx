import type { Decendio } from '../types'
import type { Resiliencia } from '../logic/resiliencia'
import type { Diagnostico } from '../logic/diagnostico'
import { RotationsHeader } from './RotationsHeader'
import { MonthStrip } from './MonthStrip'
import { CalendarRows } from './CalendarRows'
import { CompareTable } from './CompareTable'

type Props = {
  decendios: Decendio[] | null
  idx: number
  mode: 'cal' | 'cmp'
  onIdx: (i: number) => void
  onMode: (m: 'cal' | 'cmp') => void
  sel: number[]
  onToggleSel: (i: number) => void
  res: Resiliencia | null
  rot: number
  onRot: (rot: number, idx?: number) => void
  diags: Diagnostico[] | null
}

// Estrutura fiel à referência:
//   .board > .mstrip + .cal(.months) + .rlist/.ctab
// O .cal contém apenas .months (com slider absoluto dentro).
// O .rlist / .ctab são irmãos de .cal, NÃO filhos.
export function Rotations({ idx, mode, onIdx, onMode, decendios, sel, onToggleSel, res, rot, onRot, diags }: Props) {
  return (
    <div id="rotation-board" className="board" tabIndex={-1} aria-label="Calendário e comparação das rotações">
      <RotationsHeader mode={mode} onMode={onMode} />
      <div className="cal">
        <MonthStrip idx={idx} onIdx={onIdx} decendios={decendios} diag={mode === 'cal' ? diags?.[rot] ?? null : null} />
      </div>
      {mode === 'cal' ? (
        <CalendarRows res={res} sel={rot} onSel={onRot} diags={diags} idx={idx} />
      ) : (
        <CompareTable sel={sel} onToggleSel={onToggleSel} res={res} />
      )}
    </div>
  )
}
