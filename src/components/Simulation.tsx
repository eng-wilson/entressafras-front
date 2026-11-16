import type { EstadoClima, EstadoCultura, Talhao } from '../types'
import { periodoLabel } from '../logic/periodo'
import { climaDoPeriodo } from '../logic/clima'
import { fonteCurta } from '../logic/fonteDado'
import { memo, useMemo } from 'react'
import type { Stage } from '../data/mock'
import { estagioEm } from '../logic/estagios'
import { tempGauge } from '../logic/tempGauge'
import { soilGauge } from '../logic/soilGauge'
import { RainGauge } from './RainGauge'
import { IsoField } from './IsoField'
import { SoilMoistureBar } from './SoilMoistureBar'
import { TempRangeBar } from './TempRangeBar'
import { QuadMap } from './QuadMap'
import type { Priority } from '../types'
import type { Resiliencia } from '../logic/resiliencia'
import { criticoEm, legendaCritico, type Diagnostico } from '../logic/diagnostico'
import { rotuloCritico } from '../logic/status'
import { useConjunto } from '../state/conjunto'
import { normaisDoClima, quadroDoDecendio, rotacaoSim } from '../logic/talhaoSim'
import { respostasDoLaudo } from '../logic/solo'
import type { QuadroAgua } from '../logic/atencaoCiclo'
import { t } from '../i18n'

type Props = {
  quadrosAgua?: QuadroAgua[]
  idx: number
  /** Rotação selecionada (posição no conjunto de rotações). */
  rot: number
  talhao: Talhao
  /** Estágios da rotação selecionada (logic/estagios.ts). */
  fases: Stage[]
  /** Diagnóstico da rotação selecionada: o chip do talhão avisa quando o decêndio é crítico. */
  diag: Diagnostico | null
  clima: EstadoClima
  cultura: EstadoCultura
  // No modo Comparação o talhão dá lugar ao mapa de aptidão das rotações marcadas
  cmp: { sel: number[]; pr: Priority; res: Resiliencia | null } | null
}

// memo: com o decêndio adiado (App.tsx), o React pode pular os renders intermediários desta árvore.
export const Simulation = memo(function Simulation({ idx, rot, talhao, fases, diag, clima, cultura, cmp, quadrosAgua }: Props) {
  const periodLabel = periodoLabel(idx)
  const periodo = climaDoPeriodo(clima.dados?.decendios ?? null, idx)
  const cargando = clima.status === 'carregando'
  // Selo da fonte (nome que a API dá em clima.fonte) embaixo dos números que vêm de satélite: chuva e temperatura.
  const fonte = fonteCurta(clima.dados?.fonte)
  const selo = fonte && <p className="selo-fonte">{t('Fonte')} · {fonte}</p>
  const cur = estagioEm(fases, idx)
  const crit = criticoEm(diag, idx)
  const alerta = crit && { cls: crit.cls, rotulo: rotuloCritico(crit), texto: legendaCritico(crit) }
  const covered = cur.k === 'straw'
  const atendimento = quadrosAgua?.find(q => q.idx === idx)?.atendimento ?? null
  // Atendimento à demanda da fase, da API (logic/atencaoCiclo.ts); MOCK no servidor = provisório.
  const provisorio = useConjunto().rotacoes[rot]?.safras.some(s => s.risco?.method === 'MOCK') ?? false
  const soil = useMemo(() => soilGauge(atendimento, !!cur.crop, provisorio), [atendimento, cur.crop, provisorio])
  const temp = useMemo(() => tempGauge(cur.crop, cur.k, covered, {
    tmin: periodo.tmin, tmax: periodo.tmax,
    tminExtremo: clima.dados?.decendios[idx]?.tmin_extremo_medio ?? null,
  }, cultura.dados), [periodo.tmin, periodo.tmax, clima.dados, idx, cur.crop, cur.k, covered, cultura.dados])

  // Talhão simulado: espera o clima do ponto (ou o erro, que cai nas normais do Cerrado) antes da 1ª corrida.
  const conj = useConjunto()
  const safras = conj.rotacoes[rot].safras
  const rotacao = useMemo(() => rotacaoSim(rot, safras), [rot, safras])
  const normais = useMemo(() => normaisDoClima(clima.dados?.decendios ?? null, clima.dados ? talhao.centro : null), [clima.dados, talhao.centro])
  const respostas = useMemo(() => respostasDoLaudo(talhao.analise), [talhao.analise])
  const quadro = quadroDoDecendio(safras, idx)
  const sim = cargando ? null : { rotacao, ...quadro, classeId: talhao.classe, respostas, normais }

  return (
    <section className="trio" aria-label={cmp ? t('Comparação das rotações marcadas') : t('Resumo do período simulado')}>
      {cmp ? (
        // A comparação vale para o ciclo inteiro: a data do decêndio não se aplica aqui
        <div className="trio-h">
          <span className="trio-k">{t('Comparando')}</span>
          <span className="trio-t">
            {cmp.sel.length === 1
              ? t('{n} rotação · safra {ano}', { n: cmp.sel.length, ano: `${conj.ano}/${String(conj.ano + 1).slice(2)}` })
              : t('{n} rotações · safra {ano}', { n: cmp.sel.length, ano: `${conj.ano}/${String(conj.ano + 1).slice(2)}` })}
          </span>
          <span className="trio-p">{t('avaliadas no ciclo completo, de setembro a agosto')}</span>
        </div>
      ) : (
        <div className="trio-h">
          <span className="trio-k">{t('Simulando')}</span>
          <span className="trio-t">{periodLabel}</span>
        </div>
      )}
      <div className="trio-g">
        {/* O mapa vem antes da cena: assim não herda o border-left de `.trio-g > * + *` */}
        {cmp && <QuadMap sel={cmp.sel} pr={cmp.pr} res={cmp.res} />}
        {/* A cena ocupa o campo inteiro; chuva, umidade e temperatura do decêndio flutuam sobre ela.
            No modo Comparação ela só fica escondida: desmontar destruiria o canvas, o cache de sprites e o zoom. */}
        <section className="field cena" aria-label={t('Seu talhão')} hidden={!!cmp}>
          <IsoField
            sim={sim}
            pausado={!!cmp}
            cropName={cur.cultura}
            alerta={alerta}
            stageKey={cur.k}
            stageName={cur.name}
            periodLabel={periodLabel}
          />
          <div className="cena-esq">
            <div className="cena-card">
              <RainGauge chuvaDecendio={periodo.chuvaDecendio} carregando={cargando} />
              {selo}
            </div>
            <div className="cena-card">
              <SoilMoistureBar soil={soil} />
            </div>
          </div>
          <div className="cena-dir">
            <div className="cena-card">
              <TempRangeBar temp={temp} carregando={cargando} carregandoReferencia={!!cur.crop && cultura.status === 'carregando'} />
              {selo}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
})
