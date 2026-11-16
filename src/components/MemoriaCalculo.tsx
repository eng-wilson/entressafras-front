// "De onde vêm estes números" de uma safra: SÓ os valores que a API entregou, como vieram (mesmo quando o servidor
// marca MOCK). Nenhuma conta do front, nenhuma régua local, nenhum valor de reserva: o que a API não trouxe aparece
// como "não veio". Cada linha diz o campo de origem, para a conferência dos devs ("Valores calculados").
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './memoria.css'
import { NOME_FASE } from '../data/fases'
import { janelaLabel } from '../logic/periodo'
import { useConjunto } from '../state/conjunto'
import type { ResSafra } from '../logic/resiliencia'
import type { EstagioFao, RotationCrop } from '../types'
import { idioma, numero, ordinal, t } from '../i18n'

const ESTAGIOS: EstagioFao[] = ['initial', 'development', 'mid_season', 'late_season']
const ROMANO = ['I', 'II', 'III', 'IV'] as const
/** "I · estabelecimento" (no idioma atual: chamado na hora de exibir). */
const nomeEstagio = (e: EstagioFao) => {
  const i = ESTAGIOS.indexOf(e)
  return i < 0 ? e : `${ROMANO[i]} · ${t(NOME_FASE[i]).toLowerCase()}`
}
const TEXTURA = { sandy: 'arenoso', medium: 'médio', clayey: 'argiloso' } as const

const n1 = (v: number) => numero(v, { maximumFractionDigits: 1 })
const n2 = (v: number) => numero(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Data da API (AAAA-MM-DD): "dd/mm/aaaa" em português, "mm/dd/aaaa" em inglês. */
const dataBr = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return idioma() === 'en' && a && m && d ? `${m}/${d}/${a}` : iso.split('-').reverse().join('/')
}
const NAO_VEIO = 'não veio'

/** Os devs veem os campos ao abrir em desenvolvimento ou com ?dev na URL; o agricultor pode ligar no botão. */
const devPorPadrao = () => {
  try { return import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev') } catch { return false }
}

type Linha = { rotulo: string; valor: string; campo: string; bruto: unknown }

function Bloco({ titulo, origem, linhas, dev }: { titulo: string; origem: string; linhas: Linha[]; dev: boolean }) {
  return (
    <section className="mc-bloco">
      <h3>{titulo}</h3>
      {dev && <p className="mc-origem"><code>{origem}</code></p>}
      <table className="mc-campos">
        <tbody>
          {linhas.map(l => (
            <tr key={l.campo}>
              <th scope="row">{l.rotulo}</th>
              <td className={l.valor === t(NAO_VEIO) ? 'nv' : undefined}>{l.valor}</td>
              {dev && <td className="mc-campo"><code>{l.campo} = {JSON.stringify(l.bruto ?? null)}</code></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const L = (rotulo: string, campo: string, bruto: unknown, fmt: (v: never) => string): Linha => ({
  rotulo, campo, bruto, valor: bruto == null ? t(NAO_VEIO) : fmt(bruto as never),
})
const pctNum = (v: number) => `${n1(v)}%`
const pctFrac = (v: number) => `${n1(v * 100)}%`
const dias = (v: number) => t('{n} dias', { n: v })

type Props = {
  s: ResSafra
  n: 0 | 1
  rotacao: string
  /** Id da rotação na resposta (rotations[].id), para o caminho dos campos. */
  rotId: string
  /** A cultura como veio da API; ausente = conjunto local, sem dado da API. */
  api?: RotationCrop
  onFechar: () => void
}

export function MemoriaCalculo({ s, n, rotacao, rotId, api, onFechar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [dev, setDev] = useState(devPorPadrao)
  useEffect(() => {
    const el = dialogo.current!
    el.showModal()
    return () => el.close()
  }, [])
  const conj = useConjunto()
  const papel = n === 0 ? t('{ord} safra', { ord: ordinal(1) }) : s.cobertura ? t('{ord} safra (cobertura)', { ord: ordinal(2) }) : t('{ord} safra', { ord: ordinal(2) })
  const base = `rotations[id=${rotId}].crops[${n}]`
  const risk = api?.crop.risk
  const wr = api?.crop.water_requirements
  const mock = risk?.method === 'MOCK'

  return createPortal(
    <dialog className="culturas-dialog mc" ref={dialogo} aria-labelledby="mc-titulo" onClose={e => { if (!e.currentTarget.open) onFechar() }}>
      <header>
        <div>
          <h2 id="mc-titulo">{t('De onde vêm os números: {nome}', { nome: t(s.nome) })}</h2>
          <p className="mc-sub">{t('{papel} de {rotacao}', { papel, rotacao })} · {janelaLabel(s.de, s.ate)}</p>
        </div>
        <div className="mc-acoes">
          <label className="mc-dev">
            <input type="checkbox" checked={dev} onChange={e => setDev(e.target.checked)} /> {t('Valores calculados')}
          </label>
          <button className="tbtn" type="button" onClick={onFechar}>{t('Fechar')}</button>
        </div>
      </header>

      <p className="mc-mock">
        {t('Os valores calculados para o seu talhão, sem ajustes: o que falta fica em branco.')}
        {mock && <> <b>{t('Risco provisório')}</b>{t(': valores provisórios, não calculados para este talhão.')}</>}
        {' '}{t('Consumo de água, chuva e faturamento aparecem em outras partes da tela.')}
      </p>

      {!api ? (
        <p className="mc-res nd"><b>{t('Sem dados para esta safra.')}</b></p>
      ) : (
        <>
          <Bloco dev={dev} titulo={t('Risco hídrico')} origem={`POST /api/rotations/recommendations → ${base}.crop.risk`} linhas={[
            L(t('Método'), 'method', risk?.method, (v: string) => (v === 'MOCK' ? t('Provisório') : v)),
            L(t('Validado'), 'validated', risk?.validated, (v: boolean) => (v ? t('sim') : t('não'))),
            L(t('Risco hídrico'), 'risk_percentage', risk?.risk_percentage, pctNum),
            L(t('Limiar de perda de uma safra crítica'), 'loss_threshold_pct', risk?.loss_threshold_pct, pctNum),
            L(t('Perda média estimada'), 'estimated_yield_loss_pct', risk?.estimated_yield_loss_pct, pctNum),
            L(t('Safras históricas usadas'), 'valid_years', risk?.valid_years, (v: number) => String(v)),
            L(t('Fase de maior déficit'), 'critical_stage', risk?.critical_stage, (v: EstagioFao) => nomeEstagio(v)),
            ...ESTAGIOS.map(e => L(t('ISNA médio · fase {fase}', { fase: nomeEstagio(e) }), `mean_isna.${e}`, risk?.mean_isna?.[e], pctFrac)),
            L(t('ISNA do ciclo inteiro'), 'mean_season_isna', risk?.mean_season_isna, pctFrac),
          ]} />
          {dev && <p className="mc-nota">{t('ISNA = água que a cultura usou ÷ água de que precisava (0 a 1); exibido em %.')}</p>}

          <Bloco dev={dev} titulo={t('Datas e calendário')} origem={`POST /api/rotations/recommendations → ${base}`} linhas={[
            L(t('Plantio'), 'planting_date', api.planting_date, dataBr),
            L(t('Colheita'), 'harvest_date', api.harvest_date, dataBr),
            L(t('Fonte do calendário'), 'calendar.source', api.calendar?.source, (v: string) => v),
            L(t('Base do calendário'), 'calendar.data_source', api.calendar?.data_source, (v: string) => v),
            L(t('Plantio de referência'), 'calendar.reference_planting_date', api.calendar?.reference_planting_date, dataBr),
            L(t('Ciclo'), 'calendar.cycle_days', api.calendar?.cycle_days, dias),
          ]} />

          <Bloco dev={dev} titulo={t('Necessidade de água da cultura (FAO-56)')} origem={`POST /api/rotations/recommendations → ${base}.crop.water_requirements`} linhas={wr ? [
            L(t('Perfil'), 'profile_name', wr.profile_name, (v: string) => v),
            L(t('Kc inicial'), 'crop_coefficient.initial', wr.crop_coefficient?.initial, n2),
            L(t('Kc no meio do ciclo'), 'crop_coefficient.mid_season', wr.crop_coefficient?.mid_season, n2),
            L(t('Kc no fim'), 'crop_coefficient.late_season', wr.crop_coefficient?.late_season, n2),
            ...ESTAGIOS.map(e => L(t('Duração · fase {fase}', { fase: nomeEstagio(e) }), `stage_length_days.${e}`, wr.stage_length_days?.[e], dias)),
            L(t('Duração total'), 'stage_length_days.total', wr.stage_length_days?.total, dias),
            L(t('Raiz no plantio'), 'root_depth_m.initial', wr.root_depth_m?.initial, (v: number) => `${n2(v)} m`),
            L(t('Raiz máxima'), 'root_depth_m.max', wr.root_depth_m?.max, (v: number) => `${n2(v)} m`),
            ...[...ESTAGIOS, 'season' as const].map(e => L(
              e === 'season' ? t('Ky do ciclo') : t('Ky · fase {fase}', { fase: nomeEstagio(e) }), `yield_response_factor.${e}`, wr.yield_response_factor?.[e], n2)),
          ] : [L(t('Necessidade de água'), 'water_requirements', null, String)]} />

          <Bloco dev={dev} titulo={t('Solo usado no cálculo')} origem="POST /api/rotations/recommendations → soil" linhas={conj.solo ? [
            L(t('Origem'), 'source', conj.solo.source, (v: string) => (v === 'REQUEST_TEXTURE_CLASS' ? t('textura informada no cadastro') : v === 'SOILGRIDS_SAXTON_RAWLS_2006' ? t('estimado pelo local (SoilGrids + Saxton & Rawls)') : v)),
            L(t('Textura'), 'texture_class', conj.solo.texture_class, (v: keyof typeof TEXTURA) => (TEXTURA[v] ? t(TEXTURA[v]) : v)),
            L(t('Água disponível'), 'available_water_mm_per_m', conj.solo.available_water_mm_per_m, (v: number) => t('{v} mm por metro de raiz', { v: n1(v) })),
            L(t('Distância do ponto amostrado'), 'distance_km', conj.solo.distance_km, (v: number) => `${n1(v)} km`),
          ] : [L(t('Solo'), 'soil', null, String)]} />

          {conj.propriedadesSolo && (
            <Bloco dev={dev} titulo={t('Solo superficial (só exibição)')} origem="POST /api/rotations/recommendations → soil_properties" linhas={[
              L(t('Fonte'), 'source', conj.propriedadesSolo.source, (v: string) => v),
              L(t('Profundidade'), 'depth', conj.propriedadesSolo.depth, (v: string) => v),
              L(t('Argila'), 'clay_pct', conj.propriedadesSolo.clay_pct, pctNum),
              L(t('Areia'), 'sand_pct', conj.propriedadesSolo.sand_pct, pctNum),
              L(t('Silte'), 'silt_pct', conj.propriedadesSolo.silt_pct, pctNum),
              L(t('Carbono orgânico'), 'organic_carbon_g_per_kg', conj.propriedadesSolo.organic_carbon_g_per_kg, (v: number) => `${n1(v)} g/kg`),
              L(t('Distância do ponto amostrado'), 'distance_km', conj.propriedadesSolo.distance_km, (v: number) => `${n1(v)} km`),
            ]} />
          )}
        </>
      )}
    </dialog>,
    document.body,
  )
}
