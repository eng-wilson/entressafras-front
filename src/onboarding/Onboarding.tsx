// Primeiro acesso e edição do talhão (portado de entressafras/src/components/onboarding.js):
//   vazio    mapa sem talhão e o convite "Marque seu primeiro talhão";
//   desenho  cliques no mapa marcam os cantos (Desfazer, Cancelar, Concluir com 3 cantos ou mais);
//   janela   etapas Talhão → Solo → Rotação (na edição: Talhão → Solo);
//   lista    (modo talhoes) os talhões salvos no mapa: escolher outro ou desenhar um novo.
import './onboarding.css'
import { useEffect, useState, type FormEvent } from 'react'
import { latLngBounds, type Map as LMap } from 'leaflet'
import { fmtCoord, fmtHaCurto } from '../logic/geo'
import type { Contorno, DadosTalhao, Talhao } from '../types'
import { areaHa, centroide } from '../logic/geo'
import { buscar } from '../services/geocoding'
import { dadosExemplo } from './exemplo'
import { EstadoVazio } from './EstadoVazio'
import { HudDesenho } from './HudDesenho'
import { Icone } from './Icone'
import { JanelaPassos } from './JanelaPassos'
import { MapaTalhao, type Camada } from './MapaTalhao'

export type ModoOnboarding = 'novo' | 'editar' | 'redesenhar' | 'talhoes'

type Props = {
  modo: ModoOnboarding
  /** Talhão em edição (modos editar e redesenhar). */
  talhao?: Talhao | null
  onConcluir: (d: DadosTalhao) => void
  /** Ausente no primeiro acesso: não há para onde voltar. */
  onCancelar?: () => void
  /** Modo talhoes: todos os talhões salvos e a troca do ativo. */
  talhoes?: Talhao[]
  onEscolher?: (id: string) => void
}

type Tela = 'vazio' | 'desenho' | 'janela' | 'lista'

const telaInicial = (modo: ModoOnboarding): Tela =>
  modo === 'novo' ? 'vazio' : modo === 'redesenhar' ? 'desenho' : modo === 'talhoes' ? 'lista' : 'janela'

export function Onboarding({ modo, talhao, onConcluir, onCancelar, talhoes = [], onEscolher }: Props) {
  const [tela, setTela] = useState<Tela>(telaInicial(modo))
  const [pontos, setPontos] = useState<Contorno>(modo === 'editar' && talhao ? talhao.contorno : [])
  const [camada, setCamada] = useState<Camada>('mapa')
  const [mapa, setMapa] = useState<LMap | null>(null)
  const [aviso, setAviso] = useState('')
  const [busca, setBusca] = useState('')

  // Enquadra o talhão em edição (ou todos, na escolha); no primeiro acesso tenta a localização do navegador.
  useEffect(() => {
    if (!mapa) return
    const todos = modo === 'talhoes' ? talhoes.flatMap(t => t.contorno) : []
    if (todos.length) {
      mapa.fitBounds(latLngBounds(todos), { padding: [80, 80], maxZoom: 16 })
    } else if (talhao?.contorno.length) {
      mapa.fitBounds(latLngBounds(talhao.contorno), { padding: [80, 80], maxZoom: 16 })
    } else if (modo === 'novo' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        p => mapa.setView([p.coords.latitude, p.coords.longitude], 15),
        () => setAviso('Sem acesso à sua localização: mostrando Rio Verde, GO. Use a busca para achar sua fazenda.'),
        { timeout: 8000 },
      )
    }
  }, [mapa, talhao, modo, talhoes])

  function cancelarDesenho() {
    setPontos([])
    if (modo === 'redesenhar') onCancelar?.()
    else setTela(modo === 'talhoes' ? 'lista' : 'vazio')
  }
  function concluirDesenho() {
    if (pontos.length < 3) return
    if (modo === 'redesenhar' && talhao) {
      // Contorno novo de um talhão que já existe: salva direto, mantendo solo e histórico.
      onConcluir({
        nome: talhao.nome, contorno: pontos, areaHa: areaHa(pontos), centro: centroide(pontos),
        textura: talhao.textura, texturaInformada: talhao.texturaInformada, texturaPeloLaudo: talhao.texturaPeloLaudo,
        analise: talhao.analise, historico: talhao.historico,
      })
      return
    }
    setTela('janela')
  }
  function cancelarJanela() {
    if (modo === 'editar') { onCancelar?.(); return }
    setPontos([])
    setTela(modo === 'talhoes' ? 'lista' : 'vazio')
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tela === 'desenho') cancelarDesenho()
      else if (tela === 'janela') cancelarJanela()
      else if (tela === 'lista') onCancelar?.()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  async function buscarLugar(e: FormEvent) {
    e.preventDefault()
    const q = busca.trim()
    if (!q || !mapa) return
    const lugar = await buscar(q)
    if (lugar) { mapa.setView([lugar.lat, lugar.lon], 14); setAviso('') }
    else setAviso(`Nada encontrado para "${q}". Tente o nome da cidade ou navegue pelo mapa.`)
  }
  function minhaLocalizacao() {
    if (!('geolocation' in navigator)) { setAviso('Este navegador não informa a localização.'); return }
    navigator.geolocation.getCurrentPosition(
      p => { mapa?.setView([p.coords.latitude, p.coords.longitude], 15); setAviso('') },
      () => setAviso('Não foi possível obter a sua localização.'),
    )
  }
  function comecarDesenho() { setPontos([]); setAviso(''); setTela('desenho') }

  const subtitulo = modo === 'novo' ? 'Nenhum talhão ainda'
    : modo === 'talhoes' ? `${talhoes.length} ${talhoes.length === 1 ? 'talhão' : 'talhões'}` : talhao?.nome ?? ''
  return (
    <div className="ob">
      <div className="ob-win">
        <header className="ob-bar">
          <div className="ob-brand"><span className="ob-logo"><Icone id="i-leaf" /></span><span>Field Shift</span></div>
          <div className="ob-tit">
            <div className="ob-t">{modo === 'redesenhar' ? 'Redesenhar talhão' : 'Talhões'}</div>
            <div className="ob-st">{subtitulo}</div>
          </div>
          <div className="ob-acts">
            <div className="ob-seg ob-hide-sm" role="radiogroup" aria-label="Tipo de mapa">
              {(['mapa', 'sat'] as const).map(c => (
                <button key={c} type="button" role="radio" aria-checked={camada === c} className={camada === c ? 'on' : ''} onClick={() => setCamada(c)}>
                  {c === 'mapa' ? 'Mapa' : 'Satélite'}
                </button>
              ))}
            </div>
            <form className="ob-tf ob-busca ob-hide-sm" role="search" onSubmit={buscarLugar}>
              <Icone id="i-search" />
              <input type="search" placeholder="Buscar local" aria-label="Buscar local no mapa" value={busca} onChange={e => setBusca(e.target.value)} />
            </form>
            {((modo === 'novo' && tela === 'vazio') || tela === 'lista') && (
              <button className="ob-btn ob-pri" type="button" onClick={comecarDesenho}><Icone id="i-pencil" />{tela === 'lista' ? 'Novo talhão' : 'Desenhar talhão'}</button>
            )}
            {onCancelar && (
              <button className="ob-tb" type="button" onClick={onCancelar} aria-label="Voltar às sugestões" title="Voltar às sugestões"><Icone id="i-x" /></button>
            )}
          </div>
        </header>
        <main className="ob-main" aria-label="Mapa para desenhar o talhão">
          <MapaTalhao
            camada={camada}
            pontos={pontos}
            fechado={tela === 'janela'}
            desenhando={tela === 'desenho'}
            fundo={modo === 'redesenhar' ? talhao?.contorno : null}
            talhoes={modo === 'talhoes' && tela !== 'janela'
              ? talhoes.map(t => ({ id: t.id, nome: t.nome, contorno: t.contorno, ativo: t.id === talhao?.id })) : []}
            onEscolher={tela === 'lista' ? onEscolher : undefined}
            onPonto={p => setPontos(ps => [...ps, p])}
            onMapa={setMapa}
          />
          {tela === 'desenho' && (
            <HudDesenho pontos={pontos} onDesfazer={() => setPontos(ps => ps.slice(0, -1))} onCancelar={cancelarDesenho} onConcluir={concluirDesenho} />
          )}
          {tela === 'vazio' && <EstadoVazio onDesenhar={comecarDesenho} onExemplo={() => onConcluir(dadosExemplo())} />}
          {tela === 'lista' && (
            <section className="ob-lista" aria-labelledby="ob-lista-t">
              <h2 id="ob-lista-t">Seus talhões</h2>
              <p className="ob-cinza ob-peq">Escolha um talhão aqui ou no mapa.</p>
              <ul>
                {talhoes.map(t => (
                  <li key={t.id}>
                    <button type="button" className={`ob-lt${t.id === talhao?.id ? ' on' : ''}`} aria-current={t.id === talhao?.id ? 'true' : undefined}
                      onClick={() => onEscolher?.(t.id)}>
                      <span className="ob-lt-n">{t.nome}<small>{t.local || fmtCoord(t.centro)}</small></span>
                      <span className="ob-lt-a">{fmtHaCurto(t.areaHa)}</span>
                      {t.id === talhao?.id && <Icone id="i-check" />}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="ob-btn" type="button" onClick={comecarDesenho}><Icone id="i-plus" />Desenhar novo talhão</button>
            </section>
          )}
          <div className="ob-mctl" style={{ right: 16, bottom: 32 }}>
            <button type="button" onClick={() => mapa?.zoomIn()} aria-label="Aproximar"><Icone id="i-plus" /></button>
            <span />
            <button type="button" onClick={() => mapa?.zoomOut()} aria-label="Afastar"><Icone id="i-minus" /></button>
          </div>
          <div className="ob-mctl" style={{ right: 16, bottom: 114 }}>
            <button type="button" onClick={minhaLocalizacao} aria-label="Ir para minha localização"><Icone id="i-locate" /></button>
          </div>
          <p className="ob-aviso" role="status">{aviso}</p>
        </main>
        {tela === 'janela' && (
          <JanelaPassos
            contorno={pontos}
            talhao={modo === 'editar' ? talhao : null}
            passoInicial={modo === 'editar' ? 1 : 0}
            onSalvar={onConcluir}
            onCancelar={cancelarJanela}
          />
        )}
      </div>
    </div>
  )
}
