// Registro de um ano agrícola: 1ª e 2ª safra (sugestões, busca e lista por categoria), produtividade e pragas.
// Portado de createEditorSafra (entressafras/src/components/historico.js).
import { useId, useState, type KeyboardEvent } from 'react'
import type { RegistroSafra } from '../types'
import { GRUPOS_CULTURA, NAO_PLANTEI, PRAGAS, SUGESTOES, ehOutra, nomeCultura, norm, outra, unidadeDe } from '../logic/historico'
import { Icone } from './Icone'
import { t } from '../i18n'

type K = 'c1' | 'c2'
const TITULO: Record<K, string> = { c1: '1ª safra · verão', c2: '2ª safra · safrinha' }
const SC: Record<K, 'sc1' | 'sc2'> = { c1: 'sc1', c2: 'sc2' }

/** Safra seguinte já registrada: a cultura dela vira a 1ª sugestão ("igual a 2025/26"). */
export type ReferenciaSafra = { safra: string; registro: RegistroSafra }
type Props = { valor: RegistroSafra; onMudar: (r: RegistroSafra) => void; referencia?: ReferenciaSafra | null }

/** Nome exibido: as culturas do catálogo no idioma da tela; a digitada pelo agricultor fica como ele escreveu. */
const nomeExibido = (v: string) => (ehOutra(v) ? nomeCultura(v) : t(nomeCultura(v)))
/** "1ª safra · verão" / "2ª safra · safrinha" no idioma da tela. */
const tituloDe = (k: K) => t(TITULO[k])

function IconeCultura({ v }: { v: string }) {
  return <Icone id={v === NAO_PLANTEI ? 'c-fallow' : 'i-leaf'} className="ic hs-ci" />
}

/** Sugestões do campo: a cultura da safra de referência primeiro, depois as comuns na região. */
function sugeridas(k: K, ref: ReferenciaSafra | null | undefined): string[] {
  const daRef = ref?.registro[k]
  return daRef ? [daRef, ...SUGESTOES[k].filter(v => v !== daRef)] : [...SUGESTOES[k]]
}

/** Seções da lista: sugeridas + grupos do catálogo, filtradas pelo termo. */
function secoes(k: K, termo: string, ref?: ReferenciaSafra | null): [string, string[]][] {
  const alvo = norm(termo.trim())
  const casa = (v: string) => !alvo || norm(nomeExibido(v)).includes(alvo)
  const grupos: [string, string[]][] = [
    ['Sugeridas', sugeridas(k, ref)],
    ...(k === 'c2' ? [['Sem cultura', [NAO_PLANTEI]] as [string, string[]]] : []),
    ...GRUPOS_CULTURA,
  ]
  return grupos
    .map(([titulo, vs]): [string, string[]] => [titulo, vs.filter(casa)])
    .filter(([, l]) => l.length > 0)
}

export function EditorSafra({ valor: reg, onMudar, referencia = null }: Props) {
  const uid = useId()
  const [q, setQ] = useState<Record<K, string>>({ c1: '', c2: '' })
  const [aberto, setAberto] = useState<K | null>(null)

  const mudar = (r: RegistroSafra) => onMudar(r)

  function escolher(k: K, v: string) {
    const r: RegistroSafra = { ...reg, [k]: v }
    if (k === 'c2' && v === NAO_PLANTEI) delete r.sc2
    if (!unidadeDe(v)) delete r[SC[k]]
    setQ(x => ({ ...x, [k]: '' }))
    setAberto(k === 'c1' && !reg.c2 ? 'c2' : null)
    mudar(r)
  }
  function trocar(k: K) {
    const r: RegistroSafra = { ...reg, [k]: null }
    delete r[SC[k]]
    setAberto(k)
    mudar(r)
  }

  function teclas(k: K, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && aberto) { e.stopPropagation(); setAberto(null) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const termo = q[k].trim()
      const primeira = secoes(k, termo, referencia)[0]?.[1][0]
      if (primeira) escolher(k, primeira)
      else if (termo) escolher(k, outra(termo))
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAberto(k)
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-${k}-lista`)} [role="option"]`)?.focus())
    }
  }
  function teclasLista(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const ops = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')]
    const i = ops.indexOf(document.activeElement as HTMLElement)
    ops[Math.max(0, Math.min(ops.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
  }

  function campo(k: K) {
    const v = reg[k]
    if (v) {
      return (
        <div className="hs-token">
          <IconeCultura v={v} />{nomeExibido(v)}
          {ehOutra(v) && <small className="hs-fora">{t('não simulada')}</small>}
          <button className="hs-x" type="button" onClick={() => trocar(k)} aria-label={t('Trocar {cultura} da {safra}', { cultura: nomeExibido(v), safra: tituloDe(k) })}>{t('Trocar')}</button>
        </div>
      )
    }
    const listaId = `${uid}-${k}-lista`
    const termo = q[k].trim()
    const secs = aberto === k ? secoes(k, q[k], referencia) : []
    return (
      <>
        <div className="hs-sug" role="group" aria-label={t('Sugestões para {safra}', { safra: tituloDe(k) })}>
          {sugeridas(k, referencia).map(s => (
            <button key={s} className="hs-pill" type="button" onClick={() => escolher(k, s)}>
              <IconeCultura v={s} />{nomeExibido(s)}
              {referencia?.registro[k] === s && <small>{t('igual a {safra}', { safra: referencia.safra })}</small>}
            </button>
          ))}
        </div>
        <div className="hs-box">
          <div className="hs-search">
            <Icone id="i-search" />
            <input
              type="text" role="combobox" aria-expanded={aberto === k} aria-controls={listaId} aria-autocomplete="list"
              placeholder={t('Outra cultura: busque ou veja a lista')} aria-label={t('Buscar cultura da {safra}', { safra: tituloDe(k) })}
              value={q[k]}
              onChange={e => { setQ(x => ({ ...x, [k]: e.target.value })); setAberto(k) }}
              onFocus={() => setAberto(k)}
              onKeyDown={e => teclas(k, e)}
            />
            <button className="hs-tog" type="button" aria-label={t('Ver todas as culturas')} aria-expanded={aberto === k}
              onClick={() => setAberto(a => (a === k ? null : k))}>
              <Icone id="i-updown" />
            </button>
          </div>
          {aberto === k && (
            <div className="hs-drop" role="listbox" id={listaId} aria-label={t('Culturas')} onKeyDown={teclasLista}>
              {secs.map(([titulo, vs]) => (
                <div key={titulo} className="hs-ms" role="group" aria-label={t(titulo)}>
                  <div className="hs-mh">{t(titulo)}</div>
                  {vs.map(v => (
                    <button key={v} className="hs-di" type="button" role="option" aria-selected={false} onClick={() => escolher(k, v)}>
                      <IconeCultura v={v} />{nomeExibido(v)}
                      {titulo === 'Sugeridas' && <small>{referencia?.registro[k] === v ? t('Em {safra}', { safra: referencia.safra }) : t('Comum na região')}</small>}
                    </button>
                  ))}
                </div>
              ))}
              {termo && !secs.length && (
                <button className="hs-di hs-usar" type="button" role="option" aria-selected={false} onClick={() => escolher(k, outra(termo))}>
                  <Icone id="i-plus" />{t('Usar “{termo}”', { termo })}<small>{t('fica no histórico, sem simulação')}</small>
                </button>
              )}
            </div>
          )}
        </div>
      </>
    )
  }

  function produtividade(k: K) {
    const u = unidadeDe(reg[k])
    if (!u) return null
    const id = `${uid}-${k}-sc`
    return (
      <div className="hs-row">
        <label htmlFor={id}>{t('Produtividade')} <small>{t('opcional')}</small></label>
        <span className="hs-num">
          <input id={id} type="text" inputMode="decimal" placeholder="0" value={reg[SC[k]] ?? ''}
            onChange={e => mudar({ ...reg, [SC[k]]: e.target.value })} />
          <span>{u}</span>
        </span>
      </div>
    )
  }

  const quais = reg.quais ?? []
  const pragasId = `${uid}-pragas`
  return (
    <div className="hs-ed">
      {(['c1', 'c2'] as const).map(k => (
        <div key={k}>
          <div className="hs-sh">{tituloDe(k)}</div>
          <div className="hs-grp">{campo(k)}{produtividade(k)}</div>
        </div>
      ))}
      <div>
        <div className="hs-sh">{t('Pragas')} <span className="hs-opt">{t('opcional')}</span></div>
        <div className="hs-grp">
          <div className="hs-lin">
            <span id={pragasId}>{t('Teve ataque de pragas nesta safra')}</span>
            <button className="sw" type="button" role="switch" aria-checked={!!reg.pragas} aria-labelledby={pragasId}
              onClick={() => {
                const r: RegistroSafra = { ...reg, pragas: !reg.pragas }
                if (!r.pragas) delete r.quais
                mudar(r)
              }} />
          </div>
          {reg.pragas && (
            <div className="hs-pests" role="group" aria-label={t('Quais pragas')}>
              {PRAGAS.map(p => {
                const on = quais.includes(p)
                return (
                  <button key={p} className={`hs-chip${on ? ' on' : ''}`} type="button" aria-pressed={on}
                    onClick={() => mudar({ ...reg, quais: on ? quais.filter(x => x !== p) : [...quais, p] })}>
                    {t(p)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
