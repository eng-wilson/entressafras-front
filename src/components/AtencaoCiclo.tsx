import type { PanoramaCiclo, MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { classeAnos } from '../logic/status'
import './atencao-ciclo.css'

export type AtencaoCicloProps = {
  panorama: PanoramaCiclo | null
  estado: 'carregando' | 'pronto' | 'erro' | 'sem-clima'
  idx: number; nome: string; anosApi: number | null; provisorio: boolean
  onVerPeriodo: (idx: number) => void
  onComparar: () => void
}
const icone = (estado: string) => estado === 'risk' ? 'i-xc' : 'i-alert'

export function AtencaoCiclo({ panorama, estado, idx, nome, anosApi, provisorio, onVerPeriodo, onComparar }: AtencaoCicloProps) {
  const momentos = panorama?.momentos ?? []
  const avaliados = panorama?.quadros.filter(q => q.atendimento != null).length ?? 0
  const ativo = momentos.find(m => idx >= m.de && idx <= m.ate)
  const primeiros = ativo ? [ativo, ...momentos.filter(m => m !== ativo)].slice(0, 2) : momentos.slice(0, 2)
  const outros = momentos.filter(m => !primeiros.includes(m))
  const clsApi = anosApi == null ? null : classeAnos(anosApi)
  const faixaApi = clsApi === 'good' ? 'favorável' : clsApi === 'warn' ? 'arriscado' : 'desfavorável'
  const renderMomento = (m: MomentoAtencao) => (
    <details className="attention-moment" key={`${m.safra}-${m.de}`}>
      <summary>
        <svg className={`ic ${m.estado}`} aria-hidden="true"><use href={`/canvas-icons.svg#${icone(m.estado)}`} /></svg>
        <span><strong>{m.estado === 'risk' ? 'Crítico' : 'Atenção'}{ativo === m ? ' · neste período' : ''}</strong><small>{periodoMomento(m)}</small></span>
      </summary>
      <div className="attention-body">
        <p><strong>{m.cultura}</strong><br />Fase no modelo: {m.fase || 'sem informação'}</p>
        <p>Menor atendimento: <strong>{Math.round(m.menorAtendimento * 100)}%</strong> da demanda, nos quadros deste intervalo.</p>
        <p>{m.reacao}</p>
        <p><strong>O que conferir</strong><br />{m.acao}</p>
        <button type="button" className="attention-link" onClick={() => onVerPeriodo(m.de)}>Ver este momento<svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></button>
      </div>
    </details>
  )
  return (
    <section className="sec attention-cycle" aria-label="Momentos de atenção da rotação">
      <h3>Atenção no ciclo</h3>
      <p className="attention-name">{nome}</p>
      <p className="attention-overall">API: {clsApi ? faixaApi : 'sem risco completo'}{provisorio ? ' · provisório' : ''}</p>
      {estado === 'carregando' && <p className="attention-note" role="status">Analisando os quadros da simulação…</p>}
      {estado === 'erro' && <p className="attention-note" role="status">Não foi possível analisar a simulação. Sem avaliação dos momentos de atenção.</p>}
      {estado === 'sem-clima' && <p className="attention-note">Clima indisponível. Os momentos do talhão não foram avaliados.</p>}
      {estado === 'pronto' && panorama && <>
        <p className="attention-note">{momentos.length ? `${momentos.length} ${momentos.length === 1 ? 'momento de atenção' : 'momentos de atenção'} no cenário sintético${clsApi === 'good' ? ', mesmo com o ciclo favorável na API' : ''}.` : avaliados ? 'Sem restrição de água nos quadros avaliados deste cenário sintético.' : 'Sem dados locais suficientes para avaliar estes quadros.'}</p>
        <div className="attention-map" role="img" aria-label={`Água no ciclo: ${panorama.quadros.filter(q => q.estado === 'risk').length} quadros críticos e ${panorama.quadros.filter(q => q.estado === 'warn').length} em atenção. Cenário sintético, não frequência histórica.`}>
          {panorama.quadros.map(q => <span key={q.idx} className={`attention-mark ${q.estado}${q.idx === idx ? ' current' : ''}`} aria-hidden="true" />)}
        </div>
        <div className="attention-months" aria-hidden="true"><span>Set</span><span>Dez</span><span>Mar</span><span>Jun</span></div>
        <div className="attention-legend"><span><i className="risk" />Crítico</span><span><i className="warn" />Atenção</span></div>
        <div className="list attention-list">
          {primeiros.map(renderMomento)}
          {outros.length > 0 && <details className="attention-others"><summary>Outros {outros.length} momentos</summary>{outros.map(renderMomento)}</details>}
        </div>
        {momentos.length > 0 && <button className="attention-link" type="button" onClick={onComparar}>Comparar alternativas<svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg></button>}
        <details className="attention-method"><summary>Como ler estes momentos</summary>
          <p>Simulação local com clima diário sintético gerado das médias mensais do talhão. Meses incompletos usam normais do Cerrado. Não é previsão, medição do solo nem o risco calculado pela API.</p>
          <p>Um quadro representativo por decêndio, no mesmo dia do ciclo exibido na cena. O modelo é ajustado à janela visual da cultura; os intervalos não são médias de todos os dias reais. Culturas sem modelo próprio ficam sem avaliação, mesmo quando o desenho usa outra cultura como reserva.</p>
          <p>Atendimento = água transpirada ÷ demanda (ETa/ETc). Crítico abaixo de 45%; atenção de 45% a menos de 55%. Estes são os limiares de apresentação do widget, não limites oficiais de manejo. Alta sensibilidade: pelo menos 0,8 no canal de déficit hídrico do modelo.</p>
          <p>A classificação geral pode ser favorável e ainda conter restrições pontuais. Este panorama não explica o ranking da API e não calcula perda de produtividade ou lâmina de irrigação.</p>
          <a href="https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua" target="_blank" rel="noreferrer">Referência: resposta da soja à falta de água</a>
        </details>
      </>}
    </section>
  )
}
