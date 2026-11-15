import { useEffect, useRef, useState } from 'react'
import { aptidao, faixaDaNota, NOME_EIXO, safraLimitante, type Eixo } from '../logic/aptidao'
import { BarraPrioridade, ILUSTRATIVO, leituraPrioridade } from './BarraPrioridade'
import { porQueRanking } from '../logic/porQueRanking'
import type { Resiliencia, ResSafra } from '../logic/resiliencia'
import { classeAnos } from '../logic/status'
import type { ClimaDecendios } from '../types'
import { LEN, MONTHS_SHORT } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import { decendioDoMes, mesDe } from '../logic/periodo'
import type { Diagnostico } from '../logic/diagnostico'
import type { MomentoAtencao } from '../logic/atencaoCiclo'
import { periodoMomento } from '../logic/atencaoCiclo'
import { idioma, ordinal, t } from '../i18n'
import { AtencaoCiclo, type AtencaoCicloProps } from './AtencaoCiclo'
import './inspector.css'

const SELO = {
  good: { icon: 'i-okc', rotulo: 'Favorável' },
  warn: { icon: 'i-alert', rotulo: 'Arriscado' },
  risk: { icon: 'i-xc', rotulo: 'Desfavorável' },
} as const
// Prioridades na região: as 4 do "O que importa"; a chave da API diz se a prioridade está ligada no ranking.
const PARAMETROS: { k: Eixo; api: 'water_security' | 'soil_protection' | 'productivity' | null }[] = [
  { k: 'risco', api: 'water_security' }, { k: 'agua', api: null }, { k: 'solo', api: 'soil_protection' }, { k: 'prod', api: 'productivity' },
]
/** O que cada prioridade significa (página de detalhe ao tocar nela). */
const EXPLICACAO: Record<Eixo, string> = {
  risco: 'Quanto a rotação resiste à falta de água no clima deste local. Vem do risco hídrico que a API calcula para as duas safras, nos anos históricos.',
  agua: 'Quanto a rotação economiza água em comparação com as outras opções. Ainda é ilustrativo: a API não calcula este indicador.',
  solo: 'Quanto a rotação protege o solo: dias com cobertura viva e troca de família botânica entre as culturas. É um índice de planejamento da API, não uma medida do solo.',
  prod: 'Quanto da produtividade a rotação preserva diante da falta de água, pela cultura mais afetada. Calculado pela API para este local.',
}
function Icon({ name }: { name: string }) {
  return <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${name}`} /></svg>
}
function Selo({ safra, compact = false }: { safra: ResSafra | undefined; compact?: boolean }) {
  if (safra?.anos == null) return <span className="insp-status none">{t('Sem dado')}</span>
  const cls = classeAnos(safra.anos)
  return <span className={`insp-status ${cls}`}>{!compact && <Icon name={SELO[cls].icon} />}{t(SELO[cls].rotulo)}</span>
}
function Row({ icon, label, detail, onClick, origin, tone = 'neutral' }: { icon: string; label: string; detail?: string; onClick: () => void; origin?: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <button type="button" className="insp-row" data-inspector-open={origin} onClick={onClick}>
    <span className={`insp-row-icon ${tone}`}><Icon name={icon} /></span><span className="insp-row-copy">{label}{detail && <small>{detail}</small>}</span><svg className="ic insp-chevron" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
  </button>
}
/** Decêndio: "1 a 10 set" (curto: "1–10 set"); em inglês, "Sep 1–10". */
function decendio(idx: number, curto = false) {
  const d = decendioDoMes(idx)
  const ini = d * 10 + 1, fim = d === 2 ? LEN[mesDe(idx)] : d * 10 + 10
  const mesPt = t(MONTHS_SHORT[mesDe(idx)])
  const mes = idioma() === 'pt' ? mesPt.toLowerCase() : mesPt
  return curto ? t('{ini}–{fim} {mes}', { ini, fim, mes }) : t('{ini} a {fim} {mes}', { ini, fim, mes })
}
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const TITULOS = { param: 'Prioridade', dates: 'Datas e requisitos', soil: 'Saúde do solo', pests: 'Pragas', risk: 'Como interpretar o risco', sources: 'Origem e limites dos dados', method: 'Como ler estes momentos', moment: 'Momento de atenção' }
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
  const faltantes = rot?.safras.filter(s => !s.risco).map(s => t(s.nome)).join(', ')
  const titulo = incompleto ? t('Faltam dados de risco') : cls === 'good' ? t('Favorável no risco geral da API') : t('Atenção à água')
  const c1 = t(def.ct.c1), c2 = t(def.ct.c2)
  const [route, setRoute] = useState<{ rotation: string; page: Page; moment?: MomentoAtencao; param?: Eixo }>({ rotation: def.id, page: 'overview' })
  const page = route.rotation === def.id ? route.page : 'overview'
  const painel = useRef<HTMLElement>(null)
  const focusPending = useRef(false)
  const returnFocus = useRef('')
  function abrir(next: Page, origin: string, moment?: MomentoAtencao, param?: Eixo) {
    returnFocus.current = origin
    focusPending.current = true
    setRoute({ rotation: def.id, page: next, moment, param })
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
  // Notas 0–100 da rotação neste talhão (escalas da API; economia de água ainda é ilustrativa)
  const notas = aptidao(rotIdx, rot, conj.rotacoes)
  const ordSafra = (n: number, cobertura: boolean | undefined) =>
    cobertura ? t('{ord} safra · cobertura', { ord: ordinal(n + 1) }) : t('{ord} safra', { ord: ordinal(n + 1) })
  return (
    <aside ref={painel} id="rotation-inspector" className="insp" aria-label={t('Detalhe da rotação selecionada')} tabIndex={-1}
      onKeyDown={e => { if (e.key === 'Escape' && page !== 'overview') { e.stopPropagation(); voltar() } }}>
      {page === 'overview' ? <>
        <header className="insp-header">
          <p className="insp-kicker">{t('Rotação selecionada')}</p>
          <h2 tabIndex={-1}>{c1} <span className="insp-sequence" aria-label={t('seguida de')}>→</span> {minuscula(c2)}</h2>
          <span className="insp-sr" role="status" aria-atomic="true">{t('Rotação selecionada: {c1} seguida de {c2}. {titulo}.', { c1, c2, titulo })}</span>
        </header>
        <section className={`insp-decision ${cls}`} aria-labelledby="insp-decision-title">
          <h3 id="insp-decision-title"><Icon name={cls === 'none' ? 'i-info' : SELO[cls].icon} />{titulo}</h3>
          {incompleto && <p className="insp-caption">{rot ? t('O risco de {culturas} não foi informado.', { culturas: faltantes || t('uma das safras') }) : t('Risco ainda indisponível.')}</p>}
          {provisorio && <p className="insp-provisional"><Icon name="i-info" /><span><strong>{t('Provisório')}</strong> · {t('sem cálculo para este talhão')}</span></p>}
        </section>
        <div className="insp-rank">
          <div className="insp-rank-h">
            <div><span>{t('Posição no ranking')}</span><small>{rankingTeste ? t('Ordem provisória da API') : t('Entre as opções recebidas')}</small></div>
            <strong aria-label={t('{pos} de {total} opções recebidas', { pos: ordinal(rotIdx + 1), total: conj.rotacoes.length })}>{t('{pos} de {total}', { pos: ordinal(rotIdx + 1), total: conj.rotacoes.length })}</strong>
          </div>
          {/* Por que nesta posição: média das prioridades ligadas nas escalas da API, contra a vizinha na lista */}
          {porQue && <p className="insp-rank-why">{porQue} <span>{t('Economia de água não entra na ordem: a API ainda não a calcula.')}</span></p>}
        </div>
        {/* Como a rotação atende às 4 prioridades neste talhão: visual, quase sem texto */}
        <section className="insp-section" aria-label={t('Prioridades na sua região')}>
          <h3>{t('Prioridades na sua região')}</h3>
          <div className="insp-group insp-params">
            {PARAMETROS.map(({ k, api }) => {
              const nota = notas[k]
              const f = faixaDaNota(k, nota, rot)
              return (
                <button key={k} type="button" className={`insp-param bp-linha${api != null && conj.prioridades?.[api] === 1 ? ' on' : ''}`}
                  data-inspector-open={`param-${k}`} aria-label={`${leituraPrioridade(k, nota, f)}. ${t('Ver o que significa')}`}
                  title={ILUSTRATIVO[k] ? t('Ilustrativo: a API ainda não calcula economia de água') : undefined}
                  onClick={() => abrir('param', `param-${k}`, undefined, k)}>
                  <BarraPrioridade k={k} nota={nota} f={f} meter={false} />
                  <svg className="ic insp-chevron" aria-hidden="true"><use href="/canvas-icons.svg#i-right" /></svg>
                </button>
              )
            })}
          </div>
        </section>
        <section className="insp-section" aria-label={t('Safras da rotação')}>
          <h3>{t('Safras')}</h3>
          <div className="insp-group insp-culture-list">
            {def.safras.map((d, n) => {
              const sf = rot?.safras[n]
              const estado = sf?.anos != null ? classeAnos(sf.anos) : 'none'
              const nome = t(d.nome)
              const vars = { ord: ordinal(n + 1), nome, plantio: decendio(d.de), fim: decendio(d.ate) }
              return <button key={`${d.ref}-${n}`} type="button" className={`insp-culture-row${culturaSelecionada === n ? ' selected' : ''}`} aria-pressed={culturaSelecionada === n}
                aria-label={d.cobertura
                  ? t('Ver a {ord} safra ({nome}) no calendário. Plantio {plantio}; fim do ciclo {fim}.', vars)
                  : t('Ver a {ord} safra ({nome}) no calendário. Plantio {plantio}; colheita {fim}.', vars)}
                onClick={() => onNavegarPeriodo(d.de)}>
                <span className={`insp-culture-dot ${estado}`} aria-hidden="true" />
                {/* Compacta: safra, cultura e selo. Datas e risco ficam no aria-label e em "Datas e requisitos". */}
                <span className="insp-culture-copy"><small className="insp-culture-ord">{ordSafra(n, d.cobertura)}</small><strong>{nome}</strong></span>
                <Selo safra={sf} compact />
              </button>
            })}
            {fase && <Row icon="i-calendar" label={t('Ver fase no calendário')} onClick={() => onVerPeriodo(fase.de)} />}
            {conj.rotacoes.length > 1 && <Row icon="i-layers" label={t('Comparar alternativas')} onClick={onComparar} />}
          </div>
        </section>
        <AtencaoCiclo {...atencao} anosApi={rot?.anos ?? null} onNavegar={onNavegarPeriodo}
          onAbrirMomento={m => abrir('moment', `momento-${m.safra}-${m.de}`, m)} onAbrirMetodo={() => abrir('method', 'attention-method')} />
        <section className="insp-section" aria-label={t('Limitações e cuidados')}>
          <h3>{t('Limitações e cuidados')}</h3>
          <div className="insp-group">
            <Row icon={soloBom ? 'i-okc' : 'i-leaf'} tone={soloBom ? 'good' : 'warn'} label={t('Saúde do solo')} detail={`${t(def.ct.soilWhy)} · ${def.protecaoSolo ? 'API' : t('ilustrativo')}`} origin="soil" onClick={() => abrir('soil', 'soil')} />
            <Row icon="i-bug" tone={def.ct.pest === 'Menor risco' ? 'good' : 'warn'} label={t('Pragas')} detail={`${t(def.ct.pest)} · ${t('ilustrativo')}`} origin="pests" onClick={() => abrir('pests', 'pests')} />
          </div>
        </section>
        <section className="insp-section" aria-label={t('Sobre os dados')}>
          <h3>{t('Sobre os dados')}</h3>
          <div className="insp-group">
            <Row icon="i-calendar" label={t('Datas e requisitos')} origin="dates" onClick={() => abrir('dates', 'dates')} />
            <Row icon="i-shield" label={t('Como interpretar o risco')} origin="risk" onClick={() => abrir('risk', 'risk')} />
            <Row icon="i-info" label={t('Origem e limites dos dados')} origin="sources" onClick={() => abrir('sources', 'sources')} />
          </div>
        </section>
        <a className="insp-return" href="#rotation-workspace">{t('Voltar ao calendário e à comparação')}<Icon name="i-right" /></a>
      </> : <>
        <header className="insp-detail-header">
          <button className="insp-back" type="button" onClick={voltar}><Icon name="i-left" />{t('Voltar')}</button>
          <h2 tabIndex={-1}>{page === 'param' && route.param ? t(NOME_EIXO[route.param]) : t(TITULOS[page])}</h2>
          <p className="insp-meta">{c1} → {minuscula(c2)}</p>
        </header>
        <div className="insp-detail-body">
          {page === 'dates' && def.safras.map((d, n) => <section key={`${d.ref}-${n}`} className="insp-crop">
            <div className="insp-crop-header"><div><p className="insp-caption">{n === 0 ? ordSafra(0, false) : ordSafra(1, d.cobertura)}</p><h3>{t(d.nome)}</h3></div><Selo safra={rot?.safras[n]} /></div>
            <dl className="insp-dates"><div><dt>{t('Plantio')}</dt><dd>{decendio(d.de)}</dd></div><div><dt>{d.cobertura ? t('Fim do ciclo') : t('Colheita')}</dt><dd>{decendio(d.ate)}</dd></div></dl>
            <button className="insp-text-button" type="button" onClick={() => onVerDados(d.ref)}>{t('Consultar requisitos de {nome}', { nome: t(d.nome) })}<Icon name="i-right" /></button>
          </section>)}
          {page === 'param' && route.param && (() => {
            const k = route.param
            const api = PARAMETROS.find(p => p.k === k)!.api
            const ligada = api != null && conj.prioridades?.[api] === 1
            return <>
              <div className="insp-group insp-param-detalhe"><div className={`insp-param bp-linha${ligada ? ' on' : ''}`}>
                <BarraPrioridade k={k} nota={notas[k]} f={faixaDaNota(k, notas[k], rot)} />
              </div></div>
              <p>{t(EXPLICACAO[k])}</p>
              <p className="insp-caption">{api == null ? t('Ainda não entra na ordem das rotações.') : ligada ? t('Entra na ordem das rotações: está ligada em "O que importa".') : t('Não entra na ordem agora: está desligada em "O que importa".')}</p>
            </>
          })()}
          {page === 'soil' && <>{def.protecaoSolo
            ? <><p className="insp-caption">{t('Proteção do solo planejada, da API · {nota} de 100 ({nivel})', { nota: Math.round(def.scores?.soil_protection ?? def.protecaoSolo.score), nivel: t(def.ct.soil).toLowerCase() })}</p><p>{t(def.ct.soilWhy)}.</p><p>{t('Índice de planejamento (cobertura viva e troca de família botânica), não medida da saúde do solo.')}</p></>
            : <><p className="insp-caption">{t('Avaliação ilustrativa · {nivel}', { nivel: t(def.ct.soil) })}</p><p>{t(def.ct.soilWhy)}.</p></>}<h3>{t('O que avaliar')}</h3><p>{t('Confira no calendário os intervalos entre culturas e discuta a cobertura do solo com seu agrônomo.')}</p><p className="insp-caption">{t('Sem avaliação específica do talhão; não explica a posição no ranking.')}</p></>}
          {page === 'pests' && <><p className="insp-caption">{t(def.ct.pest)} · {t('ilustrativo')}</p><p>{t(def.ct.pestWhy)}</p><h3>{t('O que avaliar')}</h3><p>{t('Valide quais pragas ocorrem no talhão antes de definir o manejo. Este exemplo não substitui o monitoramento.')}</p></>}
          {page === 'risk' && <>
            <p>{t('O percentual indica a frequência de safras históricas com perda por falta de água acima de um limiar. Não é o percentual de produtividade que será perdido.')}</p>
            {rot?.safras.map((s, n) => <p key={`${s.ref}-${n}`}><strong>{t(s.nome)}:</strong> {s.risco ? `${t('{pct}% das {anos} safras da referência com perda acima de {limiar}%.', { pct: s.risco.pct, anos: s.risco.anosValidos, limiar: s.risco.limiar })}${s.risco.metodo === 'MOCK' ? ` ${t('Valor de teste, não calculado para este talhão.')}` : ''}` : t('risco não informado; a tela não estima um valor no lugar.')}</p>)}
            <p>{t('A faixa da rotação acompanha a safra mais arriscada, na régua de resiliência exibida. Uma safra sem dado impede uma avaliação completa.')}</p>
            <p>{t('O indicador cobre falta de água, não pragas, geada ou outros riscos.')}</p>
            <p>{rot?.safras.some(s => s.calc.fonteFases === 'local')
              ? t('A fase de maior déficit é apontada pela API; o percentual de risco não é uma probabilidade de seca nessas datas. As datas da fase são posicionadas no calendário pelos estágios do ciclo, com proporções locais quando os estágios não vieram da API.')
              : t('A fase de maior déficit é apontada pela API; o percentual de risco não é uma probabilidade de seca nessas datas. As datas da fase são posicionadas no calendário pelos estágios do ciclo recebidos da API.')}</p>
          </>}
          {page === 'sources' && <>
            <p>{conj.origem === 'api' ? t('Rotações e datas: API Entressafras. A ordem é recebida da API: a média das prioridades ligadas nas escalas 0–100 dela (economia de água não entra).') : t('Rotações e datas ilustrativas.')}{rankingTeste ? ` ${t('O ranking ainda é de teste.')}` : ''}</p>
            <p>{clima
              ? clima.safras.length
                ? t('Chuva e temperatura: {fonte}, média de {n} safras ({de} a {ate}).', { fonte: clima.fonte, n: clima.safras.length, de: clima.safras[0], ate: clima.safras.at(-1) })
                : t('Chuva e temperatura: {fonte}, média de {n} safras.', { fonte: clima.fonte, n: clima.safras.length })
              : t('Clima indisponível. Os dados de risco recebidos são exibidos sem estimativa adicional.')}</p>
            {clima?.aviso_resolucao && <p>{clima.aviso_resolucao}</p>}
            <p>{t('Requisitos das culturas: catálogo EcoCrop, quando disponível. Proteção do solo e atendimento à demanda de água por fase: API. Pragas, produção e preços são ilustrativos. Receita bruta ilustrativa não representa lucro: os custos não foram considerados.')}</p>
            <p>{t('Use estas informações para comparar opções e validar o planejamento com seu agrônomo.')}</p>
          </>}
          {page === 'method' && <>
            <p>{t('Atendimento = água que a cultura usou ÷ água de que precisava (ETa/ETc), por fase, na média das safras históricas do balanço hídrico da API (ISNA por estágio). A API não entrega valores dia a dia: dentro de uma fase, o valor é o mesmo em todos os decêndios.')}</p>
            <p>{t('Fases pelos estágios FAO-56 da cultura, nas datas de plantio e colheita da API. Crítico abaixo de 45%; atenção de 45% a menos de 55%. Estes são limiares de apresentação, não limites oficiais de manejo. Alta sensibilidade: Ky da fase igual ou acima de 1 (FAO-33), também da API.')}</p>
            <p>{t('A classificação geral pode ser favorável e ainda conter uma fase com atendimento baixo. Este panorama não explica o ranking da API e não calcula perda de produtividade ou lâmina de irrigação. Não é previsão do tempo nem medição do solo.')}</p>
            <a href="https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/cultivos/soja/pre-producao/caracteristicas-da-especie-e-relacoes-com-o-ambiente/exigencias-climaticas/agua/sintomas-de-falta-de-agua" target="_blank" rel="noreferrer">{t('Referência: resposta da soja à falta de água')}</a>
          </>}
          {page === 'moment' && route.moment && <>
            <p className={`insp-moment-status ${route.moment.estado}`}><Icon name={SELO[route.moment.estado].icon} />{route.moment.estado === 'risk' ? t('Crítico') : t('Atenção')} · {periodoMomento(route.moment)}</p>
            <h3>{t(route.moment.cultura)}</h3><p>{route.moment.critica ? t('Fase: {fase} · fase de maior déficit na API', { fase: t(route.moment.nomeFase) }) : t('Fase: {fase}', { fase: t(route.moment.nomeFase) })}</p>
            <dl className="insp-reading"><dt>{t('Atendimento à demanda na fase')}</dt><dd>{Math.round(route.moment.menorAtendimento * 100)}%</dd></dl>
            <p>{t(route.moment.reacao)}</p><h3>{t('O que conferir')}</h3><p>{t(route.moment.acao)}</p>
            <button type="button" className="insp-text-button" onClick={() => onVerPeriodo(route.moment!.de)}>{t('Ver este momento')}<Icon name="i-right" /></button>
            <p className="insp-caption">{route.moment && rot?.safras[route.moment.safra]?.risco?.metodo === 'MOCK'
              ? t('Média das safras históricas da API · provisório · não é previsão nem medição no campo.')
              : t('Média das safras históricas da API · não é previsão nem medição no campo.')}</p>
          </>}
        </div>
      </>}
    </aside>
  )
}
