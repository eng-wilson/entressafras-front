import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CULTURAS, REFERENCIAS_CULTURAS } from '../data/culturas'
import { useCultura } from '../hooks/useCultura'
import type { FaixaCultura } from '../types'

const numero = (v: number | null) => v == null ? 'Sem dado' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)
const faixa = (min: number | null, max: number | null, unidade: string) => `${numero(min)} a ${numero(max)} ${unidade}`
function Requisito({ nome, valor, unidade }: { nome: string; valor: FaixaCultura; unidade: string }) {
  return <div><dt>{nome}</dt><dd>Preferencial: {faixa(valor.optimal_min, valor.optimal_max, unidade)}<br />
    Limites: {faixa(valor.absolute_min, valor.absolute_max, unidade)}</dd></div>
}

const TRADUCOES: Record<string, string> = {
  heavy: 'Argilosa', medium: 'Média', light: 'Arenosa', organic: 'Orgânica', wide: 'Ampla',
  'medium (50-150 cm)': 'Média (50–150 cm)', 'shallow (20-50 cm)': 'Rasa (20–50 cm)',
  'deep (>>150 cm)': 'Profunda (>150 cm)', high: 'Alta', moderate: 'Moderada', low: 'Baixa',
  'well (dry spells)': 'Bem drenado', 'poorly (saturated >50% of year)': 'Mal drenado (saturado em mais de metade do ano)',
  'excessive (dry/moderately dry)': 'Drenagem excessiva', 'low (<4 dS/m)': 'Baixa (<4 dS/m)',
  'medium (4-10 dS/m)': 'Média (4–10 dS/m)',
}
const opcoes = (vs: string[]) => vs.length ? vs.map(v => TRADUCOES[v] ?? v).join(', ') : 'Sem dado'

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
      <header><h2 id="culturas-titulo">Dados das culturas</h2><button className="tbtn" type="button" onClick={onFechar}>Fechar</button></header>
      <label className="culturas-seletor">Cultura
        <select value={selecionada} onChange={e => setSelecionada(e.target.value)}>
          {Object.values(CULTURAS).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      {cultura.status === 'carregando' && <p role="status">Carregando requisitos da cultura…</p>}
      {cultura.status === 'erro' && <div role="alert"><p>Os requisitos da cultura não carregaram.</p><button className="link" type="button" onClick={cultura.recarregar}>Tentar de novo</button></div>}
      {cultura.status === 'sem_referencia' && <p role="status">Sem referência para esta cultura no catálogo.</p>}
      {dados && <>
        <p><strong>{dados.scientific_name}</strong> · EcoCrop {dados.eco_port_code}</p>
        {REFERENCIAS_CULTURAS[selecionada]?.cultivar && <p>Referência geral da espécie. O catálogo não diferencia esta cultivar.</p>}
        <dl className="culturas-requisitos">
          <Requisito nome="Temperatura" valor={dados.temperature} unidade="°C" />
          <Requisito nome="Chuva anual" valor={dados.rainfall} unidade="mm/ano" />
          <Requisito nome="pH do solo" valor={dados.soil_ph} unidade="" />
          <div><dt>Ciclo</dt><dd>{faixa(dados.crop_cycle.min_days, dados.crop_cycle.max_days, 'dias')}</dd></div>
          {([['texture', 'Textura do solo'], ['depth', 'Profundidade'], ['fertility', 'Fertilidade'],
            ['drainage', 'Drenagem'], ['salinity', 'Salinidade'], ['al_toxicity', 'Toxicidade de alumínio']] as const).map(([chave, nome]) =>
            <div key={chave}><dt>{nome}</dt><dd>Preferencial: {opcoes(dados.soil[chave].optimal)}<br />Limites: {opcoes(dados.soil[chave].absolute)}</dd></div>)}
          <div><dt>Limite letal no início do crescimento</dt><dd>{dados.temperature.killing_early_growth == null ? 'Sem dado' : `${numero(dados.temperature.killing_early_growth)} °C`}</dd></div>
          <div><dt>Limite letal no repouso</dt><dd>{dados.temperature.killing_rest == null ? 'Sem dado' : `${numero(dados.temperature.killing_rest)} °C`}</dd></div>
        </dl>
        <p className="culturas-nota">Fonte: catálogo EcoCrop, via API Entressafras. Requisitos gerais da espécie; a chuva anual não equivale ao consumo de água por ciclo. Ciclos e rotações da simulação permanecem ilustrativos.</p>
      </>}
    </dialog>, document.body,
  )
}
