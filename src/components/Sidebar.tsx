import type { EstadoClima, Priority, SoilInfo, Talhao } from '../types'
import { useConjunto } from '../state/conjunto'
import { fmtCoord, fmtHaCurto } from '../logic/geo'
import { rotuloSolo } from '../logic/solo'
import { registroMaisRecente, resumoSafra } from '../logic/historico'
import { chuvaDoAno } from '../logic/clima'
import { inteiro, SEM_DADO } from '../logic/formato'
import { NOME_EIXO } from '../logic/aptidao'
import { t } from '../i18n'

/** Ações da lista do talhão: cada linha editável abre o que muda aquele dado. */
export type AcaoTalhao = 'redesenhar' | 'solo' | 'historico'

type Props = {
  pr: Priority
  onToggle: (k: keyof Priority) => void
  talhao: Talhao
  clima: EstadoClima
  onAcao: (a: AcaoTalhao) => void
  /** Volta ao mapa para escolher outro talhão ou desenhar um novo. */
  onTrocar: () => void
}

type Info = { label: string; value: string; dica?: string; acao?: { a: AcaoTalhao; dica: string } }

/** Chuva média do ano agrícola no ponto do talhão (soma dos decêndios da API; sem soma parcial). */
function chuvaAno(clima: EstadoClima): { value: string; dica?: string } {
  if (clima.status === 'carregando') return { value: '…' }
  const mm = chuvaDoAno(clima.dados?.decendios ?? null)
  if (mm === null || !clima.dados) return { value: t(SEM_DADO) }
  return { value: `${inteiro(mm)} mm`, dica: t('Média de {n} safras, NASA POWER', { n: clima.dados.safras.length }) }
}

const texturaApi = (k: SoilInfo['texture_class']) => ({ sandy: t('Arenoso'), medium: t('Médio'), clayey: t('Argiloso') })[k]

/** Sem textura informada, a API estima o solo pelo local: a lateral mostra a estimativa dela, marcada como tal. */
function solo(talhao: Talhao, api: SoilInfo | undefined): { value: string; dica?: string } {
  if (!talhao.textura && api?.source === 'SOILGRIDS_SAXTON_RAWLS_2006') {
    return {
      value: t('{textura} (estimado)', { textura: texturaApi(api.texture_class) }),
      dica: t('Estimado a partir do local (SoilGrids): {mm} mm de água por metro de raiz. Editar o solo do talhão', { mm: Math.round(api.available_water_mm_per_m) }),
    }
  }
  return { value: rotuloSolo(talhao) }
}

function infoDo(talhao: Talhao, clima: EstadoClima, api: SoilInfo | undefined): Info[] {
  const ultima = resumoSafra(registroMaisRecente(talhao.historico)?.registro)
  return [
    { label: talhao.nome, value: fmtHaCurto(talhao.areaHa), acao: { a: 'redesenhar', dica: t('Redesenhar o contorno do talhão') } },
    { label: t('Solo'), ...(() => { const s = solo(talhao, api); return { value: s.value, acao: { a: 'solo' as const, dica: s.dica ?? t('Editar o solo do talhão') } } })() },
    { label: t('Histórico'), value: ultima || t('Registrar'), acao: { a: 'historico', dica: t('Registrar as safras anteriores') } },
    // A umidade saiu daqui: a cena mostra a do decêndio simulado. A chuva do ano situa o talhão no regime de chuvas.
    { label: t('Chuva no ano'), ...chuvaAno(clima) },
    { label: t('Local'), value: talhao.local || fmtCoord(talhao.centro) },
  ]
}

// Mesmos nomes dos quadrantes do mapa de comparação (logic/aptidao)
const PRIORITIES = [
  { k: 'risco' as const, label: NOME_EIXO.risco, icon: 'i-shield' },
  { k: 'fat'   as const, label: NOME_EIXO.fat,   icon: 'm-coin'   },
  { k: 'solo'  as const, label: NOME_EIXO.solo,  icon: 'i-leaf'   },
  { k: 'prod'  as const, label: NOME_EIXO.prod,  icon: 'n-seed'   },
]

export function Sidebar({ pr, onToggle, talhao, clima, onAcao, onTrocar }: Props) {
  const conj = useConjunto()
  return (
    <aside className="side" aria-label={t('Ajustes')}>
      <div className="sec">
        <div className="sec-h">
          <h3>{t('Talhão')}</h3>
          <button className="sec-a" type="button" onClick={onTrocar}
            title={t('Trocar de talhão ou adicionar um novo')} aria-label={t('Trocar de talhão ou adicionar um novo')}>
            <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-swap" /></svg>
          </button>
        </div>
        <div className="list">
          {infoDo(talhao, clima, conj.solo).map(item => item.acao ? (
            <button
              key={item.label}
              type="button"
              className="item item-btn"
              title={item.acao.dica}
              aria-label={`${item.label}: ${item.value}. ${item.acao.dica}`}
              onClick={() => onAcao(item.acao!.a)}
            >
              <span>{item.label}</span>
              <span className="v">{item.value}<span className="chev" aria-hidden="true">›</span></span>
            </button>
          ) : (
            <div key={item.label} className="item" title={item.dica}>
              <span>{item.label}</span>
              <span className="v">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <h3>{t('O que importa')}</h3>
        <p className="prh">{t('A ordem das rotações segue o que você marcar. Faturamento é uma estimativa com médias nacionais (FAO), sem custos.')}</p>
        <div className="list">
          {PRIORITIES.map(({ k, label, icon }) => (
            <div key={k} className="item">
              <span className="pil">
                <svg className="ic" aria-hidden="true">
                  <use href={`/canvas-icons.svg#${icon}`} />
                </svg>
                {t(label)}
              </span>
              <button
                className="sw"
                type="button"
                role="switch"
                aria-checked={pr[k]}
                aria-label={t(label)}
                onClick={() => onToggle(k)}
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
