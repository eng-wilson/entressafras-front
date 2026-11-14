import type { Priority } from '../types'
import { RotationsHeader } from './RotationsHeader'
import { MonthStrip } from './MonthStrip'
import { CalendarRows } from './CalendarRows'
import { CompareTable } from './CompareTable'

type Props = {
  idx: number
  mode: 'cal' | 'cmp'
  pr: Priority
  onIdx: (i: number) => void
  onMode: (m: 'cal' | 'cmp') => void
}

// Estrutura fiel à referência:
//   .board > .mstrip + .cal(.months) + .rlist/.ctab
// O .cal contém apenas .months (com slider absoluto dentro).
// O .rlist / .ctab são irmãos de .cal, NÃO filhos.
export function Rotations({ idx, mode, pr, onIdx, onMode }: Props) {
  return (
    <div className="board">
      <RotationsHeader mode={mode} onMode={onMode} />
      <div className="cal">
        <MonthStrip idx={idx} onIdx={onIdx} />
      </div>
      {mode === 'cal' ? (
        <CalendarRows pr={pr} />
      ) : (
        <CompareTable pr={pr} />
      )}
    </div>
  )
}
