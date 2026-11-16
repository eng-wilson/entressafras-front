import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CULTURAS, REFERENCIAS_CULTURAS } from '../data/culturas'
import { useCultura } from '../hooks/useCultura'
import { idioma, numero as numeroFmt, t } from '../i18n'
import type { FaixaCultura } from '../types'

const numero = (v: number | null) => v == null ? t('Sem dado') : numeroFmt(v, { maximumFractionDigits: 2 })
const faixa = (min: number | null, max: number | null, unidade: string) => t('{min} a {max} {unidade}', { min: numero(min), max: numero(max), unidade })
function Requisito({ nome, valor, unidade }: { nome: string; valor: FaixaCultura; unidade: string }) {
  return <div><dt>{nome}</dt><dd>{t('Preferencial: {faixa}', { faixa: faixa(valor.optimal_min, valor.optimal_max, unidade) })}<br />
    {t('Limites: {faixa}', { faixa: faixa(valor.absolute_min, valor.absolute_max, unidade) })}</dd></div>
}

const TRADUCOES: Record<string, string> = {
  heavy: 'Argilosa', medium: 'Média', light: 'Arenosa', organic: 'Orgânica', wide: 'Ampla',
  'medium (50-150 cm)': 'Média (50–150 cm)', 'shallow (20-50 cm)': 'Rasa (20–50 cm)',
  'deep (>>150 cm)': 'Profunda (>150 cm)', high: 'Alta', moderate: 'Moderada', low: 'Baixa',
  'well (dry spells)': 'Bem drenado', 'poorly (saturated >50% of year)': 'Mal drenado (saturado em mais de metade do ano)',
  'excessive (dry/moderately dry)': 'Drenagem excessiva', 'low (<4 dS/m)': 'Baixa (<4 dS/m)',
  'medium (4-10 dS/m)': 'Média (4–10 dS/m)',
}
// Em inglês, o valor do EcoCrop já vem no idioma: só a inicial maiúscula.
const opcao = (v: string) => idioma() === 'en' ? v.charAt(0).toUpperCase() + v.slice(1) : TRADUCOES[v] ?? v
const opcoes = (vs: string[]) => vs.length ? vs.map(opcao).join(', ') : t('Sem dado')

export function CatalogoCulturas({ inicial, onFechar }: { inicial: string; onFechar: () => void }) {
  const [selecionada, setSelecionada] = useState(inicial)
  const cultura = useCultura(selecionada)
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialogo.current!
    el.showModal()
    return () => el.close()
  }, [])
  const dados = cultura.dados
  return createPortal(
    <dialog className="culturas-dialog" ref={dialogo} aria-labelledby="culturas-titulo" onClose={e => { if (!e.currentTarget.open) onFechar() }}>
      <header><h2 id="culturas-titulo">{t('Dados das culturas')}</h2><button className="tbtn" type="button" onClick={onFechar}>{t('Fechar')}</button></header>
      <label className="culturas-seletor">{t('Cultura')}
        <select value={selecionada} onChange={e => setSelecionada(e.target.value)}>
          {Object.values(CULTURAS).map(c => <option key={c.id} value={c.id}>{t(c.nome)}</option>)}
        </select>
      </label>
      {cultura.status === 'carregando' && <p role="status">{t('Carregando requisitos da cultura…')}</p>}
      {cultura.status === 'erro' && <div role="alert"><p>{t('Os requisitos da cultura não carregaram.')}</p><button className="link" type="button" onClick={cultura.recarregar}>{t('Tentar de novo')}</button></div>}
      {cultura.status === 'sem_referencia' && <p role="status">{t('Sem referência para esta cultura no catálogo.')}</p>}
      {dados && <>
        <p><strong>{dados.scientific_name}</strong> · EcoCrop {dados.eco_port_code}</p>
        {REFERENCIAS_CULTURAS[selecionada]?.cultivar && <p>{t('Referência geral da espécie. O catálogo não diferencia esta cultivar.')}</p>}
        <dl className="culturas-requisitos">
          <Requisito nome={t('Temperatura')} valor={dados.temperature} unidade="°C" />
          <Requisito nome={t('Chuva anual')} valor={dados.rainfall} unidade={t('mm/ano')} />
          <Requisito nome={t('pH do solo')} valor={dados.soil_ph} unidade="" />
          <div><dt>{t('Ciclo')}</dt><dd>{faixa(dados.crop_cycle.min_days, dados.crop_cycle.max_days, t('dias'))}</dd></div>
          {([['texture', t('Textura do solo')], ['depth', t('Profundidade')], ['fertility', t('Fertilidade')],
            ['drainage', t('Drenagem')], ['salinity', t('Salinidade')], ['al_toxicity', t('Toxicidade de alumínio')]] as const).map(([chave, nome]) =>
            <div key={chave}><dt>{nome}</dt><dd>{t('Preferencial: {faixa}', { faixa: opcoes(dados.soil[chave].optimal) })}<br />{t('Limites: {faixa}', { faixa: opcoes(dados.soil[chave].absolute) })}</dd></div>)}
          <div><dt>{t('Limite letal no início do crescimento')}</dt><dd>{dados.temperature.killing_early_growth == null ? t('Sem dado') : `${numero(dados.temperature.killing_early_growth)} °C`}</dd></div>
          <div><dt>{t('Limite letal no repouso')}</dt><dd>{dados.temperature.killing_rest == null ? t('Sem dado') : `${numero(dados.temperature.killing_rest)} °C`}</dd></div>
          {(() => {
            const w = dados.water_requirements
            if (!w) return <div><dt>{t('Estágios e raízes (FAO-56)')}</dt><dd>{t('Sem perfil hídrico no catálogo')}</dd></div>
            const d = w.stage_length_days
            return <>
              <div><dt>{t('Estágios (FAO-56)')}</dt><dd>{t('Inicial {ini} · desenvolvimento {des} · meio {meio} · fim {fim} dias (total {total})', { ini: d.initial, des: d.development, meio: d.mid_season, fim: d.late_season, total: d.total })}</dd></div>
              <div><dt>{t('Profundidade das raízes')}</dt><dd>{t('{ini} m no plantio, até {max} m', { ini: numero(w.root_depth_m.initial), max: numero(w.root_depth_m.max) })}</dd></div>
              <div><dt>{t('Coeficiente de cultura (Kc)')}</dt><dd>{t('{ini} no início · {meio} no meio · {fim} no fim', { ini: numero(w.crop_coefficient.initial), meio: numero(w.crop_coefficient.mid_season), fim: numero(w.crop_coefficient.late_season) })}</dd></div>
            </>
          })()}
        </dl>
        <p className="culturas-nota">{t('Fonte: catálogo EcoCrop e perfis FAO-56 (CropWat). Requisitos gerais da espécie, não calibrados por região; a chuva anual não equivale ao consumo de água por ciclo. Ciclos e rotações da simulação permanecem ilustrativos.')}</p>
      </>}
    </dialog>, document.body,
  )
}
