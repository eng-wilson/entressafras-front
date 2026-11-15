import { useEffect, useRef, useState } from 'react'
import { safraLimitante } from '../logic/aptidao'
import { porQueRanking } from '../logic/porQueRanking'
import type { Resiliencia, ResSafra } from '../logic/resiliencia'
import { classeAnos } from '../logic/status'
import type { ClimaDecendios } from '../types'
import { MONTHS_SHORT } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import { diasDe, mesDe } from '../logic/periodo'
import type { Diagnostico } from '../logic/diagnostico'
import type { MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { AtencaoCiclo, type AtencaoCicloProps } from './AtencaoCiclo'
import './inspector.css'

const SELO = {
  good: { icon: 'i-okc', rotulo: 'Favorável' },
  warn: { icon: 'i-alert', rotulo: 'Arriscado' },
  risk: { icon: 'i-xc', rotulo: 'Desfavorável' },
} as const
function Icon({ name }: { name: string }) {
  return <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${name}`} /></svg>
}
function Selo({ safra, compact = false }: { safra: ResSafra | undefined; compact?: boolean }) {
  if (safra?.anos == null) return <span className="insp-status none">Sem dado</span>
  const cls = classeAnos(safra.anos)
  return <span className={`insp-status ${cls}`}>{!compact && <Icon name={SELO[cls].icon} />}{SELO[cls].rotulo}</span>
}
function Row({ icon, label, detail, onClick, origin, tone = 'neutral' }: { icon: string; label: string; detail?: string; onClick: () => void; origin?: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <button type="button" className="insp-row" data-inspector-open={origin} onClick={onClick}>
    <span className={`insp-row-icon ${tone}`}><Icon name={icon} /></span><span className="insp-row-copy">{label}{detail && <small>{detail}</small>}</span><svg className="ic insp-chevron" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
  </button>
}
const decendio = (idx: number) => `${diasDe(idx)} ${MONTHS_SHORT[mesDe(idx)].toLowerCase()}`
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const TITULOS = { dates: 'Datas e requisitos', soil: 'Saúde do solo', pests: 'Pragas', risk: 'Como interpretar o risco', sources: 'Origem e limites dos dados', method: 'Como ler estes momentos', moment: 'Momento de atenção' }
type Page = 'overview' | keyof typeof TITULOS
type Props = {
  atencao: Pick<AtencaoCicloProps, 'panorama' | 'estado' | 'idx'>
  clima: ClimaDecendios | null; rotIdx: number; diag: Diagnostico | null
  onVerDados: (ref: string) => void; onVerPeriodo: (idx: number) => void
  onNavegarPeriodo: (idx: number) => void; onComparar: () => void; res: Resiliencia | null
}

export function Inspector({ clima, onVerDados, onVerPeriodo, onNavegarPeriodo, onComparar, res, rotIdx, diag, atencao }: Props) {
  const conj = useConjunto()
  const def = conj.rotacoes[rotIdx]
  const rot = res?.rotacoes[rotIdx] ?? null
  const lim = rot ? safraLimitante(rot) : null
  const incompleto = !rot || rot.anos == null
  const cls = !incompleto && lim?.anos != null ? classeAnos(lim.anos) : 'none'
  const fase = diag?.decisivo ?? null
  const culturaSelecionada = def.safras.findIndex(s => atencao.idx >= s.de && atencao.idx <= s.ate)
  const provisorio = rot?.safras.some(s => s.risco?.metodo === 'MOCK') ?? false
  const rankingTeste = conj.avisos.some(a => /\bMOCK\b/i.test(a))
  const porQue = conj.origem === 'api' ? porQueRanking(conj.rotacoes, rotIdx, conj.prioridades) : null
  const faltantes = rot?.safras.filter(s => !s.risco).map(s => s.nome).join(', ')
  const titulo = incompleto ? 'Faltam dados de risco' : cls === 'good' ? 'Favorável no risco geral da API' : 'Atenção à água'
  const [route, setRoute] = useState<{ rotation: string; page: Page; moment?: MomentoAtencao }>({ rotation: def.id, page: 'overview' })
  const page = route.rotation === def.id ? route.page : 'overview'
  const painel = useRef<HTMLElement>(null)
  const focusPending = useRef(false)
  const returnFocus = useRef('')
  function abrir(next: Page, origin: string, moment?: MomentoAtencao) {
    returnFocus.current = origin
    focusPending.current = true
    setRoute({ rotation: def.id, page: next, moment })
  }
  function voltar() {
    focusPending.current = true
    setRoute({ rotation: def.id, page: 'overview' })
  }
  useEffect(() => {
    if (!painel.current) return
    painel.current.scrollTop = 0
    if (focusPending.current) {
      const origin = page === 'overview' ? painel.current.querySelector<HTMLElement>(`[data-inspector-open="${returnFocus.current}"]`) : null
      ;(origin ?? painel.current.querySelector<HTMLElement>('h2'))?.focus()
      focusPending.current = false
    }
  }, [page, def.id])

  const soloBom = def.ct.soil === 'Melhora' || def.ct.soil === 'Ótima'
  return (
    <aside ref={painel} id="rotation-inspector" className="insp" aria-label="Detalhe da rotação selecionada" tabIndex={-1}
      onKeyDown={e => { if (e.key === 'Escape' && page !== 'overview') { e.stopPropagation(); voltar() } }}>
      {page === 'overview' ? <>
        <header className="insp-header">
          <h2 tabIndex={-1}>{def.ct.c1} <span className="insp-sequence" aria-label="seguida de">→</span> {minuscula(def.ct.c2)}</h2>
          <span className="insp-sr" role="status" aria-atomic="true">Rotação selecionada: {def.ct.c1} seguida de {def.ct.c2}. {titulo}.</span>
        </header>
        <section className={`insp-decision ${cls}`} aria-labelledby="insp-decision-title">
          <h3 id="insp-decision-title"><Icon name={cls === 'none' ? 'i-info' : SELO[cls].icon} />{titulo}</h3>
          {incompleto && <p className="insp-caption">{rot ? `O risco de ${faltantes || 'uma das safras'} não foi informado.` : 'Risco ainda indisponível.'}</p>}
          {provisorio && <p className="insp-provisional"><Icon name="i-info" /><span><strong>Provisório</strong> · sem cálculo para este talhão</span></p>}
        </section>
        <div className="insp-rank">
          <div className="insp-rank-h">
            <div><span>Posição no ranking</span><small>{rankingTeste ? 'Ordem provisória da API' : 'Entre as opções recebidas'}</small></div>
            <strong aria-label={`${rotIdx + 1}ª de ${conj.rotacoes.length} opções recebidas`}>{rotIdx + 1}ª de {conj.rotacoes.length}</strong>
          </div>
          {/* Por que nesta posição: média das prioridades ligadas nas escalas da API, contra a vizinha na lista */}
          {porQue && <p className="insp-rank-why">{porQue} <span>Economia de água não entra na ordem: a API ainda não a calcula.</span></p>}
        </div>
        <section className="insp-section" aria-label="Safras da rotação">
          <h3>Safras</h3>
          <div className="insp-group insp-culture-list">
            {def.safras.map((d, n) => {
              const sf = rot?.safras[n]
              const estado = sf?.anos != null ? classeAnos(sf.anos) : 'none'
              return <button key={`${d.ref}-${n}`} type="button" className={`insp-culture-row${culturaSelecionada === n ? ' selected' : ''}`} aria-pressed={culturaSelecionada === n}
                aria-label={`Ver a ${n + 1}ª safra (${d.nome}) no calendário. Plantio ${decendio(d.de)}; ${d.cobertura ? 'fim do ciclo' : 'colheita'} ${decendio(d.ate)}.`}
                onClick={() => onNavegarPeriodo(d.de)}>
                <span className={`insp-culture-dot ${estado}`} aria-hidden="true" />
                <span className="insp-culture-copy"><small className="insp-culture-ord">{n + 1}ª safra{d.cobertura ? ' · cobertura' : ''}</small><strong>{d.nome}</strong><small>Plantio {decendio(d.de).replace(' a ', '–')}</small><small>{d.cobertura ? 'Fim do ciclo' : 'Colheita'} {decendio(d.ate).replace(' a ', '–')}</small><small>{sf?.risco ? `Risco hídrico: ${sf.risco.pct}%${sf.risco.metodo === 'MOCK' ? ' · provisório' : ''}` : 'Risco não informado'}</small></span>
                <Selo safra={sf} compact />
              </button>
            })}
            <Row icon="i-calendar" label="Datas e requisitos" origin="dates" onClick={() => abrir('dates', 'dates')} />
          </div>
        </section>
        <AtencaoCiclo {...atencao} anosApi={rot?.anos ?? null} onNavegar={onNavegarPeriodo}
          onAbrirMomento={m => abrir('moment', `momento-${m.safra}-${m.de}`, m)} onAbrirMetodo={() => abrir('method', 'attention-method')} />
        {(fase || conj.rotacoes.length > 1) && <div className="insp-group" role="group" aria-label="Próximos passos">
          {fase && <Row icon="i-calendar" label="Ver fase no calendário" onClick={() => onVerPeriodo(fase.de)} />}
          {conj.rotacoes.length > 1 && <Row icon="i-layers" label="Comparar alternativas" onClick={onComparar} />}
        </div>}
        <section className="insp-section" aria-label="Limitações e cuidados">
          <h3>Limitações e cuidados</h3>
          <div className="insp-group">
            <Row icon={soloBom ? 'i-okc' : 'i-leaf'} tone={soloBom ? 'good' : 'warn'} label="Saúde do solo" detail={`${def.ct.soilWhy} · ${def.protecaoSolo ? 'API' : 'ilustrativo'}`} origin="soil" onClick={() => abrir('soil', 'soil')} />
            <Row icon="i-bug" tone={def.ct.pest === 'Menor risco' ? 'good' : 'warn'} label="Pragas" detail={`${def.ct.pest} · ilustrativo`} origin="pests" onClick={() => abrir('pests', 'pests')} />
          </div>
        </section>
        <section className="insp-section" aria-label="Sobre os dados">
          <h3>Sobre os dados</h3>
          <div className="insp-group">
            <Row icon="i-shield" label="Como interpretar o risco" origin="risk" onClick={() => abrir('risk', 'risk')} />
            <Row icon="i-info" label="Origem e limites dos dados" origin="sources" onClick={() => abrir('sources', 'sources')} />
          </div>
        </section>
        <a className="insp-return" href="#rotation-workspace">Voltar ao calendário e à comparação<Icon name="i-right" /></a>
      </> : <>
        <header className="insp-detail-header">
          <button className="insp-back" type="button" onClick={voltar}><Icon name="i-left" />Voltar</button>
          <h2 tabIndex={-1}>{TITULOS[page]}</h2>
          <p className="insp-meta">{def.ct.c1} → {minuscula(def.ct.c2)}</p>
        </header>
        <div className="insp-detail-body">
          {page === 'dates' && def.safras.map((d, n) => <section key={`${d.ref}-${n}`} className="insp-crop">
            <div className="insp-crop-header"><div><p className="insp-caption">{n === 0 ? '1ª safra' : d.cobertura ? '2ª safra · cobertura' : '2ª safra'}</p><h3>{d.nome}</h3></div><Selo safra={rot?.safras[n]} /></div>
            <dl className="insp-dates"><div><dt>Plantio</dt><dd>{decendio(d.de)}</dd></div><div><dt>{d.cobertura ? 'Fim do ciclo' : 'Colheita'}</dt><dd>{decendio(d.ate)}</dd></div></dl>
            <button className="insp-text-button" type="button" onClick={() => onVerDados(d.ref)}>Consultar requisitos de {d.nome}<Icon name="i-right" /></button>
          </section>)}
          {page === 'soil' && <>{def.protecaoSolo
            ? <><p className="insp-caption">Proteção do solo planejada, da API · {Math.round(def.scores?.soil_protection ?? def.protecaoSolo.score)} de 100 ({def.ct.soil.toLowerCase()})</p><p>{def.ct.soilWhy}.</p><p>Índice de planejamento (cobertura viva e troca de família botânica), não medida da saúde do solo.</p></>
            : <><p className="insp-caption">Avaliação ilustrativa · {def.ct.soil}</p><p>{def.ct.soilWhy}.</p></>}<h3>O que avaliar</h3><p>Confira no calendário os intervalos entre culturas e discuta a cobertura do solo com seu agrônomo.</p><p className="insp-caption">Sem avaliação específica do talhão; não explica a posição no ranking.</p></>}
          {page === 'pests' && <><p className="insp-caption">{def.ct.pest} · ilustrativo</p><p>{def.ct.pestWhy}</p><h3>O que avaliar</h3><p>Valide quais pragas ocorrem no talhão antes de definir o manejo. Este exemplo não substitui o monitoramento.</p></>}
          {page === 'risk' && <>
            <p>O percentual indica a frequência de safras históricas com perda por falta de água acima de um limiar. Não é o percentual de produtividade que será perdido.</p>
            {rot?.safras.map((s, n) => <p key={`${s.ref}-${n}`}><strong>{s.nome}:</strong> {s.risco ? `${s.risco.pct}% das ${s.risco.anosValidos} safras da referência com perda acima de ${s.risco.limiar}%.${s.risco.metodo === 'MOCK' ? ' Valor de teste, não calculado para este talhão.' : ''}` : 'risco não informado; a tela não estima um valor no lugar.'}</p>)}
            <p>A faixa da rotação acompanha a safra mais arriscada, na régua de resiliência exibida. Uma safra sem dado impede uma avaliação completa.</p>
            <p>O indicador cobre falta de água, não pragas, geada ou outros riscos.</p>
            <p>A fase de maior déficit é apontada pela API; o percentual de risco não é uma probabilidade de seca nessas datas. As datas da fase são posicionadas no calendário pelos estágios do ciclo{rot?.safras.some(s => s.calc.fonteFases === 'local') ? ', com proporções locais quando os estágios não vieram da API' : ' recebidos da API'}.</p>
          </>}
          {page === 'sources' && <>
            <p>{conj.origem === 'api' ? 'Rotações e datas: API Entressafras. A ordem é recebida da API: a média das prioridades ligadas nas escalas 0–100 dela (economia de água não entra).' : 'Rotações e datas ilustrativas.'}{rankingTeste ? ' O ranking ainda é de teste.' : ''}</p>
            <p>{clima ? `Chuva e temperatura: ${clima.fonte}, média de ${clima.safras.length} safras${clima.safras.length ? ` (${clima.safras[0]} a ${clima.safras.at(-1)})` : ''}.` : 'Clima indisponível. Os dados de risco recebidos são exibidos sem estimativa adicional.'}</p>
            {clima?.aviso_resolucao && <p>{clima.aviso_resolucao}</p>}
            <p>Requisitos das culturas: catálogo EcoCrop, quando disponível. Proteção do solo e atendimento à demanda de água por fase: API. Pragas, produção e preços são ilustrativos. Receita bruta ilustrativa não representa lucro: os custos não foram considerados.</p>
            <p>Use estas informações para comparar opções e validar o planejamento com seu agrônomo.</p>
          </>}
          {page === 'method' && <>
            <p>Atendimento = água que a cultura usou ÷ água de que precisava (ETa/ETc), por fase, na média das safras históricas do balanço hídrico da API (ISNA por estágio). A API não entrega valores dia a dia: dentro de uma fase, o valor é o mesmo em todos os decêndios.</p>
            <p>Fases pelos estágios FAO-56 da cultura, nas datas de plantio e colheita da API. Crítico abaixo de 45%; atenção de 45% a menos de 55%. Estes são limiares de apresentação, não limites oficiais de manejo. Alta sensibilidade: Ky da fase igual ou acima de 1 (FAO-33), também da API.</p>
            <p>A classificação geral pode ser favorável e ainda conter uma fase com atendimento baixo. Este panorama não explica o ranking da API e não calcula perda de produtividade ou lâmina de irrigação. Não é previsão do tempo nem medição do solo.</p>
            <a href="https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua" target="_blank" rel="noreferrer">Referência: resposta da soja à falta de água</a>
          </>}
          {page === 'moment' && route.moment && <>
            <p className={`insp-moment-status ${route.moment.estado}`}><Icon name={SELO[route.moment.estado].icon} />{route.moment.estado === 'risk' ? 'Crítico' : 'Atenção'} · {periodoMomento(route.moment)}</p>
            <h3>{route.moment.cultura}</h3><p>Fase: {route.moment.nomeFase}{route.moment.critica ? ' · fase de maior déficit na API' : ''}</p>
            <dl className="insp-reading"><dt>Atendimento à demanda na fase</dt><dd>{Math.round(route.moment.menorAtendimento * 100)}%</dd></dl>
            <p>{route.moment.reacao}</p><h3>O que conferir</h3><p>{route.moment.acao}</p>
            <button type="button" className="insp-text-button" onClick={() => onVerPeriodo(route.moment!.de)}>Ver este momento<Icon name="i-right" /></button>
            <p className="insp-caption">Média das safras históricas da API{route.moment && rot?.safras[route.moment.safra]?.risco?.metodo === 'MOCK' ? ' · provisório' : ''} · não é previsão nem medição no campo.</p>
          </>}
        </div>
      </>}
    </aside>
  )
}
