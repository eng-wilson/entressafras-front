// "De onde vêm estes números" de uma safra: mostra os dados que a API entrega (risco hídrico, fase crítica,
// ISNA médio, estágios, Kc) e o clima por decêndio. O front não calcula risco: só exibe o que veio.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { SEM_CRITERIO, detalheApi, faixaAnos } from '../logic/aptidao'
import type { Resiliencia, ResSafra } from '../logic/resiliencia'
import { FONTE_FASES, FONTE_FASES_API, FONTE_KC_API, NOME_FASE, type Fonte } from '../data/zarc'
import { janelaLabel } from '../logic/periodo'

const ROMANO = ['I', 'II', 'III', 'IV'] as const

const n0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const mm = (v: number | null) => (v == null ? '—' : `${n0.format(v)} mm`)
const pct = (v: number | null) => (v == null ? '—' : `${n0.format(v * 100)}%`)

function Link({ f }: { f: Fonte }) {
  return <a href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a>
}

type Props = { s: ResSafra; n: 0 | 1; rotacao: string; res: Resiliencia; onFechar: () => void }

export function MemoriaCalculo({ s, n, rotacao, res, onFechar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialogo.current!
    el.showModal()
    return () => el.close()
  }, [])

  const { kc, fases, fonteFases, decendios } = s.calc
  const r = s.risco
  const f = s.anos != null ? faixaAnos(s.anos) : null
  const papel = n === 0 ? '1ª safra' : s.cobertura ? '2ª safra (cobertura)' : '2ª safra'

  return createPortal(
    <dialog className="culturas-dialog mc" ref={dialogo} aria-labelledby="mc-titulo" onClose={e => { if (!e.currentTarget.open) onFechar() }}>
      <header>
        <div>
          <h2 id="mc-titulo">De onde vêm os números: {s.nome}</h2>
          <p className="mc-sub">{papel} de {rotacao} · {janelaLabel(s.de, s.ate)}</p>
        </div>
        <button className="tbtn" type="button" onClick={onFechar}>Fechar</button>
      </header>

      {r && f ? (
        <p className={`mc-res ${f.cls}`}>
          <b>Risco hídrico: {r.pct}%</b> ({f.rotulo.toLowerCase()} em resiliência climática). {detalheApi(s)}
        </p>
      ) : (
        <p className="mc-res nd"><b>Risco hídrico: sem dado.</b> {SEM_CRITERIO}</p>
      )}
      <p className="mc-mock">
        O risco, a fase crítica, o ISNA, os estágios e o Kc vêm da API Entressafras; a tela não faz conta própria de risco.
        {r?.metodo === 'MOCK' && ' Hoje o servidor marca o risco como MOCK: são valores provisórios, iguais para qualquer talhão.'}
      </p>

      <ol className="mc-passos">
        {r && (
          <li>
            <h3>Risco calculado pela API</h3>
            <p>
              Método: {r.metodo === 'MOCK' ? 'MOCK (provisório)' : 'FAO-56 simplificado com Ky (FAO-33)'}. Safras históricas usadas: {r.anosValidos}.
              {' '}Uma safra conta como crítica quando a perda por falta de água passa de {r.limiar}%.
              {r.perda != null && <> Perda média estimada: {r.perda}%.</>}
              {r.fase != null && <> Fase com o maior déficit: <b>{ROMANO[r.fase]} · {NOME_FASE[r.fase].toLowerCase()}</b>.</>}
            </p>
            <div className="mc-tab">
              <table>
                <thead>
                  <tr>{NOME_FASE.map((_, i) => <th key={i} scope="col">ISNA médio · fase {ROMANO[i]}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>{r.isna.map((v, i) => <td key={i} className={i === r.fase ? 'abaixo' : undefined}>{pct(v)}</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="mc-nota">ISNA = água que a cultura usou ÷ água de que precisava, na média das safras históricas.</p>
          </li>
        )}

        <li>
          <h3>Fases no calendário</h3>
          <p>
            {janelaLabel(s.de, s.ate)}: {decendios.length} decêndios, com as datas de plantio e colheita da rotação recomendada.
            {' '}Fases: {NOME_FASE.map((nm, i) => `${ROMANO[i]} ${nm.toLowerCase()} (${pct(fases[i])})`).join(', ')}.
            {' '}{fonteFases === 'api'
              ? <>Proporção dos estágios FAO-56 da cultura. Fonte: <Link f={FONTE_FASES_API} />.</>
              : <>A API não trouxe os estágios desta cultura; proporção padrão da <Link f={FONTE_FASES} />.</>}
          </p>
        </li>

        <li>
          <h3>Consumo de água no ciclo</h3>
          <p>
            Em cada decêndio, consumo = <b>Kc × ET0</b>, os dois da API.
            {kc
              ? <> Kc de {n2.format(kc[0])} na fase I, sobe na II até {n2.format(kc[1])} na III e desce até {n2.format(kc[2])} no fim. Fonte: <Link f={FONTE_KC_API} />.</>
              : ' A API não trouxe o Kc desta cultura: o consumo fica sem dado.'}
            {res.fonte ? ` Clima: ${res.fonte}, média de ${res.nSafras} safras (${res.periodo}).` : ' O clima do talhão ainda não carregou.'}
          </p>
          <div className="mc-tab">
            <table>
              <thead>
                <tr>
                  <th scope="col">Decêndio</th>
                  <th scope="col">Fase</th>
                  <th scope="col">Chuva média</th>
                  <th scope="col">Chuva em ano seco*</th>
                  <th scope="col">ET0</th>
                  <th scope="col">Kc</th>
                  <th scope="col">Consumo</th>
                </tr>
              </thead>
              <tbody>
                {decendios.map(d => (
                  <tr key={d.idx} className={r?.fase === d.fase ? 'crit' : undefined}>
                    <th scope="row">{d.rotulo}</th>
                    <td>{ROMANO[d.fase]}</td>
                    <td>{mm(d.chuvaMedia)}</td>
                    <td>{mm(d.chuvaP20)}</td>
                    <td>{mm(d.et0)}</td>
                    <td>{d.kc == null ? '—' : n2.format(d.kc)}</td>
                    <td>{mm(d.consumo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td />
                  <td>{mm(s.chuva)}</td>
                  <td />
                  <td />
                  <td />
                  <td>{mm(s.consumo)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mc-nota">* Chuva superada em 8 de cada 10 anos. Linhas destacadas: a fase crítica apontada pela API.</p>
          {res.aviso && <p className="mc-nota">{res.aviso}</p>}
        </li>
      </ol>
    </dialog>,
    document.body,
  )
}
