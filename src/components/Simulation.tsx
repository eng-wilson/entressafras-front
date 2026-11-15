import type { EstadoClima, EstadoCultura, Talhao } from '../types'
import { periodoLabel } from '../logic/periodo'
import { climaDoPeriodo } from '../logic/clima'
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

type Props = {
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
export const Simulation = memo(function Simulation({ idx, rot, talhao, fases, diag, clima, cultura, cmp }: Props) {
  const periodLabel = periodoLabel(idx)
  const periodo = climaDoPeriodo(clima.dados?.decendios ?? null, idx)
  const cargando = clima.status === 'carregando'
  const cur = estagioEm(fases, idx)
  const crit = criticoEm(diag, idx)
  const alerta = crit && { cls: crit.cls, rotulo: rotuloCritico(crit), texto: legendaCritico(crit) }
  const covered = cur.k === 'straw'
  const soil = useMemo(() => soilGauge(idx, cur.crop, covered), [idx, cur.crop, covered])
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
    <section className="trio" aria-label={cmp ? 'Comparação das rotações marcadas' : 'Resumo do período simulado'}>
      {cmp ? (
        // A comparação vale para o ciclo inteiro: a data do decêndio não se aplica aqui
        <div className="trio-h">
          <span className="trio-k">Comparando</span>
          <span className="trio-t">
            {cmp.sel.length} {cmp.sel.length === 1 ? 'rotação' : 'rotações'} · safra {conj.ano}/{String(conj.ano + 1).slice(2)}
          </span>
          <span className="trio-p">avaliadas no ciclo completo, de setembro a agosto</span>
        </div>
      ) : (
        <div className="trio-h">
          <span className="trio-k">Simulando</span>
          <span className="trio-t">{periodLabel}</span>
        </div>
      )}
      {/* Palco de altura fixa: a cena fica montada (pausada) na Comparação e o mapa entra por cima, no mesmo
          espaço. Nada abaixo muda de lugar e a volta não recria a simulação. */}
      <div className={`trio-g palco${cmp ? ' com-cmp' : ''}`}>
        {/* A cena ocupa o campo inteiro; chuva, umidade e temperatura do decêndio flutuam sobre ela */}
        <section className="field cena" aria-label="Seu talhão" aria-hidden={cmp ? true : undefined} inert={!!cmp}>
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
            </div>
            <div className="cena-card">
              <SoilMoistureBar soil={soil} />
            </div>
          </div>
          <div className="cena-dir">
            <div className="cena-card">
              <TempRangeBar temp={temp} carregando={cargando} carregandoReferencia={!!cur.crop && cultura.status === 'carregando'} />
            </div>
          </div>
        </section>
        {cmp && <div className="palco-cmp"><QuadMap sel={cmp.sel} pr={cmp.pr} res={cmp.res} /></div>}
      </div>
    </section>
  )
})
