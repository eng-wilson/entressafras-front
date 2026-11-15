// Painel direito com o rascunho aberto: veredito, posição no ranking, culturas com datas e risco, limitações
// (checks da API em português, lacuna entre culturas) e as notas 0–100. Tudo do POST /api/rotations/simulate.
import { useEffect, useMemo, useRef, useState } from 'react'
import './rascunho.css'
import type { EditorRascunho } from '../../hooks/useRascunho'
import { anosDoRisco } from '../../logic/resiliencia'
import {
  datasCultura, diasDePousio, diasSemCobertura, posicaoRanking, ROTULO_CLASSE, tituloRascunho, traduzirCheck, type Aviso,
} from '../../logic/rascunho'
import { lerSimulacao } from './leitura'
import { ordinal, t } from '../../i18n'

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const ESTAGIO: Record<string, string> = { initial: 'no início', development: 'no desenvolvimento', mid_season: 'na floração e enchimento', late_season: 'no fim do ciclo' }

export function DraftInspector({ editor }: { editor: EditorRascunho }) {
  const { rascunho: r, ano, sim } = editor
  const nomes = editor.nomes.map(n => t(n))
  const leitura = useMemo(() => lerSimulacao(r, sim), [r, sim])
  const dados = sim.atual ? sim.dados : null
  const rot = dados?.rotation ?? null
  const sel = r.sel != null && r.culturas[r.sel] ? r.sel : null
  const nomeSel = sel != null ? minuscula(nomes[sel]) : null

  let veredito: string
  if (r.culturas.length === 0) veredito = t('Adicione uma cultura')
  else if (sim.status === 'erro') veredito = t('A simulação não rodou com estas datas')
  else if (leitura.pior.i < 0) veredito = t('Simulando…')
  else {
    const n = nomes[leitura.pior.i]
    veredito = {
      good: r.culturas.length === 1 ? t('Clima favorável nestas datas') : t('As duas culturas com clima favorável nestas datas'),
      warn: t('{nome}: clima arriscado nestas datas', { nome: n }),
      risk: t('{nome}: clima desfavorável nestas datas', { nome: n }),
      none: t('Sem dado de risco para {nome}', { nome: minuscula(n) }),
    }[leitura.pior.cls]
  }

  const limitacoes: (Aviso & { ok: boolean })[] = []
  if (r.culturas.length > 1) {
    const dias = diasSemCobertura(r, ano)
    limitacoes.push(dias > 0
      ? { ok: false, titulo: t('Solo exposto'), texto: t('{n} dias sem cobertura entre as culturas.', { n: dias }) }
      : { ok: true, titulo: t('Solo exposto'), texto: t('Uma cultura entra logo depois da outra.') })
  } else if (r.culturas.length === 1) {
    // Rotação de 1 cultura: a API simula o resto da safra em pousio, o que derruba a proteção do solo.
    const dias = diasDePousio(r, ano)
    if (dias > 0) limitacoes.push({ ok: false, titulo: t('Pousio'), texto: t('{n} dias de solo sem cultura depois de {nome}, até 31 ago.', { n: dias, nome: minuscula(nomes[0]) }) })
  }
  if (rot) {
    const nomesApi = rot.crops.map(c => c.crop.common_names[0] ?? c.crop.scientific_name)
    const checks = rot.checks.map(c => ({ ok: false, ...traduzirCheck(c, nomesApi, nomes) }))
    limitacoes.push(...(checks.length ? checks : [{ ok: true, titulo: t('Filtros da recomendação'), texto: t('Passa nos filtros de família, calendário e temperatura.') }]))
    const sp = rot.soil_protection
    limitacoes.push({ ok: true, titulo: t('Cobertura do solo na safra'), texto: t('Cultura viva em {vivos} de {total} dias.', { vivos: sp.living_cover_days, total: sp.season_days }) })
  }
  r.culturas.forEach((c, i) => {
    if (c.ajustado) limitacoes.push({ ok: false, titulo: t('Ciclo ajustado'), texto: t('{nome}: a colheita passava de 31 ago e foi trazida para o fim da safra.', { nome: nomes[i] }) })
  })

  // Anúncio para leitor de tela depois de cada resultado (500 ms sem mudança).
  const [anuncio, setAnuncio] = useState('')
  const resumo = rot && leitura.pior.i >= 0
    ? `${rot.crops.map((c, i) => {
      const classe = t(ROTULO_CLASSE[leitura.classes[i]]).toLowerCase()
      return c.crop.risk.risk_percentage != null
        ? t('{nome}: {classe}, risco em {n} de 10 anos', { nome: nomes[i], classe, n: 10 - anosDoRisco(c.crop.risk.risk_percentage) })
        : t('{nome}: {classe}', { nome: nomes[i], classe })
    }).join('. ')}. ${rot.would_be_recommended ? t('Ficaria em {ord}.', { ord: ordinal(rot.rank, 'm') }) : t('Fora das 4 melhores.')}`
    : ''
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    if (resumo) timer.current = setTimeout(() => setAnuncio(resumo), 500)
    return () => clearTimeout(timer.current)
  }, [resumo])

  const scores = rot?.scores
  const nota = (v: number | null | undefined) => (v == null ? t('Sem dado') : Math.round(v))

  return (
    <aside className="insp" aria-label={t('Detalhe da nova rotação')}>
      <div className="eyebrow">{t('Nova rotação · rascunho')}</div>
      <h2>{tituloRascunho(nomes)}</h2>
      <span className="verdict"><span className={`dot ${leitura.pior.i < 0 ? 'none' : leitura.pior.cls}`} />{veredito}</span>

      {leitura.ranking && (
        <div className="rankcard" style={leitura.velho ? { opacity: .6 } : undefined}>
          <span>{t('Posição no ranking')}<small>{leitura.ranking.recomendada ? t('Entre as 4 recomendadas') : t('Fora das 4 recomendadas')}</small>
            {r.culturas.length === 1 && <small>{t('Comparada com as rotações de 2 culturas')}</small>}</span>
          <b>{posicaoRanking(leitura.ranking.rank, leitura.ranking.entre)}</b>
        </div>
      )}

      {r.culturas.length > 0 && (
        <div className="why">
          <h3>{t('Culturas')}</h3>
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
                      {risco != null && <span>{estagio && ESTAGIO[estagio]
                        ? t('Perda crítica em {n} de 10 anos, mais {estagio}', { n: 10 - anosDoRisco(risco), estagio: t(ESTAGIO[estagio]) })
                        : t('Perda crítica em {n} de 10 anos', { n: 10 - anosDoRisco(risco) })}</span>}
                    </span>
                    <span className={`ci-s ${cls}`}>{t(ROTULO_CLASSE[cls])}</span>
                  </button>
                </div>
              )
            })}
          </div>
          {sel != null && (sim.sweeps[sel] && !editor.alca ? (
            <>
              <p className="hint">
                <span className="zsw" /><span className="zsw warn" /><span className="zsw risk" />
                <span>
                  {r.culturas.length > 1
                    ? t('Cores no calendário: risco de plantar {a} em cada decêndio, com {b} nas datas atuais. Soltando a barra ali, ela fica dessa cor.', { a: nomeSel, b: minuscula(nomes[1 - sel] ?? '') })
                    : t('Cores no calendário: risco de plantar {a} em cada decêndio. Soltando a barra ali, ela fica dessa cor.', { a: nomeSel })}
                </span>
              </p>
              <p className="hint"><span className="zreg" aria-hidden="true">1</span><span>{t('Sublinhado: data usual de plantio na região (±30 dias).')}</span></p>
            </>
          ) : sim.status !== 'erro' && (
            <p className="hint">{editor.alca ? t('Mudando o ciclo: as cores do calendário voltam ao soltar.') : t('Recalculando as cores do calendário…')}</p>
          ))}
        </div>
      )}

      {limitacoes.length > 0 && (
        <div className="why">
          <h3>{t('Suas limitações')}</h3>
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
          <h3>{t('Notas da simulação (0–100)')}</h3>
          <div className="notas">
            <div className="nota"><b>{nota(scores.productivity)}</b>{t('Produtividade')}</div>
            <div className="nota"><b>{nota(scores.water_security)}</b>{t('Segurança hídrica')}</div>
            <div className="nota"><b>{nota(scores.soil_protection)}</b>{t('Proteção do solo')}</div>
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">{anuncio}</span>
      <p className="foot">
        {t('Arraste as pontas da barra para mudar plantio e colheita, ou o meio para mover a cultura sem mudar o ciclo.')}{' '}
        {t('Pelo teclado: Tab até a ponta, setas mudam um decêndio, Shift+setas movem a cultura.')}{' '}
        {t('Simulação da API Entressafras (balanço hídrico FAO-56 simplificado, não validado com o ZARC).')}
      </p>
    </aside>
  )
}
