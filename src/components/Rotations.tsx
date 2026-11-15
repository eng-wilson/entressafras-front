import type { ReactNode } from 'react'
import type { Decendio } from '../types'
import type { FaixaCalendario } from '../logic/rascunho'
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
  onAdd: () => void
  addBloqueio?: string | null
  /** Linha de rascunho aberta (primeira do board) e as cores de risco por decêndio da cultura selecionada nele. */
  rascunho?: ReactNode
  faixa?: FaixaCalendario | null
  onRemoverSalva?: (id: string) => void
}

// Estrutura fiel à referência:
//   .board > .mstrip + .cal(.months) + .rlist/.ctab
// O .cal contém apenas .months (com slider absoluto dentro).
// O .rlist / .ctab são irmãos de .cal, NÃO filhos.
export function Rotations({ idx, mode, onIdx, onMode, decendios, sel, onToggleSel, res, rot, onRot, diags, onAdd, addBloqueio, rascunho, faixa, onRemoverSalva }: Props) {
  return (
    <div className="board">
      <RotationsHeader mode={mode} onMode={onMode} onAdd={onAdd} addBloqueio={addBloqueio} />
      <div className="cal">
        <MonthStrip idx={idx} onIdx={onIdx} decendios={decendios} diag={mode === 'cal' && !rascunho ? diags?.[rot] ?? null : null} faixa={mode === 'cal' && rascunho ? faixa : null} />
      </div>
      {mode === 'cal' ? (
        <CalendarRows res={res} sel={rot} onSel={onRot} diags={diags} idx={idx} rascunho={rascunho} onRemoverSalva={onRemoverSalva} />
      ) : (
        <CompareTable sel={sel} onToggleSel={onToggleSel} res={res} />
      )}
    </div>
  )
}
