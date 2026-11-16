// Seletor de cenário de clima (ao lado de Calendário/Comparação) e a faixa que explica o cenário escolhido.
// A lista vem de GET /api/clima/scenarios, na ordem da API; os números da faixa vêm do cenário que a resposta usou.
import type { ClimateScenarioInfo } from '../types'
import { descricaoCenario, ehHistorico, rotuloCenario } from '../logic/cenarios'
import { t } from '../i18n'

export type CenarioUi = {
  lista: ClimateScenarioInfo[]
  selecionado: string
  onTrocar: (id: string) => void
  /** Cenário que a resposta exibida usou (fonte de verdade da faixa); null = clima atual. */
  info: ClimateScenarioInfo | null
  /** O risco do cenário escolhido ainda está sendo calculado. */
  carregando: boolean
}

const DICA = 'Cenários de clima futuro: usamos os 30 anos reais ajustados pelas projeções climáticas (+temperatura, −chuva). Não é uma previsão do próximo ano.'

export function SeletorCenario({ lista, selecionado, onTrocar, carregando }: CenarioUi) {
  if (lista.length < 2) return null
  return (
    <label className="cen-sel" title={t(DICA)} aria-busy={carregando}>
      <svg className="ic" aria-hidden="true">
        <use href="/canvas-icons.svg#i-temp" />
      </svg>
      <span className="sr-only">{t('Clima')}</span>
      <select value={selecionado} onChange={e => onTrocar(e.target.value)} aria-describedby="cen-dica">
        {lista.map(c => <option key={c.id} value={c.id}>{rotuloCenario(c)}</option>)}
      </select>
      <span id="cen-dica" className="sr-only">{t(DICA)}</span>
      {carregando && <span className="cen-spin" aria-hidden="true" />}
    </label>
  )
}

/** Faixa abaixo do cabeçalho: só quando o cenário exibido não é o clima atual. */
export function FaixaCenario({ info }: { info: ClimateScenarioInfo | null }) {
  if (!info || ehHistorico(info.id)) return null
  return (
    <div className="cen-faixa" role="note">
      <strong>{rotuloCenario(info)}</strong>
      <span>{descricaoCenario(info)}</span>
    </div>
  )
}
