import type { PanoramaCiclo, MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { t } from '../i18n'
import './atencao-ciclo.css'

export type AtencaoCicloProps = {
  panorama: PanoramaCiclo | null
  estado: 'carregando' | 'pronto' | 'erro' | 'sem-clima'
  idx: number
  onNavegar: (idx: number) => void
  onAbrirMomento: (momento: MomentoAtencao) => void
  onAbrirMetodo: () => void
}
const icone = (estado: string) => estado === 'risk' ? 'i-xc' : 'i-alert'

// Só a lista de momentos (como o restante do painel): a faixa de navegação, a legenda e as setas saíram; cada
// momento leva o calendário ao período dele e abre o detalhe.
export function AtencaoCiclo({ panorama, estado, idx, onNavegar, onAbrirMomento, onAbrirMetodo }: AtencaoCicloProps) {
  const momentos = panorama?.momentos ?? []
  const ativo = momentos.find(m => idx >= m.de && idx <= m.ate)
  const primeiros = ativo ? [ativo, ...momentos.filter(m => m !== ativo)].slice(0, 2) : momentos.slice(0, 2)
  const outros = momentos.filter(m => !primeiros.includes(m))
  const renderMomento = (m: MomentoAtencao) => (
    <button type="button" className={`attention-moment${ativo === m ? ' selected' : ''}`} key={`${m.safra}-${m.de}`} aria-current={ativo === m ? 'date' : undefined}
      data-inspector-open={`momento-${m.safra}-${m.de}`} onClick={() => { onNavegar(m.de); onAbrirMomento(m) }}>
        <svg className={`ic ${m.estado}`} aria-hidden="true"><use href={`/canvas-icons.svg#${icone(m.estado)}`} /></svg>
        <span><strong>{m.estado === 'risk' ? t('Crítico') : t('Atenção')}{ativo === m ? ` · ${t('neste período')}` : ''}</strong><small>{periodoMomento(m)}</small></span>
        <svg className="ic insp-chevron" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
    </button>
  )
  return (
    // Só aparece quando a rotação tem algum momento de atenção; sem nenhum, fica oculto (não ocupa o painel).
    <section className="attention-cycle" aria-label={t('Momentos de atenção da rotação')} hidden={estado === 'pronto' && momentos.length === 0}>
      <div className="attention-heading"><h3>{t('Atenção no ciclo')}</h3><button type="button" className="attention-info-button" aria-label={t('Como ler estes momentos')} data-inspector-open="attention-method" onClick={onAbrirMetodo}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-info" /></svg></button></div>
      {estado === 'carregando' && <p className="attention-note" role="status">{t('Carregando as rotações…')}</p>}
      {estado === 'erro' && <p className="attention-note" role="status">{t('As rotações não carregaram. Sem avaliação dos momentos de atenção.')}</p>}
      {estado === 'sem-clima' && <p className="attention-note">{t('Sem dados para avaliar os momentos.')}</p>}
      {estado === 'pronto' && panorama && <>
        <div className="insp-group attention-list">
          {primeiros.map(renderMomento)}
          {outros.length > 0 && <details className="attention-others"><summary><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>{t('Outros {n} momentos', { n: outros.length })}</summary><div>{outros.map(renderMomento)}</div></details>}
        </div>
      </>}
    </section>
  )
}
