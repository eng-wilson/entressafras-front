// "De onde vêm estes números" de uma safra: SÓ os valores que a API entregou, como vieram (mesmo quando o servidor
// marca MOCK). Nenhuma conta do front, nenhuma régua local, nenhum valor de reserva: o que a API não trouxe aparece
// como "não veio". Cada linha diz o campo de origem, para a conferência dos devs ("Campos da API").
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './memoria.css'
import { NOME_FASE } from '../data/zarc'
import { janelaLabel } from '../logic/periodo'
import { useConjunto } from '../state/conjunto'
import type { ResSafra } from '../logic/resiliencia'
import type { EstagioFao, RotationCrop } from '../types'

const ESTAGIOS: EstagioFao[] = ['initial', 'development', 'mid_season', 'late_season']
const ROMANO = ['I', 'II', 'III', 'IV'] as const
const NOME_ESTAGIO = Object.fromEntries(ESTAGIOS.map((e, i) => [e, `${ROMANO[i]} · ${NOME_FASE[i].toLowerCase()}`])) as Record<EstagioFao, string>
const TEXTURA = { sandy: 'arenoso', medium: 'médio', clayey: 'argiloso' } as const

const n1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const n2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dataBr = (iso: string) => iso.split('-').reverse().join('/')
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
              <td className={l.valor === NAO_VEIO ? 'nv' : undefined}>{l.valor}</td>
              {dev && <td className="mc-campo"><code>{l.campo} = {JSON.stringify(l.bruto ?? null)}</code></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const L = (rotulo: string, campo: string, bruto: unknown, fmt: (v: never) => string): Linha => ({
  rotulo, campo, bruto, valor: bruto == null ? NAO_VEIO : fmt(bruto as never),
})
const pctNum = (v: number) => `${n1.format(v)}%`
const pctFrac = (v: number) => `${n1.format(v * 100)}%`

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
  const papel = n === 0 ? '1ª safra' : s.cobertura ? '2ª safra (cobertura)' : '2ª safra'
  const base = `rotations[id=${rotId}].crops[${n}]`
  const risk = api?.crop.risk
  const wr = api?.crop.water_requirements
  const mock = risk?.method === 'MOCK'

  return createPortal(
    <dialog className="culturas-dialog mc" ref={dialogo} aria-labelledby="mc-titulo" onClose={e => { if (!e.currentTarget.open) onFechar() }}>
      <header>
        <div>
          <h2 id="mc-titulo">De onde vêm os números: {s.nome}</h2>
          <p className="mc-sub">{papel} de {rotacao} · {janelaLabel(s.de, s.ate)}</p>
        </div>
        <div className="mc-acoes">
          <label className="mc-dev">
            <input type="checkbox" checked={dev} onChange={e => setDev(e.target.checked)} /> Campos da API
          </label>
          <button className="tbtn" type="button" onClick={onFechar}>Fechar</button>
        </div>
      </header>

      <p className="mc-mock">
        Só valores recebidos da API Entressafras, como vieram: a tela não faz conta nem completa o que falta.
        {mock && <> <b>O servidor marca este risco como MOCK</b>: valores provisórios, não calculados para este talhão.</>}
        {' '}Consumo de água, chuva e receita não estão aqui porque não vêm prontos da API.
      </p>

      {!api ? (
        <p className="mc-res nd"><b>Sem dados da API para esta safra.</b></p>
      ) : (
        <>
          <Bloco dev={dev} titulo="Risco hídrico" origem={`POST /api/rotations/recommendations → ${base}.crop.risk`} linhas={[
            L('Método', 'method', risk?.method, (v: string) => (v === 'MOCK' ? 'MOCK (provisório)' : v)),
            L('Validado', 'validated', risk?.validated, (v: boolean) => (v ? 'sim' : 'não')),
            L('Risco hídrico', 'risk_percentage', risk?.risk_percentage, pctNum),
            L('Limiar de perda de uma safra crítica', 'loss_threshold_pct', risk?.loss_threshold_pct, pctNum),
            L('Perda média estimada', 'estimated_yield_loss_pct', risk?.estimated_yield_loss_pct, pctNum),
            L('Safras históricas usadas', 'valid_years', risk?.valid_years, (v: number) => String(v)),
            L('Fase de maior déficit', 'critical_stage', risk?.critical_stage, (v: EstagioFao) => NOME_ESTAGIO[v] ?? v),
            ...ESTAGIOS.map(e => L(`ISNA médio · fase ${NOME_ESTAGIO[e]}`, `mean_isna.${e}`, risk?.mean_isna?.[e], pctFrac)),
            L('ISNA do ciclo inteiro', 'mean_season_isna', risk?.mean_season_isna, pctFrac),
          ]} />
          {dev && <p className="mc-nota">ISNA = água que a cultura usou ÷ água de que precisava (0 a 1); exibido em %.</p>}

          <Bloco dev={dev} titulo="Datas e calendário" origem={`POST /api/rotations/recommendations → ${base}`} linhas={[
            L('Plantio', 'planting_date', api.planting_date, dataBr),
            L('Colheita', 'harvest_date', api.harvest_date, dataBr),
            L('Fonte do calendário', 'calendar.source', api.calendar?.source, (v: string) => v),
            L('Base do calendário', 'calendar.data_source', api.calendar?.data_source, (v: string) => v),
            L('Plantio de referência', 'calendar.reference_planting_date', api.calendar?.reference_planting_date, dataBr),
            L('Ciclo', 'calendar.cycle_days', api.calendar?.cycle_days, (v: number) => `${v} dias`),
          ]} />

          <Bloco dev={dev} titulo="Necessidade de água da cultura (FAO-56)" origem={`POST /api/rotations/recommendations → ${base}.crop.water_requirements`} linhas={wr ? [
            L('Perfil', 'profile_name', wr.profile_name, (v: string) => v),
            L('Kc inicial', 'crop_coefficient.initial', wr.crop_coefficient?.initial, (v: number) => n2.format(v)),
            L('Kc no meio do ciclo', 'crop_coefficient.mid_season', wr.crop_coefficient?.mid_season, (v: number) => n2.format(v)),
            L('Kc no fim', 'crop_coefficient.late_season', wr.crop_coefficient?.late_season, (v: number) => n2.format(v)),
            ...ESTAGIOS.map(e => L(`Duração · fase ${NOME_ESTAGIO[e]}`, `stage_length_days.${e}`, wr.stage_length_days?.[e], (v: number) => `${v} dias`)),
            L('Duração total', 'stage_length_days.total', wr.stage_length_days?.total, (v: number) => `${v} dias`),
            L('Raiz no plantio', 'root_depth_m.initial', wr.root_depth_m?.initial, (v: number) => `${n2.format(v)} m`),
            L('Raiz máxima', 'root_depth_m.max', wr.root_depth_m?.max, (v: number) => `${n2.format(v)} m`),
            ...[...ESTAGIOS, 'season' as const].map(e => L(
              e === 'season' ? 'Ky do ciclo' : `Ky · fase ${NOME_ESTAGIO[e]}`, `yield_response_factor.${e}`, wr.yield_response_factor?.[e], (v: number) => n2.format(v))),
          ] : [L('Necessidade de água', 'water_requirements', null, String)]} />

          <Bloco dev={dev} titulo="Solo usado no cálculo" origem="POST /api/rotations/recommendations → soil" linhas={conj.solo ? [
            L('Origem', 'source', conj.solo.source, (v: string) => (v === 'REQUEST_TEXTURE_CLASS' ? 'textura informada no cadastro' : v === 'SOILGRIDS_SAXTON_RAWLS_2006' ? 'estimado pelo local (SoilGrids + Saxton & Rawls)' : v)),
            L('Textura', 'texture_class', conj.solo.texture_class, (v: keyof typeof TEXTURA) => TEXTURA[v] ?? v),
            L('Água disponível', 'available_water_mm_per_m', conj.solo.available_water_mm_per_m, (v: number) => `${n1.format(v)} mm por metro de raiz`),
            L('Distância do ponto amostrado', 'distance_km', conj.solo.distance_km, (v: number) => `${n1.format(v)} km`),
          ] : [L('Solo', 'soil', null, String)]} />

          {conj.propriedadesSolo && (
            <Bloco dev={dev} titulo="Solo superficial (só exibição)" origem="POST /api/rotations/recommendations → soil_properties" linhas={[
              L('Fonte', 'source', conj.propriedadesSolo.source, (v: string) => v),
              L('Profundidade', 'depth', conj.propriedadesSolo.depth, (v: string) => v),
              L('Argila', 'clay_pct', conj.propriedadesSolo.clay_pct, pctNum),
              L('Areia', 'sand_pct', conj.propriedadesSolo.sand_pct, pctNum),
              L('Silte', 'silt_pct', conj.propriedadesSolo.silt_pct, pctNum),
              L('Carbono orgânico', 'organic_carbon_g_per_kg', conj.propriedadesSolo.organic_carbon_g_per_kg, (v: number) => `${n1.format(v)} g/kg`),
              L('Distância do ponto amostrado', 'distance_km', conj.propriedadesSolo.distance_km, (v: number) => `${n1.format(v)} km`),
            ]} />
          )}
        </>
      )}
    </dialog>,
    document.body,
  )
}
