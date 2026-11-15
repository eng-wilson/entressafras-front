import type { PanoramaCiclo, MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { classeAnos } from '../logic/status'
import './atencao-ciclo.css'

export type AtencaoCicloProps = {
  panorama: PanoramaCiclo | null
  estado: 'carregando' | 'pronto' | 'erro' | 'sem-clima'
  idx: number; anosApi: number | null
  onVerPeriodo: (idx: number) => void
}
const icone = (estado: string) => estado === 'risk' ? 'i-xc' : 'i-alert'

export function AtencaoCiclo({ panorama, estado, idx, anosApi, onVerPeriodo }: AtencaoCicloProps) {
  const momentos = panorama?.momentos ?? []
  const avaliados = panorama?.quadros.filter(q => q.atendimento != null).length ?? 0
  const ativo = momentos.find(m => idx >= m.de && idx <= m.ate)
  const primeiros = ativo ? [ativo, ...momentos.filter(m => m !== ativo)].slice(0, 2) : momentos.slice(0, 2)
  const outros = momentos.filter(m => !primeiros.includes(m))
  const clsApi = anosApi == null ? null : classeAnos(anosApi)
  const renderMomento = (m: MomentoAtencao) => (
    <details className="attention-moment" key={`${m.safra}-${m.de}`}>
      <summary>
        <svg className={`ic ${m.estado}`} aria-hidden="true"><use href={`/canvas-icons.svg#${icone(m.estado)}`} /></svg>
        <span><strong>{m.estado === 'risk' ? 'Crítico' : 'Atenção'}{ativo === m ? ' · neste período' : ''}</strong><small>{periodoMomento(m)}</small></span>
      </summary>
      <div className="attention-body">
        <p><strong>{m.cultura}</strong><br />Fase: {m.nomeFase}{m.critica ? ' · fase de maior déficit na API' : ''}</p>
        <p>Atendimento à demanda: <strong>{Math.round(m.menorAtendimento * 100)}%</strong> da água necessária nesta fase, na média das safras históricas da API.</p>
        <p>{m.reacao}</p>
        <p><strong>O que conferir</strong><br />{m.acao}</p>
        <button type="button" className="attention-link" onClick={() => onVerPeriodo(m.de)}>Ver este momento<svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></button>
      </div>
    </details>
  )
  return (
    <section className="attention-cycle" aria-label="Momentos de atenção da rotação">
      <h3>Atenção no ciclo</h3>
      {estado === 'carregando' && <p className="attention-note" role="status">Aguardando as rotações da API…</p>}
      {estado === 'erro' && <p className="attention-note" role="status">As rotações da API não carregaram. Sem avaliação dos momentos de atenção.</p>}
      {estado === 'sem-clima' && <p className="attention-note">Sem dados da API para avaliar os momentos.</p>}
      {estado === 'pronto' && panorama && <>
        <p className="attention-note">{momentos.length ? `${momentos.length} ${momentos.length === 1 ? 'fase com atenção' : 'fases com atenção'} no atendimento de água da API${clsApi === 'good' ? ', mesmo com o ciclo favorável no risco geral' : ''}.` : avaliados ? 'Sem fase com restrição de água no atendimento da API.' : 'A API não trouxe o atendimento por fase desta rotação.'}</p>
        <div className="attention-map" role="img" aria-label={`Água no ciclo: ${panorama.quadros.filter(q => q.estado === 'risk').length} decêndios críticos e ${panorama.quadros.filter(q => q.estado === 'warn').length} em atenção, pelo atendimento por fase da API (média histórica).`}>
          {panorama.quadros.map(q => <span key={q.idx} className={`attention-mark ${q.estado}${q.idx === idx ? ' current' : ''}`} aria-hidden="true" />)}
        </div>
        <div className="attention-months" aria-hidden="true"><span>Set</span><span>Dez</span><span>Mar</span><span>Jun</span></div>
        <div className="attention-legend"><span><i className="risk" />Crítico</span><span><i className="warn" />Atenção</span></div>
        <div className="list attention-list">
          {primeiros.map(renderMomento)}
          {outros.length > 0 && <details className="attention-others"><summary>Outros {outros.length} momentos</summary>{outros.map(renderMomento)}</details>}
        </div>
        <details className="attention-method"><summary>Como ler estes momentos</summary>
          <p>Atendimento = água que a cultura usou ÷ água de que precisava (ETa/ETc), por fase, na média das safras históricas do balanço hídrico da API (ISNA por estágio). A API não entrega valores dia a dia: dentro de uma fase, o valor é o mesmo em todos os decêndios.</p>
          <p>Fases pelos estágios FAO-56 da cultura, posicionados nas datas de plantio e colheita da API. Crítico abaixo de 45%; atenção de 45% a menos de 55%. Estes são limiares de apresentação, não limites oficiais de manejo. Alta sensibilidade: Ky da fase igual ou acima de 1 (FAO-33), também da API.</p>
          <p>A classificação geral pode ser favorável e ainda conter uma fase com atendimento baixo. Este panorama não explica o ranking da API e não calcula perda de produtividade ou lâmina de irrigação. Não é previsão do tempo nem medição do solo.</p>
          <a href="https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua" target="_blank" rel="noreferrer">Referência: resposta da soja à falta de água</a>
        </details>
      </>}
    </section>
  )
}
