// Histórico de safras do talhão numa folha modal: régua de anos (mais antiga ← … → safra que se planeja)
// e o registro do ano escolhido (1ª e 2ª safra, produtividade, pragas). Portado de createHistorico
// (entressafras-v1/src/components/historico.js). Anos vazios não são guardados.
import './historico.css'
import { useEffect, useRef, useState } from 'react'
import type { Historico, RegistroSafra, Talhao } from '../types'
import { anoDaSafra, completo, rotuloSafra, safraPlanejada, statusSafra, ultimaSafra } from '../logic/historico'
import { EditorSafra } from '../onboarding/EditorSafra'
import { Icone } from '../onboarding/Icone'
import { Folha } from './Folha'

type Props = {
  talhao: Talhao
  onSalvar: (h: Historico | null) => void
  onCancelar: () => void
  hoje?: Date
}

/** Anos da régua: os registrados e a última safra, da mais antiga para a mais nova. */
function anosDe(hist: Historico, hoje: Date): string[] {
  const ys = new Set(Object.keys(hist).map(anoDaSafra))
  ys.add(ultimaSafra(hoje))
  return [...ys].sort((a, b) => a - b).map(rotuloSafra)
}

const vazio = (r: RegistroSafra | undefined) => !r || (!r.c1 && !r.c2)

export function HistoricoModal({ talhao, onSalvar, onCancelar, hoje: hojeProp }: Props) {
  // A data é lida uma vez, ao abrir: a régua não muda enquanto a folha está aberta.
  const [hoje] = useState(() => hojeProp ?? new Date())
  const [hist, setHist] = useState<Historico>(() => structuredClone(talhao.historico ?? {}))
  const ys = anosDe(hist, hoje)
  // Abre no ano mais recente já registrado; sem registro, na última safra.
  const [sel, setSel] = useState(() => [...ys].reverse().find(y => hist[y]?.c1) ?? ys[ys.length - 1])
  const i = ys.indexOf(sel)
  const maisNova = i < ys.length - 1 ? ys[i + 1] : null
  const antiga = rotuloSafra(anoDaSafra(ys[0]) - 1)
  const planejada = rotuloSafra(safraPlanejada(hoje))
  const r = hist[sel] ?? {}
  const ref = maisNova && !vazio(hist[maisNova]) ? { safra: maisNova, registro: hist[maisNova] } : null

  const regua = useRef<HTMLDivElement>(null)
  useEffect(() => {
    regua.current?.querySelector('.hs-yr.sel')?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [sel])

  const registrarAntiga = () => { setHist(h => ({ ...h, [antiga]: h[antiga] ?? {} })); setSel(antiga) }
  const copiar = () => {
    if (!maisNova) return
    setHist(h => ({ ...h, [sel]: { ...(h[sel] ?? {}), c1: h[maisNova].c1, c2: h[maisNova].c2 } }))
  }
  const salvar = () => {
    const limpo = Object.fromEntries(Object.entries(hist).filter(([, x]) => !vazio(x)))
    onSalvar(Object.keys(limpo).length ? limpo : null)
  }
  const no = (x: RegistroSafra | undefined, k: 'c1' | 'c2') => <i className={x?.[k] ? 'on' : ''} />

  return (
    <Folha titulo={`Histórico do ${talhao.nome}`} largura={640} onCancelar={onCancelar} onSalvar={salvar}>
      <div className="hs-years" ref={regua} role="group" aria-label="Safras, da mais antiga para a atual">
        <button className="hs-yr mais first" type="button" onClick={registrarAntiga} aria-label={`Registrar safra ${antiga}`}>
          <span className="node" aria-hidden="true"><Icone id="i-plus" /></span>
          <span className="y">{antiga}</span><span className="s">Mais antiga</span>
        </button>
        {ys.map(y => (
          <button key={y} className={`hs-yr${y === sel ? ' sel' : ''}`} type="button" aria-pressed={y === sel}
            aria-label={`Safra ${y}, ${statusSafra(hist[y]).toLowerCase()}`} onClick={() => setSel(y)}>
            <span className="node" aria-hidden="true">{no(hist[y], 'c1')}{no(hist[y], 'c2')}</span>
            <span className="y">{y}</span><span className="s">{statusSafra(hist[y])}</span>
          </button>
        ))}
        <div className="hs-yr fut last" aria-label={`Safra ${planejada}, planejando agora`}>
          <span className="node" aria-hidden="true" />
          <span className="y">{planejada}</span><span className="s">Planejando</span>
        </div>
      </div>

      <div className="hs-cab">
        <div>
          <h3>Safra {sel}</h3>
          <div className="hs-nota">{completo(r) ? 'Completa. Produtividade e pragas são opcionais.' : 'Escolha a cultura das duas safras'}</div>
        </div>
        {maisNova && completo(hist[maisNova]) && !completo(r) && (
          <button className="hs-copy" type="button" onClick={copiar}><Icone id="i-repeat" />Igual a {maisNova}</button>
        )}
      </div>

      <EditorSafra key={sel} valor={r} referencia={ref}
        onMudar={novo => setHist(h => ({ ...h, [sel]: novo }))} />

      <div className="hs-fim">
        <button className="hs-cta" type="button" onClick={() => (i > 0 ? setSel(ys[i - 1]) : registrarAntiga())}>
          <Icone id="i-left" />{i > 0 ? `Próxima: ${ys[i - 1]}` : `Registrar ${antiga}`}
        </button>
      </div>
    </Folha>
  )
}
