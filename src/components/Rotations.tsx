import type { ReactNode } from 'react'
import type { Decendio } from '../types'
import type { FaixaCalendario } from '../logic/rascunho'
import type { Resiliencia } from '../logic/resiliencia'
import type { Diagnostico } from '../logic/diagnostico'
import { RotationsHeader } from './RotationsHeader'
import { FaixaCenario, type CenarioUi } from './SeletorCenario'
import { MonthStrip } from './MonthStrip'
import { CalendarRows } from './CalendarRows'
import { t } from '../i18n'

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
  cenario?: CenarioUi
}

// Estrutura fiel à referência:
//   .board > .mstrip + .cal(.months) + .rlist
// O .cal contém apenas .months (com slider absoluto dentro).
// O .rlist é irmão de .cal, NÃO filho. Na Comparação, as mesmas linhas do calendário, com caixas para marcar: os
// pontos fortes e fracos ficam nos cards da comparação, acima.
export function Rotations({ idx, mode, onIdx, onMode, decendios, sel, onToggleSel, res, rot, onRot, diags, onAdd, addBloqueio, rascunho, faixa, onRemoverSalva, cenario }: Props) {
  return (
    <div id="rotation-board" className="board" tabIndex={-1} aria-label={t('Calendário e comparação das rotações')}>
      <RotationsHeader mode={mode} onMode={onMode} onAdd={onAdd} addBloqueio={addBloqueio} cenario={cenario} />
      <FaixaCenario info={cenario?.info ?? null} />
      {/* A comparação vale para o ciclo inteiro: o calendário e o período simulado não mudam nada nela. */}
      {mode === 'cal' && (
        <div className="cal">
          <MonthStrip idx={idx} onIdx={onIdx} decendios={decendios} diag={!rascunho ? diags?.[rot] ?? null : null} faixa={rascunho ? faixa : null} />
        </div>
      )}
      <CalendarRows res={res} sel={rot} onSel={onRot} diags={diags} idx={idx} rascunho={mode === 'cal' ? rascunho : undefined}
        onRemoverSalva={onRemoverSalva} cmp={mode === 'cmp' ? { sel, onToggle: onToggleSel } : undefined} />
    </div>
  )
}
