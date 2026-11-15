// Painel direito com o rascunho aberto: veredito, posição no ranking, culturas com datas e risco, limitações
// (checks da API em português, lacuna entre culturas) e as notas 0–100. Tudo do POST /api/rotations/simulate.
import { useEffect, useMemo, useRef, useState } from 'react'
import './rascunho.css'
import type { EditorRascunho } from '../../hooks/useRascunho'
import { anosDoRisco } from '../../logic/resiliencia'
import {
  datasCultura, diasSemCobertura, MAX_CULTURAS, posicaoRanking, ROTULO_CLASSE, tituloRascunho, traduzirCheck, type Aviso,
} from '../../logic/rascunho'
import { lerSimulacao } from './leitura'

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const ESTAGIO: Record<string, string> = { initial: 'no início', development: 'no desenvolvimento', mid_season: 'na floração e enchimento', late_season: 'no fim do ciclo' }

export function DraftInspector({ editor }: { editor: EditorRascunho }) {
  const { rascunho: r, ano, nomes, sim } = editor
  const leitura = useMemo(() => lerSimulacao(r, sim), [r, sim])
  const dados = sim.atual ? sim.dados : null
  const rot = dados?.rotation ?? null
  const sel = r.sel != null && r.culturas[r.sel] ? r.sel : null
  const nomeSel = sel != null ? minuscula(nomes[sel]) : null

  let veredito: string
  if (r.culturas.length === 0) veredito = 'Adicione uma cultura'
  else if (r.culturas.length < MAX_CULTURAS) veredito = 'Adicione a 2ª cultura para simular'
  else if (sim.status === 'erro') veredito = 'A simulação não rodou com estas datas'
  else if (leitura.pior.i < 0) veredito = 'Simulando…'
  else {
    const n = nomes[leitura.pior.i]
    veredito = {
      good: 'As duas culturas com clima favorável nestas datas',
      warn: `${n}: clima arriscado nestas datas`,
      risk: `${n}: clima desfavorável nestas datas`,
      none: `Sem dado de risco para ${minuscula(n)}`,
    }[leitura.pior.cls]
  }

  const limitacoes: (Aviso & { ok: boolean })[] = []
  if (r.culturas.length === MAX_CULTURAS) {
    const dias = diasSemCobertura(r, ano)
    limitacoes.push(dias > 0
      ? { ok: false, titulo: 'Solo exposto', texto: `${dias} dias sem cobertura entre as culturas.` }
      : { ok: true, titulo: 'Solo exposto', texto: 'Uma cultura entra logo depois da outra.' })
  }
  if (rot) {
    const nomesApi = rot.crops.map(c => c.crop.common_names[0] ?? c.crop.scientific_name)
    const checks = rot.checks.map(c => ({ ok: false, ...traduzirCheck(c, nomesApi, nomes) }))
    limitacoes.push(...(checks.length ? checks : [{ ok: true, titulo: 'Filtros da recomendação', texto: 'Passa nos filtros de família, calendário e temperatura.' }]))
    const sp = rot.soil_protection
    limitacoes.push({ ok: true, titulo: 'Cobertura do solo na safra', texto: `Cultura viva em ${sp.living_cover_days} de ${sp.season_days} dias.` })
  }
  r.culturas.forEach((c, i) => {
    if (c.ajustado) limitacoes.push({ ok: false, titulo: 'Ciclo ajustado', texto: `${nomes[i]}: a colheita passava de 31 ago e foi trazida para o fim da safra.` })
  })

  // Anúncio para leitor de tela depois de cada resultado (500 ms sem mudança).
  const [anuncio, setAnuncio] = useState('')
  const resumo = rot && leitura.pior.i >= 0
    ? `${rot.crops.map((c, i) => `${nomes[i]}: ${ROTULO_CLASSE[leitura.classes[i]].toLowerCase()}${c.crop.risk.risk_percentage != null ? `, risco em ${10 - anosDoRisco(c.crop.risk.risk_percentage)} de 10 anos` : ''}`).join('. ')}. ${rot.would_be_recommended ? `Ficaria em ${rot.rank}º.` : 'Fora das 4 melhores.'}`
    : ''
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    if (resumo) timer.current = setTimeout(() => setAnuncio(resumo), 500)
    return () => clearTimeout(timer.current)
  }, [resumo])

  const scores = rot?.scores
  const nota = (v: number | null | undefined) => (v == null ? 'Sem dado' : Math.round(v))

  return (
    <aside className="insp" aria-label="Detalhe da nova rotação">
      <div className="eyebrow">Nova rotação · rascunho</div>
      <h2>{tituloRascunho(nomes)}</h2>
      <span className="verdict"><span className={`dot ${leitura.pior.i < 0 ? 'none' : leitura.pior.cls}`} />{veredito}</span>

      {leitura.ranking && (
        <div className="rankcard" style={leitura.velho ? { opacity: .6 } : undefined}>
          <span>Posição no ranking<small>{leitura.ranking.recomendada ? 'Entre as 4 recomendadas' : 'Fora das 4 recomendadas'}</small></span>
          <b>{posicaoRanking(leitura.ranking.rank, leitura.ranking.entre)}</b>
        </div>
      )}

      {r.culturas.length > 0 && (
        <div className="why">
          <h3>Culturas</h3>
          <div className="list">
            {r.culturas.map((c, i) => {
              const cls = leitura.classes[i] ?? 'none'
              const risco = leitura.riscos[i]
              const estagio = rot?.crops[i]?.crop.risk.critical_stage
              return (
                <div key={i} className={`ci${sel === i ? ' sel' : ''}`}>
                  <button className="ci-main" type="button" aria-pressed={sel === i} onClick={() => editor.selecionar(i)}>
                    <span className={`dot ${cls}`} />
                    <span className="ci-t">
                      <b>{nomes[i]}</b>
                      <span>{datasCultura(c, ano)}</span>
                      {risco != null && <span>Perda crítica em {10 - anosDoRisco(risco)} de 10 anos{estagio ? `, mais ${ESTAGIO[estagio]}` : ''}</span>}
                    </span>
                    <span className={`ci-s ${cls}`}>{ROTULO_CLASSE[cls]}</span>
                  </button>
                </div>
              )
            })}
          </div>
          {sel != null && sim.sweep && (
            <>
              <p className="hint">
                <span className="zsw" /><span className="zsw warn" /><span className="zsw risk" />
                <span>
                  Cores no calendário: risco de plantar {nomeSel} em cada decêndio
                  {sel === 0 && nomes[1] ? `, com ${minuscula(nomes[1])} acompanhando (vale a pior das duas)` : nomes[0] ? `, com ${minuscula(nomes[0])} nas datas atuais` : ''}.
                  A mesma régua da barra.
                </span>
              </p>
              <p className="hint"><span className="zreg" aria-hidden="true">1</span><span>Sublinhado: data usual de plantio na região (±30 dias).</span></p>
            </>
          )}
        </div>
      )}

      {limitacoes.length > 0 && (
        <div className="why">
          <h3>Suas limitações</h3>
          <div className="list">
            {limitacoes.map((k, n) => (
              <div key={n} className="wi">
                <span className={`wic ${k.ok ? 'ok' : 'alerta'}`}>
                  <svg className="ic" aria-hidden="true"><use href={`/canvas-icons.svg#${k.ok ? 'i-okc' : 'i-alert'}`} /></svg>
                </span>
                <div><b>{k.titulo}</b><p>{k.texto}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scores && (
        <div className="why">
          <h3>Notas da simulação (0–100)</h3>
          <div className="notas">
            <div className="nota"><b>{nota(scores.productivity)}</b>Produtividade</div>
            <div className="nota"><b>{nota(scores.water_security)}</b>Segurança hídrica</div>
            <div className="nota"><b>{nota(scores.soil_protection)}</b>Proteção do solo</div>
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">{anuncio}</span>
      <p className="foot">
        Arraste as pontas da barra para mudar plantio e colheita, ou o meio para mover a cultura (a 1ª leva a 2ª junto).
        Pelo teclado: Tab até a ponta, setas mudam um decêndio, Shift+setas movem a cultura.
        Simulação da API Entressafras (balanço hídrico FAO-56 simplificado, não validado com o ZARC).
      </p>
    </aside>
  )
}
