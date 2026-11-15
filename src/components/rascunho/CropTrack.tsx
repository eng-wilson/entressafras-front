// Trilho de edição do rascunho: barras arrastáveis (meio move, pontas mudam plantio e colheita), alças que
// também são sliders de teclado, lacunas sem cobertura e a dica de arrasto. Encaixa por decêndio, em datas exatas
// (logic/rascunho.ts, arrastar): soltar num decêndio gera o mesmo pedido do ponto do sweep.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  arrastar, dataCurta, datasDe, diasDePousio, diasEntre, faixaDecendio, N_DEC, textoLimite,
  type Classe, type Gesto, type Rascunho,
} from '../../logic/rascunho'
import { t } from '../../i18n'

type Props = {
  rascunho: Rascunho
  ano: number
  nomes: string[]
  /** Classe de cada cultura (cor da barra) e se o valor é de datas anteriores (esmaecido). */
  classes: Classe[]
  velho: boolean
  onChange: (r: Rascunho) => void
  onSelect: (i: number) => void
  /** Avisa o gesto no início do arrasto e null no fim (o menu Trocar/Remover e a faixa reagem). */
  onArrasto: (gesto: Gesto | null) => void
  onRemover: (i: number) => void
}

type Arrasto = { i: number; gesto: Gesto; x0: number; base: Rascunho; left: number; width: number; pointer: number }
type Dica = { texto: string; x: number; limite: boolean }

const pct = (d: number) => `${(d / N_DEC * 100).toFixed(3)}%`
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function CropTrack({ rascunho, ano, nomes, classes, velho, onChange, onSelect, onArrasto, onRemover }: Props) {
  const trilho = useRef<HTMLDivElement>(null)
  const arrasto = useRef<Arrasto | null>(null)
  const [ativo, setAtivo] = useState<number | null>(null)
  const [dica, setDica] = useState<Dica | null>(null)

  function aplicar(base: Rascunho, i: number, gesto: Gesto, alvo: number) {
    const { rascunho: r, motivo } = arrastar(base, i, gesto, alvo, ano)
    const c = r.culturas[i]
    const ponto = gesto === 'colheita' ? c.e : c.s
    const d = datasDe(c, ano)
    const texto = motivo
      ? textoLimite(motivo, i, nomes, c)
      : gesto === 'colheita' ? t('Colheita: {data}', { data: dataCurta(d.colheita) }) : t('Plantio: {data}', { data: dataCurta(d.plantio) })
    setDica({ texto, x: ponto, limite: !!motivo })
    const mesmas = (j: number) => {
      const a = datasDe(r.culturas[j], ano), b = rascunho.culturas[j] && datasDe(rascunho.culturas[j], ano)
      return !!b && a.plantio === b.plantio && a.ciclo === b.ciclo
    }
    if (r.culturas.some((_, j) => !mesmas(j))) onChange({ ...r, sel: i })
  }

  function iniciar(e: PointerEvent<HTMLElement>, i: number, gesto: Gesto) {
    if (e.button !== 0 || !trilho.current) return
    e.preventDefault()
    e.stopPropagation()
    const r = trilho.current.getBoundingClientRect()
    arrasto.current = { i, gesto, x0: e.clientX, base: { ...rascunho, sel: i }, left: r.left, width: r.width, pointer: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    setAtivo(i)
    onSelect(i)
    onArrasto(gesto)
  }
  function mover(e: PointerEvent<HTMLElement>) {
    const a = arrasto.current
    if (!a || e.pointerId !== a.pointer) return
    const c = a.base.culturas[a.i]
    const alvo = a.gesto === 'mover'
      ? c.s + Math.round((e.clientX - a.x0) / a.width * N_DEC)
      : Math.round((e.clientX - a.left) / a.width * N_DEC)
    aplicar(a.base, a.i, a.gesto, alvo)
  }
  function soltar(e: PointerEvent<HTMLElement>) {
    const a = arrasto.current
    if (!a || e.pointerId !== a.pointer) return
    arrasto.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setAtivo(null)
    setDica(null)
    onArrasto(null)
  }
  const ponteiro = (i: number, gesto: Gesto) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => iniciar(e, i, gesto),
    onPointerMove: mover,
    onPointerUp: soltar,
    onPointerCancel: soltar,
  })

  /** ←/→ ±1 decêndio na alça; Shift+←/→ move a cultura inteira; Delete remove. */
  function tecla(e: KeyboardEvent, i: number, gesto: 'plantio' | 'colheita') {
    const c = rascunho.culturas[i]
    const passo = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemover(i); return }
    if (!passo) return
    e.preventDefault()
    if (e.shiftKey) aplicar(rascunho, i, 'mover', c.s + passo)
    else aplicar(rascunho, i, gesto, (gesto === 'plantio' ? c.s : c.e) + passo)
    setTimeout(() => setDica(null), 1200)
  }
  /** Limites do slider: o mesmo cálculo do arrasto, com o alvo nos extremos. */
  const limites = (i: number, gesto: 'plantio' | 'colheita') => {
    const lo = arrastar(rascunho, i, gesto, -N_DEC, ano).rascunho.culturas[i]
    const hi = arrastar(rascunho, i, gesto, 2 * N_DEC, ano).rascunho.culturas[i]
    return gesto === 'plantio' ? [lo.s, hi.s] : [lo.e - 1, hi.e - 1]
  }

  const cs = rascunho.culturas
  return (
    <div className="tl dtl" ref={trilho}>
      {cs.map((c, i) => {
        const sel = rascunho.sel === i
        const nome = nomes[i] ?? ''
        const [pMin, pMax] = limites(i, 'plantio')
        const [cMin, cMax] = limites(i, 'colheita')
        return (
          <div key={i} className={`cb${sel ? ' sel' : ''}${ativo === i ? ' arrastando' : ''}`} style={{ left: pct(c.s), width: pct(c.e - c.s) }}
            role="group" aria-label={t('{nome}: plantio {plantio}, colheita {colheita}', { nome, plantio: dataCurta(datasDe(c, ano).plantio), colheita: dataCurta(datasDe(c, ano).colheita) })}>
            <div className={`b ${classes[i] ?? 'none'}${velho ? ' velho' : ''}`} title={nome} {...ponteiro(i, 'mover')}
              onClick={() => onSelect(i)}>
              <span className="bl">{nome}</span>
            </div>
            <button type="button" className="hd l" role="slider" aria-label={t('Plantio de {nome}', { nome: minuscula(nome) })}
              aria-valuemin={pMin} aria-valuemax={pMax} aria-valuenow={c.s} aria-valuetext={faixaDecendio(c.s, ano)}
              onFocus={() => onSelect(i)} onKeyDown={e => tecla(e, i, 'plantio')} onBlur={() => setDica(null)} {...ponteiro(i, 'plantio')}>
              <i />
            </button>
            <button type="button" className="hd r" role="slider" aria-label={t('Colheita de {nome}', { nome: minuscula(nome) })}
              aria-valuemin={cMin} aria-valuemax={cMax} aria-valuenow={c.e - 1} aria-valuetext={faixaDecendio(c.e - 1, ano)}
              onFocus={() => onSelect(i)} onKeyDown={e => tecla(e, i, 'colheita')} onBlur={() => setDica(null)} {...ponteiro(i, 'colheita')}>
              <i />
            </button>
          </div>
        )
      })}
      {cs.slice(1).map((b, k) => {
        const a = cs[k]
        if (b.s <= a.e) return null
        const dias = diasEntre(datasDe(a, ano).colheita, datasDe(b, ano).plantio) - 1
        return (
          <div key={`g${k}`} className="gap" role="note" style={{ left: pct(a.e), width: `calc(${pct(b.s - a.e)} - 2px)` }}
            title={t('{n} dias sem cobertura entre {a} e {b}', { n: dias, a: minuscula(nomes[k] ?? ''), b: minuscula(nomes[k + 1] ?? '') })}>
            {b.s - a.e >= 2 ? t('{n} dias sem cobertura', { n: dias }) : t('{n}d', { n: dias })}
          </div>
        )
      })}
      {cs.length === 1 && cs[0].e < N_DEC && (() => {
        // Rotação de 1 cultura: a API simula o resto da safra (até 31/ago) em pousio.
        const dias = diasDePousio(rascunho, ano)
        const largura = N_DEC - cs[0].e
        return (
          <div className="gap pousio" role="note" style={{ left: pct(cs[0].e), width: `calc(${pct(largura)} - 2px)` }}
            title={t('{n} dias de solo sem cultura depois de {nome}, até 31 ago.', { n: dias, nome: minuscula(nomes[0] ?? '') })}>
            {largura >= 4 ? t('Pousio · {n} dias', { n: dias }) : t('Pousio')}
          </div>
        )
      })()}
      {dica && <span className={`tip${dica.limite ? ' limit' : ''}`} style={{ left: pct(dica.x) }} role="status">{dica.texto}</span>}
    </div>
  )
}
