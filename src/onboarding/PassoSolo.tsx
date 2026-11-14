import type { Textura } from '../types'
import { CAMPOS_LAUDO, NAO_SEI, TEXTURAS, texturaEfetiva } from '../logic/solo'
import { Icone } from './Icone'
import type { FormSolo } from './dados'

type Props = { form: FormSolo; onMudar: (f: FormSolo) => void }

const CARTOES: { k: Textura | typeof NAO_SEI; nome: string; dica: string; foto?: string; alt?: string }[] = [
  ...(Object.entries(TEXTURAS) as [Textura, (typeof TEXTURAS)[Textura]][]).map(([k, t]) => ({ k, ...t })),
  { k: NAO_SEI, nome: 'Não sei', dica: 'Usamos o solo mais comum da região' },
]

export function PassoSolo({ form, onMudar }: Props) {
  const tex = texturaEfetiva(form.textura, form.analise, form.texturaManual)
  const analise = form.analise

  return (
    <>
      <section aria-labelledby="ob-tex-h">
        <div className="ob-tex-h">
          <h3 id="ob-tex-h">Como é a terra desse talhão?</h3>
          {tex.peloLaudo && <span className="ob-tex">Pelo laudo · {analise?.arg} % de argila</span>}
        </div>
        <p className="ob-cinza">Pegue um punhado de terra úmida e aperte na mão.</p>
        <div className="ob-sgrid" role="radiogroup" aria-labelledby="ob-tex-h">
          {CARTOES.map(c => {
            const on = tex.textura === c.k
            return (
              <button key={c.k} className={`ob-scard${on ? ' on' : ''}`} type="button" role="radio" aria-checked={on}
                onClick={() => onMudar({ ...form, textura: c.k, texturaManual: true })}>
                {c.foto
                  ? <img className="ob-sph" src={c.foto} alt={c.alt} />
                  : <span className="ob-sph ob-sph-ic"><Icone id="i-pin" /></span>}
                <span className="ob-sct"><b>{c.nome}</b><small>{c.dica}</small></span>
                <span className="ob-sck" aria-hidden="true">{on && <Icone id="i-check" />}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="ob-well" aria-labelledby="ob-ana-h">
        <div className="ob-tex-h">
          <h3 id="ob-ana-h">Tem análise de solo?</h3>
          <span className="ob-cinza">Opcional</span>
        </div>
        {!analise ? (
          <>
            <p className="ob-cinza">Com o laudo, as sugestões levam em conta a acidez, o fósforo e o potássio.</p>
            <div className="ob-row ob-esq">
              <button className="ob-btn" type="button" onClick={() => onMudar({ ...form, analise: {}, texturaManual: false })}>
                <Icone id="i-pencil" />Digitar valores
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ob-frm ob-laudo">
              {CAMPOS_LAUDO.map(c => (
                <FragmentoCampo key={c.k} {...c} valor={analise[c.k] ?? ''}
                  onMudar={v => onMudar({
                    ...form,
                    analise: { ...analise, [c.k]: v },
                    // Mudar a argila volta a deixar o laudo decidir a textura.
                    texturaManual: c.k === 'arg' ? false : form.texturaManual,
                  })} />
              ))}
            </div>
            <button className="ob-lnk" type="button" onClick={() => onMudar({ ...form, analise: null, texturaManual: true })}>
              Remover análise
            </button>
          </>
        )}
      </section>
    </>
  )
}

function FragmentoCampo({ k, nome, sub, unidade, exemplo, valor, onMudar }:
  (typeof CAMPOS_LAUDO)[number] & { valor: string; onMudar: (v: string) => void }) {
  const id = `ob-${k}`
  return (
    <>
      <label className="ob-l" htmlFor={id}>{nome}<small>{sub}</small></label>
      <span className="ob-tf ob-num">
        <input id={id} type="text" inputMode="decimal" placeholder={exemplo} value={valor} onChange={e => onMudar(e.target.value)} />
        <span className="ob-u">{unidade}</span>
      </span>
    </>
  )
}
