// Janela de etapas sobre o mapa: Talhão (nome e área) → Solo → Rotação (última safra, opcional).
// Ao editar um talhão existente são só duas etapas: Talhão e Solo.
import { useEffect, useRef, useState } from 'react'
import type { Contorno, DadosTalhao, Talhao } from '../types'
import { areaHa, fmtHa } from '../logic/geo'
import { texturaEfetiva } from '../logic/solo'
import { rotuloSafra, ultimaSafra } from '../logic/historico'
import { EditorSafra } from './EditorSafra'
import { PassoSolo } from './PassoSolo'
import { dadosDo, formDe, type Form } from './dados'
import { Icone } from './Icone'

type Props = {
  contorno: Contorno
  /** Talhão em edição; ausente ao criar. */
  talhao?: Talhao | null
  passoInicial?: number
  onSalvar: (d: DadosTalhao) => void
  onCancelar: () => void
}

export function JanelaPassos({ contorno, talhao, passoInicial = 0, onSalvar, onCancelar }: Props) {
  const novo = !talhao
  const passos = novo ? ['Talhão', 'Solo', 'Rotação'] : ['Talhão', 'Solo']
  const [passo, setPasso] = useState(passoInicial)
  const [f, setF] = useState<Form>(() => formDe(talhao))
  const nomeRef = useRef<HTMLInputElement>(null)
  const safra = rotuloSafra(ultimaSafra())

  useEffect(() => { if (passo === 0) nomeRef.current?.focus() }, [passo])

  const tex = texturaEfetiva(f.textura, f.analise, f.texturaManual)
  const faltaTextura = passo === 1 && !tex.textura
  const salvar = (registro = f.registro) => onSalvar(dadosDo({ ...f, registro }, contorno, talhao))

  const titulo = passo === 0 ? (novo ? 'Novo talhão' : 'Talhão') : passo === 1 ? 'Solo do talhão' : 'Rotação atual'
  const sub = passo === 0 ? 'Dê um nome para encontrar o talhão depois.'
    : passo === 1 ? 'Comece pela textura. A análise de solo é opcional.'
      : `Opcional. O que você plantou na safra ${safra}? Vira o ponto de partida das sugestões.`

  let fim
  if (passo === 0) {
    fim = <button className="ob-btn ob-pri" type="button" disabled={!f.nome.trim()} onClick={() => setPasso(1)}>Continuar</button>
  } else if (passo === 1) {
    fim = (
      <>
        {faltaTextura && <span className="ob-cinza ob-peq">Escolha a textura para {novo ? 'continuar' : 'salvar'}.</span>}
        {novo
          ? <button className="ob-btn ob-pri" type="button" disabled={faltaTextura} onClick={() => setPasso(2)}>Continuar</button>
          : <button className="ob-btn ob-pri" type="button" disabled={faltaTextura} onClick={() => salvar()}>Salvar</button>}
      </>
    )
  } else {
    fim = (
      <>
        <button className="ob-btn" type="button" onClick={() => salvar(null)}>Pular</button>
        <button className="ob-btn ob-pri" type="button" onClick={() => salvar()}>Concluir e ver sugestões</button>
      </>
    )
  }

  return (
    <div className="ob-modal">
      <section className="ob-sheet" role="dialog" aria-modal="true" aria-labelledby="ob-sheet-t">
        <div className="ob-sh-top">
          <ol className="ob-passos" aria-label="Etapas">
            {passos.map((p, i) => (
              <li key={p} className={`ob-stp${i === passo ? ' on' : i < passo ? ' done' : ''}`} aria-current={i === passo ? 'step' : undefined}>
                <i aria-hidden="true">{i < passo ? '✓' : i + 1}</i>{p}
              </li>
            ))}
          </ol>
          <button className="ob-tb" type="button" onClick={onCancelar} aria-label="Fechar"><Icone id="i-x" /></button>
        </div>
        <div className="ob-sh-tit"><h2 id="ob-sheet-t">{titulo}</h2><p>{sub}</p></div>
        <div className="ob-sh-corpo">
          {passo === 0 && (
            <div className="ob-frm">
              <label className="ob-l" htmlFor="ob-nome">Nome</label>
              <span className="ob-tf">
                <input id="ob-nome" ref={nomeRef} type="text" maxLength={24} placeholder="Ex.: Talhão da Sede" autoComplete="off"
                  value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter' && f.nome.trim()) setPasso(1) }} />
              </span>
              <span className="ob-l">Área</span>
              <span>{fmtHa(areaHa(contorno))} <span className="ob-cinza">· calculada pelo contorno</span></span>
            </div>
          )}
          {passo === 1 && <PassoSolo form={f} onMudar={s => setF({ ...f, ...s })} />}
          {passo === 2 && (
            <div className="ob-rot">
              <EditorSafra valor={f.registro ?? {}} onMudar={r => setF({ ...f, registro: r })} />
            </div>
          )}
        </div>
        <div className="ob-sh-pe">
          {passo > 0 && <button className="ob-btn" type="button" onClick={() => setPasso(passo - 1)}>Voltar</button>}
          <span className="ob-mola" />
          <button className="ob-btn" type="button" onClick={onCancelar}>Cancelar</button>
          {fim}
        </div>
      </section>
    </div>
  )
}
