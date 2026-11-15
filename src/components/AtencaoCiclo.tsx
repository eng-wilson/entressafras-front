import type { CSSProperties } from 'react'
import type { PanoramaCiclo, MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { classeAnos } from '../logic/status'
import { periodoLabel } from '../logic/periodo'
import './atencao-ciclo.css'

export type AtencaoCicloProps = {
  panorama: PanoramaCiclo | null
  estado: 'carregando' | 'pronto' | 'erro' | 'sem-clima'
  idx: number; anosApi: number | null
  onNavegar: (idx: number) => void
  onAbrirMomento: (momento: MomentoAtencao) => void
  onAbrirMetodo: () => void
}
const icone = (estado: string) => estado === 'risk' ? 'i-xc' : 'i-alert'

export function AtencaoCiclo({ panorama, estado, idx, anosApi, onNavegar, onAbrirMomento, onAbrirMetodo }: AtencaoCicloProps) {
  const momentos = panorama?.momentos ?? []
  const avaliados = panorama?.quadros.filter(q => q.atendimento != null).length ?? 0
  const ativo = momentos.find(m => idx >= m.de && idx <= m.ate)
  const primeiros = ativo ? [ativo, ...momentos.filter(m => m !== ativo)].slice(0, 2) : momentos.slice(0, 2)
  const outros = momentos.filter(m => !primeiros.includes(m))
  const clsApi = anosApi == null ? null : classeAnos(anosApi)
  const quadro = panorama?.quadros.find(q => q.idx === idx)
  const anterior = momentos.filter(m => m.ate < idx).at(-1)
  const proximo = momentos.find(m => m.de > idx)
  const rotulo = quadro?.estado === 'risk' ? 'Crítico' : quadro?.estado === 'warn' ? 'Atenção' : quadro?.estado === 'good' ? 'Sem restrição nesta fase' : quadro?.cultura ? 'Sem dado da API' : 'Entre safras'
  const leitura = `${periodoLabel(idx)}. ${rotulo}${quadro?.cultura ? `. ${quadro.cultura}${quadro.nomeFase ? `, ${quadro.nomeFase.toLowerCase()}` : ''}` : ''}.`
  const renderMomento = (m: MomentoAtencao) => (
    <button type="button" className={`attention-moment${ativo === m ? ' selected' : ''}`} key={`${m.safra}-${m.de}`} aria-current={ativo === m ? 'date' : undefined}
      data-inspector-open={`momento-${m.safra}-${m.de}`} onClick={() => { onNavegar(m.de); onAbrirMomento(m) }}>
        <svg className={`ic ${m.estado}`} aria-hidden="true"><use href={`/canvas-icons.svg#${icone(m.estado)}`} /></svg>
        <span><strong>{m.estado === 'risk' ? 'Crítico' : 'Atenção'}{ativo === m ? ' · neste período' : ''}</strong><small>{periodoMomento(m)}</small></span>
        <svg className="ic insp-chevron" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
    </button>
  )
  return (
    // Só aparece quando a rotação tem algum momento de atenção; sem nenhum, fica oculto (não ocupa o painel).
    <section className="attention-cycle" aria-label="Momentos de atenção da rotação" hidden={estado === 'pronto' && momentos.length === 0}>
      <div className="attention-heading"><h3>Atenção no ciclo</h3><button type="button" className="attention-info-button" aria-label="Como ler estes momentos" data-inspector-open="attention-method" onClick={onAbrirMetodo}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-info" /></svg></button></div>
      {estado === 'carregando' && <p className="attention-note" role="status">Aguardando as rotações da API…</p>}
      {estado === 'erro' && <p className="attention-note" role="status">As rotações da API não carregaram. Sem avaliação dos momentos de atenção.</p>}
      {estado === 'sem-clima' && <p className="attention-note">Sem dados da API para avaliar os momentos.</p>}
      {estado === 'pronto' && panorama && <>
        <p className="attention-note">{momentos.length ? `${momentos.length} ${momentos.length === 1 ? 'fase com atenção' : 'fases com atenção'} no atendimento de água da API${clsApi === 'good' ? ', mesmo com o ciclo favorável no risco geral' : ''}.` : avaliados ? 'Sem fase com restrição de água no atendimento da API.' : 'A API não trouxe o atendimento por fase desta rotação.'}</p>
        <div className="attention-scrubber">
          <div className="attention-map" aria-hidden="true">
            {panorama.quadros.map(q => <span key={q.idx} className={`attention-mark ${q.estado}${q.idx === idx ? ' current' : ''}`} />)}
          </div>
          <input id="attention-period" className="attention-range" type="range" min={0} max={35} step={1} value={idx}
            style={{ '--attention-fill': `${idx / 35 * 100}%` } as CSSProperties}
            aria-label="Navegar períodos de atenção" aria-valuetext={leitura}
            onChange={e => onNavegar(Number(e.currentTarget.value))} />
        </div>
        <div className="attention-months" aria-hidden="true"><span>Set</span><span>Dez</span><span>Mar</span><span>Jun</span></div>
        <div className="attention-legend"><span><i className="risk" />Crítico</span><span><i className="warn" />Atenção</span></div>
        <div className="attention-selection">
          <div><p className="attention-date">{periodoLabel(idx)}</p><p className={`attention-current-state ${quadro?.estado ?? 'none'}`}>{rotulo}{quadro?.cultura ? ` · ${quadro.cultura}` : ''}</p></div>
          <div className="attention-stepper" role="group" aria-label="Navegar momentos de atenção">
            <button type="button" aria-label="Momento anterior" disabled={!anterior} onClick={() => anterior && onNavegar(anterior.de)}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-left" /></svg></button>
            <button type="button" aria-label="Próximo momento" disabled={!proximo} onClick={() => proximo && onNavegar(proximo.de)}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></button>
          </div>
        </div>
        <div className="insp-group attention-list">
          {primeiros.map(renderMomento)}
          {outros.length > 0 && <details className="attention-others"><summary><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>Outros {outros.length} momentos</summary><div>{outros.map(renderMomento)}</div></details>}
        </div>
      </>}
    </section>
  )
}
