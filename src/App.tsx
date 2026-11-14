import { useClimaDecendios } from './hooks/useClimaDecendios'
import { AvisoClima } from './components/AvisoClima'
import { useEffect, useState } from 'react'
import type { AppState, DadosTalhao, EstadoTalhoes, Talhao } from './types'
import { Sidebar } from './components/Sidebar'
import { Simulation } from './components/Simulation'
import { Rotations } from './components/Rotations'
import { Inspector } from './components/Inspector'
import { Onboarding, type ModoOnboarding } from './onboarding/Onboarding'
import { carregar, salvar } from './services/storage'
import { reverso } from './services/geocoding'
import { classeDaTextura } from './logic/solo'
import { STAGES } from './data/mock'
import { useCultura } from './hooks/useCultura'
import { CatalogoCulturas } from './components/CatalogoCulturas'

const DEFAULT: AppState = {
  idx: 10,
  mode: 'cal',
  pr: { risco: true, agua: false, solo: true, prod: false },
}

const novoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now()}`)
const mesmoContorno = (a: Talhao['contorno'], b: Talhao['contorno']) => JSON.stringify(a) === JSON.stringify(b)

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT)
  const [campos, setCampos] = useState<EstadoTalhoes>(carregar)
  const [edicao, setEdicao] = useState<Exclude<ModoOnboarding, 'novo'> | null>(null)
  const [verCulturas, setVerCulturas] = useState(false)
  const setIdx  = (idx: number) => setState(s => ({ ...s, idx }))
  const setMode = (mode: 'cal'|'cmp') => setState(s => ({ ...s, mode }))
  const togglePr = (k: keyof AppState['pr']) =>
    setState(s => ({ ...s, pr: { ...s.pr, [k]: !s.pr[k] } }))

  const talhao = campos.talhoes.find(t => t.id === campos.ativo) ?? null

  const clima = useClimaDecendios(talhao?.centro ?? null)
  const culturaAtual = STAGES.find(s => state.idx >= s.from && state.idx <= s.to)?.crop ?? null
  const cultura = useCultura(talhao ? culturaAtual : null)
  useEffect(() => { salvar(campos) }, [campos])

  // Nome da cidade do talhão: uma consulta quando o contorno é novo ou mudou.
  const pendente = talhao && talhao.local === undefined ? talhao : null
  const pId = pendente?.id, pLat = pendente?.centro.lat, pLon = pendente?.centro.lon
  useEffect(() => {
    if (!pId || pLat === undefined || pLon === undefined) return
    let vivo = true
    reverso({ lat: pLat, lon: pLon }).then(local => {
      if (!vivo) return
      setCampos(c => ({
        ...c,
        // '' marca "já consultado, sem nome": a Sidebar mostra as coordenadas e não tenta de novo.
        talhoes: c.talhoes.map(t => (t.id === pId ? { ...t, local: local ?? '' } : t)),
      }))
    })
    return () => { vivo = false }
  }, [pId, pLat, pLon])

  function concluir(d: DadosTalhao) {
    if (talhao && edicao) {
      const atualizado: Talhao = {
        ...talhao, ...d,
        classe: classeDaTextura(d.textura),
        local: mesmoContorno(talhao.contorno, d.contorno) ? talhao.local : undefined,
      }
      setCampos(c => ({ ...c, talhoes: c.talhoes.map(t => (t.id === talhao.id ? atualizado : t)) }))
      setEdicao(null)
      return
    }
    const novo: Talhao = { ...d, id: novoId(), classe: classeDaTextura(d.textura) }
    setCampos(c => ({ talhoes: [...c.talhoes, novo], ativo: novo.id }))
  }

  if (!talhao || edicao) {
    return (
      <Onboarding
        key={edicao ?? 'novo'}
        modo={talhao ? edicao ?? 'novo' : 'novo'}
        talhao={talhao}
        onConcluir={concluir}
        onCancelar={talhao ? () => setEdicao(null) : undefined}
      />
    )
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="app-name">Field Shift</div>
        <button className="tbtn" type="button">
          <svg className="ic" aria-hidden="true">
            <use href="/canvas-icons.svg#i-info" />
          </svg>
          Como funciona
        </button>
      </header>
      <Sidebar pr={state.pr} onToggle={togglePr} talhao={talhao} onEditar={setEdicao} />
      <main className="main">
        {clima.status === 'erro' && <AvisoClima onRecarregar={clima.recarregar} />}
        {cultura.status === 'erro' && <div className="aviso" role="alert">Os requisitos da cultura não carregaram. <button className="link" type="button" onClick={cultura.recarregar}>Tentar de novo</button></div>}
        <Simulation idx={state.idx} clima={clima} cultura={cultura} />
        <Rotations
          idx={state.idx} mode={state.mode} pr={state.pr}
          onIdx={setIdx} onMode={setMode} decendios={clima.dados?.decendios ?? null}
        />
      </main>
      <Inspector idx={state.idx} pr={state.pr} clima={clima.dados} onVerDados={() => setVerCulturas(true)} />
      {verCulturas && <CatalogoCulturas inicial={culturaAtual ?? 'soja'} onFechar={() => setVerCulturas(false)} />}
    </div>
  )
}
