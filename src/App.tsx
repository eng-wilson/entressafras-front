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
import { conjuntoDaApi } from './logic/rotacoesApi'
import { ConjuntoContext } from './state/conjunto'
import { useCultura } from './hooks/useCultura'
import { CatalogoCulturas } from './components/CatalogoCulturas'
import { resiliencia } from './logic/resiliencia'
import { diagnostico, periodoDecisivo } from './logic/diagnostico'
import { estagioEm, estagios } from './logic/estagios'
import { comDatas, diasEntre, faixaDoSweep, type Rascunho } from './logic/rascunho'
import { soloDaTextura } from './services/rotacoes'
import { guardarSalva, lerSalvas, MAX_SALVAS, proximoAnoAgricola, removerSalva, type RotacaoSalva } from './services/rotacoesSalvas'
import { useRascunho } from './hooks/useRascunho'
import { useCulturasSimulaveis } from './hooks/useCulturasSimulaveis'
import { DraftRow } from './components/rascunho/DraftRow'
import { DraftInspector } from './components/rascunho/DraftInspector'
import type { RotationRecommendations } from './types'

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

/**
 * Rascunho inicial a partir de uma rotação da lista (a atual do talhão, senão a selecionada): mesmas culturas e
 * plantios. Nas recomendadas a colheita vai sem data para a API devolver o ciclo de referência (limites do arrasto).
 */
function rascunhoDe(rot: ConjuntoRotacoes['rotacoes'][number], dados: RotationRecommendations, salvas: RotacaoSalva[], ano: number): Rascunho {
  const api = rot.salva
    ? dados.custom_rotations?.[salvas.findIndex(s => s.id === rot.salva!.id)]
    : dados.rotations.find(r => r.id === rot.id)
  if (!api) return { culturas: [], sel: null }
  return {
    // Datas exatas da API: soltar a cultura num decêndio colorido gera o mesmo pedido do ponto do sweep.
    culturas: api.crops.map(c => comDatas(
      { code: c.crop.eco_port_code, s: 0, e: 1, refCiclo: null, colheitaLivre: !rot.salva },
      c.planting_date, diasEntre(c.planting_date, c.harvest_date) + 1, ano,
    )),
    sel: 1,
  }
}

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
  // Rotações salvas pelo agricultor neste talhão: vão em custom_rotations e voltam ranqueadas pela API.
  const anoAgricola = proximoAnoAgricola()
  const [versaoSalvas, setVersaoSalvas] = useState(0)
  const talhaoId = talhao?.id ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const salvas = useMemo(() => (talhaoId ? lerSalvas(talhaoId, anoAgricola) : []), [talhaoId, anoAgricola, versaoSalvas])
  const pedidoSalvas = useMemo(
    () => (salvas.length ? { ano: anoAgricola, custom: salvas.map(s => s.culturas) } : null),
    [salvas, anoAgricola],
  )
  const recomendadas = useRotacoes(talhao?.centro ?? null, textura, pedidoSalvas)
  const historico = talhao?.historico ?? null
  const conjNovo = useMemo(
    () => (recomendadas.dados ? conjuntoDaApi(recomendadas.dados, historico, salvas.map(s => ({ id: s.id, em: s.em }))) : null),
    [recomendadas.dados, historico, salvas],
  )
  // Ao salvar ou remover uma rotação, a lista é pedida de novo: a anterior fica na tela até a nova chegar.
  const [ultimo, setUltimo] = useState<{ talhao: string | null; conj: ConjuntoRotacoes; dados: RotationRecommendations } | null>(null)
  if (conjNovo && ultimo?.conj !== conjNovo && recomendadas.dados) setUltimo({ talhao: talhaoId, conj: conjNovo, dados: recomendadas.dados })
  const atualizando = !conjNovo && recomendadas.status === 'carregando' && !!ultimo && ultimo.talhao === talhaoId
  const conj = conjNovo ?? (atualizando ? ultimo!.conj : null)
  const dadosRec = recomendadas.dados ?? (atualizando ? ultimo!.dados : null)
  // Depois de salvar: selecionar a rotação nova quando ela voltar da API, e anunciar a posição.
  const [salvaPendente, setSalvaPendente] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  // Conjunto novo (outro talhão ou solo): volta à rotação inicial e às marcadas da comparação.
  const [conjVisto, setConjVisto] = useState<ConjuntoRotacoes | null>(null)
  if (conj !== conjVisto) {
    setConjVisto(conj)
    if (conj) {
      const nova = salvaPendente ? conj.rotacoes.findIndex(r => r.salva?.id === salvaPendente) : -1
      const i = nova >= 0 ? nova : inicial(conj)
      if (nova >= 0) {
        setSalvaPendente(null)
        setAnuncio(`Rotação salva. Ficou em ${nova + 1}º de ${conj.rotacoes.length}.`)
      }
      setState(s => ({ ...s, rot: i }))
      setCmpSel(conj.rotacoes.length > 1 ? [...new Set([i, i === 0 ? 1 : 0])].sort() : [0])
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

  // Editor "Nova rotação": rascunho simulado pela API (POST /api/rotations/simulate).
  const editor = useRascunho(talhao?.centro ?? null, soloDaTextura(textura), conj?.ano ?? anoAgricola)
  const catalogo = useCulturasSimulaveis(editor.aberto)
  const faixa = useMemo(
    // Alça arrastada muda o ciclo: a faixa (que supõe o ciclo atual) some até o sweep novo chegar.
    () => (editor.aberto && editor.rascunho.sel != null && !editor.alca ? faixaDoSweep(editor.sim.sweeps[editor.rascunho.sel] ?? null, editor.rascunho.sel) : null),
    [editor.aberto, editor.rascunho.sel, editor.alca, editor.sim.sweeps],
  )
  const addBloqueio = salvas.length >= MAX_SALVAS ? `Você já tem ${MAX_SALVAS} rotações salvas. Remova uma para criar outra.` : null
  function abrirRascunho() {
    if (editor.aberto) {
      document.querySelector<HTMLElement>('.row.draft .nm')?.focus()
      return
    }
    if (!conj || !dadosRec) return
    const base = conj.rotacoes.find(r => r.ct.atual) ?? conj.rotacoes[state.rot]
    editor.abrir(base ? rascunhoDe(base, dadosRec, salvas, conj.ano) : undefined)
    setMode('cal')
    setAnuncio('')
  }
  const enviado = editor.sim.enviado
  const datasCompletas = !!enviado && enviado.every(c => c.planting_date && c.harvest_date)
  function salvarRascunho() {
    if (!talhao || !conj || editor.sim.status !== 'ok' || !enviado || !datasCompletas) return
    const culturas = enviado.map(c => ({ code: c.code, planting_date: c.planting_date!, harvest_date: c.harvest_date! })) as RotacaoSalva['culturas']
    const salva = guardarSalva(talhao.id, conj.ano, culturas)
    if (!salva) { setAnuncio(addBloqueio ?? 'Não foi possível salvar a rotação.'); return }
    setSalvaPendente(salva.id)
    setAnuncio('Rotação salva. Atualizando o ranking…')
    editor.fechar()
    setVersaoSalvas(v => v + 1)
  }
  function removerRotacaoSalva(id: string) {
    if (!talhao) return
    removerSalva(talhao.id, id)
    setVersaoSalvas(v => v + 1)
    setAnuncio('Rotação removida.')
  }

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
        {recomendadas.status === 'erro' && !atualizando && (
          <div className="aviso" role="alert">
            As rotações recomendadas não carregaram.
            <button className="link" type="button" onClick={recomendadas.recarregar}>Tentar de novo</button>
          </div>
        )}
        {recomendadas.status === 'carregando' && !atualizando && <p className="aviso" role="status">Buscando as rotações recomendadas para o talhão…</p>}
        {atualizando && <p className="aviso" role="status">Atualizando o ranking com as suas rotações…</p>}
        {conj && conj.rotacoes.length === 0 && <p className="aviso" role="status">Nenhuma rotação recomendada para este talhão.</p>}
        {pronto && <>
        <Simulation idx={state.idx} rot={state.rot} talhao={talhao} fases={fases} diag={diags?.[state.rot] ?? null} clima={clima} cultura={cultura} cmp={state.mode === 'cmp' ? { sel: cmpSel, pr: state.pr, res } : null} />
        <Rotations
          idx={state.idx} mode={state.mode} sel={cmpSel} onToggleSel={toggleCmp} res={res}
          rot={state.rot} onRot={selecionar} diags={diags}
          onIdx={setIdx} onMode={setMode} decendios={clima.dados?.decendios ?? null}
          onAdd={abrirRascunho} addBloqueio={editor.aberto ? null : addBloqueio}
          faixa={faixa} onRemoverSalva={removerRotacaoSalva}
          rascunho={editor.aberto ? (
            <DraftRow editor={editor} catalogo={catalogo} onSalvar={salvarRascunho}
              bloqueioSalvar={addBloqueio ?? (editor.sim.status === 'ok' && !datasCompletas ? 'Aguarde a simulação' : null)} />
          ) : null}
        />
        </>}
      </main>
      <span className="sr-only" aria-live="polite">{anuncio}</span>
      {pronto && editor.aberto && state.mode === 'cal' && <DraftInspector editor={editor} />}
      {pronto && !(editor.aberto && state.mode === 'cal') && <Inspector rotIdx={state.rot} diag={diags?.[state.rot] ?? null} clima={clima.dados} res={res} onVerDados={() => setVerCulturas(true)} />}
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
