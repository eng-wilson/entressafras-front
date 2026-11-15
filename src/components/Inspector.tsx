import { useEffect, useRef } from 'react'
import { NOME_EIXO, safraLimitante } from '../logic/aptidao'
import type { Resiliencia, ResSafra } from '../logic/resiliencia'
import { classeAnos } from '../logic/status'
import type { ClimaDecendios } from '../types'
import { MONTHS_SHORT } from '../data/mock'
import { useConjunto } from '../state/conjunto'
import { diasDe, mesDe } from '../logic/periodo'
import { PROBLEMA_FASE, type Diagnostico } from '../logic/diagnostico'
import { RiskBars, CycleTimeline } from './InspectorCharts'
import './inspector.css'

const SELO = {
  good: { icon: 'i-okc', rotulo: 'Favorável' },
  warn: { icon: 'i-alert', rotulo: 'Arriscado' },
  risk: { icon: 'i-xc', rotulo: 'Desfavorável' },
} as const

function Icon({ name }: { name: string }) {
  return <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${name}`} /></svg>
}

function Selo({ safra }: { safra: ResSafra | undefined }) {
  if (safra?.anos == null) return <span className="insp-status none">Sem dado</span>
  const cls = classeAnos(safra.anos)
  return <span className={`insp-status ${cls}`}><Icon name={SELO[cls].icon} />{SELO[cls].rotulo}</span>
}

/** Exibe a janela recebida, sem sugerir datas alternativas não avaliadas. */
const decendio = (idx: number) => `${diasDe(idx)} ${MONTHS_SHORT[mesDe(idx)].toLowerCase()}`
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

type Props = {
  clima: ClimaDecendios | null
  rotIdx: number
  diag: Diagnostico | null
  onVerDados: (ref: string) => void
  onVerPeriodo: (idx: number) => void
  onComparar: () => void
  res: Resiliencia | null
}

export function Inspector({ clima, onVerDados, onVerPeriodo, onComparar, res, rotIdx, diag }: Props) {
  const conj = useConjunto()
  const def = conj.rotacoes[rotIdx]
  const rot = res?.rotacoes[rotIdx] ?? null
  const lim = rot ? safraLimitante(rot) : null
  const incompleto = !rot || rot.anos == null
  const cls = !incompleto && lim?.anos != null ? classeAnos(lim.anos) : 'none'
  const fase = diag?.decisivo ?? null
  const provisorio = rot?.safras.some(s => s.risco?.metodo === 'MOCK') ?? false
  const rankingTeste = conj.avisos.some(a => /\bMOCK\b/i.test(a))
  const faltantes = rot?.safras.filter(s => !s.risco).map(s => s.nome).join(', ')
  const titulo = incompleto ? 'Faltam dados de risco'
    : cls === 'good' ? 'Favorável no risco geral da API'
      : 'Atenção à água'
  const painel = useRef<HTMLElement>(null)
  useEffect(() => { if (painel.current) painel.current.scrollTop = 0 }, [def.id])

  return (
    <aside ref={painel} id="rotation-inspector" className="insp" aria-label="Detalhe da rotação selecionada" tabIndex={-1}>
      <header className="insp-header">
        <h2>{def.ct.c1} <span className="insp-sequence" aria-label="seguida de">→</span> {minuscula(def.ct.c2)}</h2>
        <p className="insp-meta">{rotIdx + 1}ª na ordem {conj.origem === 'api' ? 'da API' : 'ilustrativa'}{rankingTeste ? ' · ranking de teste' : ''}</p>
        <span className="insp-sr" role="status" aria-atomic="true">Rotação selecionada: {def.ct.c1} seguida de {def.ct.c2}. {titulo}.</span>
      </header>

      <section className={`insp-decision ${cls}`} aria-labelledby="insp-decision-title">
        <h3 id="insp-decision-title"><Icon name={cls === 'none' ? 'i-info' : SELO[cls].icon} />{titulo}</h3>
        {incompleto && <p className="insp-caption">{rot ? `O risco de ${faltantes || 'uma das safras'} não foi informado.` : 'Risco ainda indisponível.'}</p>}
        <RiskBars def={def} rot={rot} />
        {provisorio && <p className="insp-provisional"><Icon name="i-info" /><span><strong>Provisório</strong> · sem cálculo para este talhão</span></p>}
      </section>

      <section className="insp-phase" aria-label="Ciclo e fase crítica">
        <CycleTimeline def={def} rot={rot} diag={diag} onVerPeriodo={onVerPeriodo} />
        {fase ? <details className="insp-disclosure insp-impact">
          <summary><Icon name="i-drop" /><span>Por que esta fase importa?<small>{fase.nome} · {fase.nomeFase}</small></span></summary>
          <div className="insp-disclosure-body"><p>{PROBLEMA_FASE[fase.fase]}</p><p className="insp-caption">Efeito geral, não uma previsão para o talhão.</p></div>
        </details> : cls !== 'good' && cls !== 'none' ? <p className="insp-caption">A fase de maior déficit não foi informada.</p> : null}
      </section>

      {(fase || conj.rotacoes.length > 1) && <div className="insp-group insp-actions" role="group" aria-label="Próximos passos">
        {fase && <button type="button" className="insp-action primary" onClick={() => onVerPeriodo(fase.de)}><Icon name="i-calendar" /><span>Ver fase no calendário</span><Icon name="i-right" /></button>}
        {conj.rotacoes.length > 1 && <button type="button" className="insp-action" onClick={onComparar}><Icon name="i-layers" /><span>Comparar alternativas</span><Icon name="i-right" /></button>}
      </div>}

      <details className="insp-group insp-disclosure" key={`dates-${def.id}`}>
        <summary><Icon name="i-calendar" /><span>Datas e requisitos<small>Plantio, colheita e culturas</small></span></summary>
        <div>
          {def.safras.map((d, n) => {
            const sf = rot?.safras[n]
            return (
              <div key={`${d.ref}-${n}`} className="insp-crop">
                <div className="insp-crop-header">
                  <div><p className="insp-caption">{n === 0 ? '1ª safra' : d.cobertura ? '2ª safra · cobertura' : '2ª safra'}</p><h4>{d.nome}</h4></div>
                  <Selo safra={sf} />
                </div>
                <dl className="insp-dates">
                  <div><dt>Plantio</dt><dd>{decendio(d.de)}</dd></div>
                  <div><dt>{d.cobertura ? 'Fim do ciclo' : 'Colheita'}</dt><dd>{decendio(d.ate)}</dd></div>
                </dl>
                <button className="insp-text-button" type="button" onClick={() => onVerDados(d.ref)}>Consultar requisitos de {d.nome}<Icon name="i-right" /></button>
              </div>
            )
          })}
        </div>
      </details>

      <section key={`tradeoffs-${def.id}`} className="insp-section" aria-labelledby="insp-tradeoffs-title">
        <h3 id="insp-tradeoffs-title">Solo e pragas</h3>
        <div className="insp-group">
          <details className="insp-disclosure">
            <summary><Icon name="i-leaf" /><span>{NOME_EIXO.solo}<small>{def.ct.soilWhy}{def.protecaoSolo ? ' · API' : ' · ilustrativo'}</small></span></summary>
            <div className="insp-disclosure-body">
              {def.protecaoSolo
                ? <p>Proteção do solo planejada, da API: {Math.round(def.scores?.soil_protection ?? def.protecaoSolo.score)} de 100 ({minuscula(def.ct.soil)}). Índice de planejamento (cobertura viva e troca de família botânica), não medida da saúde do solo.</p>
                : <p>Avaliação ilustrativa: {minuscula(def.ct.soil)}.</p>}
              <p><strong>O que avaliar:</strong> confira no calendário os intervalos entre culturas e discuta a cobertura do solo com seu agrônomo.</p>
            </div>
          </details>
          <details className="insp-disclosure">
            <summary><Icon name="i-bug" /><span>Pragas<small>{def.ct.pest} · ilustrativo</small></span></summary>
            <div className="insp-disclosure-body">
              <p>{def.ct.pestWhy}</p>
              <p><strong>O que avaliar:</strong> valide quais pragas ocorrem no talhão antes de definir o manejo. Este exemplo não substitui o monitoramento.</p>
            </div>
          </details>
        </div>
      </section>

      <div key={`method-${def.id}`} className="insp-group insp-method">
        <details className="insp-disclosure">
          <summary><Icon name="i-shield" /><span>Como interpretar o risco</span></summary>
          <div className="insp-disclosure-body">
            <p>O percentual indica a frequência de safras históricas com perda por falta de água acima de um limiar. Não é o percentual de produtividade que será perdido.</p>
            {rot?.safras.map((s, n) => <p key={`${s.ref}-${n}`}><strong>{s.nome}:</strong> {s.risco ? `${s.risco.pct}% das ${s.risco.anosValidos} safras da referência com perda acima de ${s.risco.limiar}%.${s.risco.metodo === 'MOCK' ? ' Valor de teste, não calculado para este talhão.' : ''}` : 'risco não informado; a tela não estima um valor no lugar.'}</p>)}
            <p>A faixa da rotação acompanha a safra mais arriscada, na régua de resiliência exibida. Uma safra sem dado impede uma avaliação completa.</p>
            <p>O indicador cobre falta de água, não pragas, geada ou outros riscos.</p>
            <p>A fase de maior déficit é apontada pela API; o percentual de risco não é uma probabilidade de seca nessas datas. As datas da fase são posicionadas no calendário pelos estágios do ciclo{rot?.safras.some(s => s.calc.fonteFases === 'local') ? ', com proporções locais quando os estágios não vieram da API' : ' recebidos da API'}.</p>
          </div>
        </details>
        <details className="insp-disclosure">
          <summary><Icon name="i-info" /><span>Origem e limites dos dados</span></summary>
          <div className="insp-disclosure-body">
            <p>{conj.origem === 'api' ? 'Rotações e datas: API Entressafras. A ordem é recebida da API; os motivos de cada posição não são fornecidos.' : 'Rotações e datas ilustrativas.'}{rankingTeste ? ' O ranking ainda é de teste.' : ''}</p>
            <p>{clima ? `Chuva e temperatura: ${clima.fonte}, média de ${clima.safras.length} safras${clima.safras.length ? ` (${clima.safras[0]} a ${clima.safras.at(-1)})` : ''}.` : 'Clima indisponível. Os dados de risco recebidos são exibidos sem estimativa adicional.'}</p>
            {clima?.aviso_resolucao && <p>{clima.aviso_resolucao}</p>}
            <p>Requisitos das culturas: catálogo EcoCrop, quando disponível. Proteção do solo e atendimento à demanda de água por fase: API. Pragas, produção e preços são ilustrativos. Receita bruta ilustrativa não representa lucro: os custos não foram considerados.</p>
            <p>Use estas informações para comparar opções e validar o planejamento com seu agrônomo.</p>
          </div>
        </details>
      </div>
      <a className="insp-return" href="#rotation-workspace">Voltar ao calendário e à comparação<Icon name="i-right" /></a>
    </aside>
  )
}
