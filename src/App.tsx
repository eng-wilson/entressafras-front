import { useClimaDecendios } from './hooks/useClimaDecendios'
import { AvisoClima } from './components/AvisoClima'
import { useEffect, useMemo, useState } from 'react'
import type { AppState, DadosTalhao, EstadoTalhoes, Historico, Talhao } from './types'
import { Sidebar, type AcaoTalhao } from './components/Sidebar'
import { SoloModal } from './components/SoloModal'
import { HistoricoModal } from './components/HistoricoModal'
import { Simulation } from './components/Simulation'
import { Rotations } from './components/Rotations'
import { Inspector } from './components/Inspector'
import { Onboarding, type ModoOnboarding } from './onboarding/Onboarding'
import { carregar, salvar } from './services/storage'
import { reverso } from './services/geocoding'
import { classeDaTextura } from './logic/solo'
import type { ConjuntoRotacoes } from './data/mock'
import { useRotacoes } from './hooks/useRotacoes'
import { conjuntoDaApi, historicoEcoCrop, prioridadesApi } from './logic/rotacoesApi'
import { soloDaTextura } from './services/rotacoes'
import { ConjuntoContext } from './state/conjunto'
import { useCultura } from './hooks/useCultura'
import { CatalogoCulturas } from './components/CatalogoCulturas'
import { resiliencia } from './logic/resiliencia'
import { diagnostico, periodoDecisivo } from './logic/diagnostico'
import { estagioEm, estagios } from './logic/estagios'

const DEFAULT: AppState = {
  idx: 10,
  mode: 'cal',
  pr: { risco: true, agua: false, solo: true, prod: false },
  rot: 0,
}

/** Antes da API responder: nenhuma rotação (a tela mostra o carregamento, sem mock no lugar). */
const conjVazio: ConjuntoRotacoes = { origem: 'api', ano: new Date().getFullYear(), rotacoes: [], avisos: [] }

/** Rotação inicial: a que o agricultor já faz (se veio na recomendação), senão a 1ª da API. */
const inicial = (c: ConjuntoRotacoes) => Math.max(0, c.rotacoes.findIndex(r => r.ct.atual))

const novoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now()}`)
const mesmoContorno = (a: Talhao['contorno'], b: Talhao['contorno']) => JSON.stringify(a) === JSON.stringify(b)

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT)
  const [campos, setCampos] = useState<EstadoTalhoes>(carregar)
  const [edicao, setEdicao] = useState<Exclude<ModoOnboarding, 'novo'> | null>(null)
  const [verCulturas, setVerCulturas] = useState(false)
  // Folha aberta sobre a tela principal (solo ou histórico), sem voltar ao onboarding.
  const [folha, setFolha] = useState<'solo' | 'historico' | null>(null)
  // Rotações marcadas no modo Comparação (posições no conjunto): começa com a atual (ou a 1ª) e mais uma
  const [cmpSel, setCmpSel] = useState<number[]>([0, 1])
  const toggleCmp = (i: number) =>
    setCmpSel(s => (s.includes(i) ? (s.length > 1 ? s.filter(x => x !== i) : s) : [...s, i].sort()))
  const setIdx  = (idx: number) => setState(s => ({ ...s, idx }))
  const setMode = (mode: 'cal'|'cmp') => setState(s => ({ ...s, mode }))
  const togglePr = (k: keyof AppState['pr']) =>
    setState(s => ({ ...s, pr: { ...s.pr, [k]: !s.pr[k] } }))

  const talhao = campos.talhoes.find(t => t.id === campos.ativo) ?? null

  const clima = useClimaDecendios(talhao?.centro ?? null)
  const textura = talhao?.textura ?? null
  const historico = talhao?.historico ?? null
  // Textura só vai à API quando o agricultor a informou; sem ela, a API estima o solo pelo local (SoilGrids).
  const recomendadas = useRotacoes({
    ponto: talhao?.centro ?? null,
    solo: talhao?.texturaInformada === false ? null : soloDaTextura(textura),
    historico: historicoEcoCrop(historico),
    prioridades: prioridadesApi(state.pr),
  })
  // Trocando só as prioridades, a resposta anterior segue na tela até a nova ordem chegar.
  const resposta = recomendadas.dados ?? recomendadas.anterior
  const conj = useMemo(
    () => (resposta ? conjuntoDaApi(resposta, historico) : null),
    [resposta, historico],
  )
  // Conjunto novo: a seleção e as marcadas da comparação acompanham as mesmas rotações (pelo id) quando a API só
  // reordenou; rotação que sumiu volta à inicial (a atual do agricultor ou a 1ª).
  const [conjVisto, setConjVisto] = useState<ConjuntoRotacoes | null>(null)
  if (conj !== conjVisto) {
    setConjVisto(conj)
    if (conj) {
      const ids = conj.rotacoes.map(r => r.id)
      const idDe = (i: number) => conjVisto?.rotacoes[i]?.id
      const sel = ids.indexOf(idDe(state.rot) ?? '')
      const i = sel >= 0 ? sel : inicial(conj)
      setState(s => ({ ...s, rot: i }))
      const marcadas = cmpSel.map(idDe).map(id => ids.indexOf(id ?? '')).filter(x => x >= 0)
      setCmpSel(marcadas.length ? [...new Set(marcadas)].sort()
        : conj.rotacoes.length > 1 ? [...new Set([i, i === 0 ? 1 : 0])].sort() : [0])
    }
  }
  const rotOk = !!conj && state.rot < conj.rotacoes.length
  const fases = useMemo(() => (conj && rotOk ? estagios(conj.rotacoes[state.rot].safras) : null), [conj, rotOk, state.rot])
  const culturaAtual = fases ? estagioEm(fases, state.idx).ref ?? null : null
  const cultura = useCultura(talhao ? culturaAtual : null)
  const res = useMemo(
    () => (conj ? resiliencia(clima.dados, textura, conj.rotacoes.map(r => r.safras)) : null),
    [clima.dados, textura, conj],
  )
  const diags = useMemo(() => res?.rotacoes.map(diagnostico) ?? null, [res])
  // Selecionar uma rotação já leva a simulação ao período que mais pesa no selo dela; `idx` explícito = clique numa marca.
  const selecionar = (rot: number, idx?: number) =>
    setState(s => ({ ...s, rot, idx: idx ?? periodoDecisivo(diags?.[rot] ?? null) ?? s.idx }))
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

  /** Atualiza o talhão ativo; contorno novo pede outra consulta do nome da cidade. */
  function atualizar(d: DadosTalhao) {
    if (!talhao) return
    const atualizado: Talhao = {
      ...talhao, ...d,
      classe: classeDaTextura(d.textura),
      local: mesmoContorno(talhao.contorno, d.contorno) ? talhao.local : undefined,
    }
    setCampos(c => ({ ...c, talhoes: c.talhoes.map(t => (t.id === talhao.id ? atualizado : t)) }))
  }
  const salvarHistorico = (historico: Historico | null) => {
    if (talhao) setCampos(c => ({ ...c, talhoes: c.talhoes.map(t => (t.id === talhao.id ? { ...t, historico } : t)) }))
  }
  function acao(a: AcaoTalhao) {
    if (a === 'redesenhar') setEdicao('redesenhar')
    else setFolha(a)
  }
  function escolher(id: string) {
    setCampos(c => ({ ...c, ativo: id }))
    setEdicao(null)
  }

  function concluir(d: DadosTalhao) {
    // Na escolha de talhões, concluir o desenho cria um talhão novo.
    if (talhao && edicao && edicao !== 'talhoes') {
      atualizar(d)
      setEdicao(null)
      return
    }
    const novo: Talhao = { ...d, id: novoId(), classe: classeDaTextura(d.textura) }
    setCampos(c => ({ talhoes: [...c.talhoes, novo], ativo: novo.id }))
    setEdicao(null)
  }

  if (!talhao || edicao) {
    return (
      <Onboarding
        key={edicao ?? 'novo'}
        modo={talhao ? edicao ?? 'novo' : 'novo'}
        talhao={talhao}
        onConcluir={concluir}
        onCancelar={talhao ? () => setEdicao(null) : undefined}
        talhoes={campos.talhoes}
        onEscolher={escolher}
      />
    )
  }

  const pronto = conj && rotOk && fases && conj.rotacoes.length > 0
  return (
    <ConjuntoContext.Provider value={conj ?? conjVazio}>
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
      <Sidebar pr={state.pr} onToggle={togglePr} talhao={talhao} clima={clima} onAcao={acao} onTrocar={() => setEdicao('talhoes')} />
      <main className="main">
        {clima.status === 'erro' && <AvisoClima onRecarregar={clima.recarregar} />}
        {cultura.status === 'erro' && <div className="aviso" role="alert">Os requisitos da cultura não carregaram. <button className="link" type="button" onClick={cultura.recarregar}>Tentar de novo</button></div>}
        {recomendadas.status === 'erro' && (
          <div className="aviso" role="alert">
            As rotações recomendadas não carregaram.
            <button className="link" type="button" onClick={recomendadas.recarregar}>Tentar de novo</button>
          </div>
        )}
        {recomendadas.status === 'carregando' && (
          <p className="aviso" role="status">
            {recomendadas.anterior ? 'Reordenando as rotações pelas prioridades marcadas…' : 'Buscando as rotações recomendadas para o talhão… pode levar até um minuto.'}
          </p>
        )}
        {conj && conj.rotacoes.length === 0 && <p className="aviso" role="status">Nenhuma rotação recomendada para este talhão.</p>}
        {pronto && <>
        <Simulation idx={state.idx} rot={state.rot} talhao={talhao} fases={fases} diag={diags?.[state.rot] ?? null} clima={clima} cultura={cultura} cmp={state.mode === 'cmp' ? { sel: cmpSel, pr: state.pr, res } : null} />
        <Rotations
          idx={state.idx} mode={state.mode} sel={cmpSel} onToggleSel={toggleCmp} res={res}
          rot={state.rot} onRot={selecionar} diags={diags}
          onIdx={setIdx} onMode={setMode} decendios={clima.dados?.decendios ?? null}
        />
        </>}
      </main>
      {pronto && <Inspector rotIdx={state.rot} diag={diags?.[state.rot] ?? null} clima={clima.dados} res={res} onVerDados={() => setVerCulturas(true)} />}
      {folha === 'solo' && (
        <SoloModal talhao={talhao} onCancelar={() => setFolha(null)}
          onSalvar={d => { atualizar(d); setFolha(null) }}
          onMudarLocal={() => { setFolha(null); setEdicao('redesenhar') }} />
      )}
      {folha === 'historico' && (
        <HistoricoModal talhao={talhao} onCancelar={() => setFolha(null)}
          onSalvar={h => { salvarHistorico(h); setFolha(null) }} />
      )}
      {verCulturas && <CatalogoCulturas inicial={culturaAtual ?? 'soja'} onFechar={() => setVerCulturas(false)} />}
    </div>
    </ConjuntoContext.Provider>
  )
}
