import type { CSSProperties } from 'react'
import type { PanoramaCiclo, MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { classeAnos } from '../logic/status'
import { periodoLabel } from '../logic/periodo'
import { t } from '../i18n'
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
  const rotulo = quadro?.estado === 'risk' ? t('Crítico') : quadro?.estado === 'warn' ? t('Atenção') : quadro?.estado === 'good' ? t('Sem restrição nesta fase') : quadro?.cultura ? t('Sem dado da API') : t('Entre safras')
  const leitura = `${periodoLabel(idx)}. ${rotulo}${quadro?.cultura ? `. ${t(quadro.cultura)}${quadro.nomeFase ? `, ${t(quadro.nomeFase).toLowerCase()}` : ''}` : ''}.`
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
      {estado === 'carregando' && <p className="attention-note" role="status">{t('Aguardando as rotações da API…')}</p>}
      {estado === 'erro' && <p className="attention-note" role="status">{t('As rotações da API não carregaram. Sem avaliação dos momentos de atenção.')}</p>}
      {estado === 'sem-clima' && <p className="attention-note">{t('Sem dados da API para avaliar os momentos.')}</p>}
      {estado === 'pronto' && panorama && <>
        <p className="attention-note">{momentos.length
          ? clsApi === 'good'
            ? (momentos.length === 1 ? t('{n} fase com atenção no atendimento de água da API, mesmo com o ciclo favorável no risco geral.', { n: momentos.length }) : t('{n} fases com atenção no atendimento de água da API, mesmo com o ciclo favorável no risco geral.', { n: momentos.length }))
            : (momentos.length === 1 ? t('{n} fase com atenção no atendimento de água da API.', { n: momentos.length }) : t('{n} fases com atenção no atendimento de água da API.', { n: momentos.length }))
          : avaliados ? t('Sem fase com restrição de água no atendimento da API.') : t('A API não trouxe o atendimento por fase desta rotação.')}</p>
        <div className="attention-scrubber">
          <div className="attention-map" aria-hidden="true">
            {panorama.quadros.map(q => <span key={q.idx} className={`attention-mark ${q.estado}${q.idx === idx ? ' current' : ''}`} />)}
          </div>
          <input id="attention-period" className="attention-range" type="range" min={0} max={35} step={1} value={idx}
            style={{ '--attention-fill': `${idx / 35 * 100}%` } as CSSProperties}
            aria-label={t('Navegar períodos de atenção')} aria-valuetext={leitura}
            onChange={e => onNavegar(Number(e.currentTarget.value))} />
        </div>
        <div className="attention-months" aria-hidden="true"><span>{t('Set')}</span><span>{t('Dez')}</span><span>{t('Mar')}</span><span>{t('Jun')}</span></div>
        <div className="attention-legend"><span><i className="risk" />{t('Crítico')}</span><span><i className="warn" />{t('Atenção')}</span></div>
        <div className="attention-selection">
          <div><p className="attention-date">{periodoLabel(idx)}</p><p className={`attention-current-state ${quadro?.estado ?? 'none'}`}>{rotulo}{quadro?.cultura ? ` · ${t(quadro.cultura)}` : ''}</p></div>
          <div className="attention-stepper" role="group" aria-label={t('Navegar momentos de atenção')}>
            <button type="button" aria-label={t('Momento anterior')} disabled={!anterior} onClick={() => anterior && onNavegar(anterior.de)}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-left" /></svg></button>
            <button type="button" aria-label={t('Próximo momento')} disabled={!proximo} onClick={() => proximo && onNavegar(proximo.de)}><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></button>
          </div>
        </div>
        <div className="insp-group attention-list">
          {primeiros.map(renderMomento)}
          {outros.length > 0 && <details className="attention-others"><summary><svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>{t('Outros {n} momentos', { n: outros.length })}</summary><div>{outros.map(renderMomento)}</div></details>}
        </div>
      </>}
    </section>
  )
}
