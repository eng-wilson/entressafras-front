// Linha de rascunho "Nova rotação": primeira linha do board, com título, selo de ranking, status, ações,
// trilho de edição, menu de culturas e o menu Trocar/Remover. Os números vêm do POST /api/rotations/simulate.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './rascunho.css'
import { PERFIS } from '../../data/perfis'
import type { EditorRascunho } from '../../hooks/useRascunho'
import type { EstadoSimulaveis } from '../../hooks/useCulturasSimulaveis'
import {
  adicionar, catalogoRascunho, cheio, MAX_CULTURAS, mensagemErro, N_DEC, posicaoRanking, remover, ROTULO_CLASSE,
  seloRanking, tituloRascunho, trocar,
} from '../../logic/rascunho'
import { CropTrack } from './CropTrack'
import { CropPicker, type ModoPicker } from './CropPicker'
import { lerSimulacao } from './leitura'
import { t } from '../../i18n'

type Props = {
  editor: EditorRascunho
  catalogo: EstadoSimulaveis & { recarregar: () => void }
  onSalvar: () => void
  /** Motivo de não poder salvar além da simulação (ex.: já há 3 salvas). */
  bloqueioSalvar?: string | null
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function DraftRow({ editor, catalogo, onSalvar, bloqueioSalvar }: Props) {
  const { rascunho: r, ano, sim } = editor
  const nomes = editor.nomes.map(n => t(n))
  const [picker, setPicker] = useState<ModoPicker | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const botaoAdd = useRef<HTMLButtonElement>(null)
  const titulo = useRef<HTMLDivElement>(null)

  const leitura = useMemo(() => lerSimulacao(r, sim), [r, sim])
  const sel = r.sel != null && r.culturas[r.sel] ? r.sel : null
  const cultSel = sel != null ? r.culturas[sel] : null
  const nomeTitulo = tituloRascunho(nomes)
  // Uma cultura já simula (seguida de pousio); só o rascunho vazio fica incompleto.
  const incompleto = r.culturas.length === 0
  const podeSalvar = sim.status === 'ok' && !bloqueioSalvar
  const maisPragas = r.culturas.length === 2 && PERFIS[r.culturas[1].code]?.pragas.nivel === 'Maior risco'
  const nomePorCodigo = (code: number) => nomes[r.culturas.findIndex(c => c.code === code)] ?? t('A cultura {code}', { code })

  // Foco no rascunho quando ele abre (e quando o + é clicado de novo).
  useEffect(() => { titulo.current?.focus() }, [])

  // O menu Trocar/Remover só volta a existir depois que o picker fecha: o foco vai para ele no quadro seguinte.
  const linha = useRef<HTMLDivElement>(null)
  const fecharPicker = useCallback(() => {
    const modo = picker
    setPicker(null)
    requestAnimationFrame(() => {
      const voltar = modo === 'add' ? botaoAdd.current : linha.current?.querySelector<HTMLButtonElement>('.callout button')
      voltar?.focus()
    })
  }, [picker])

  const itens = useMemo(() => {
    if (!catalogo.itens || !picker) return null
    const ultimo = r.culturas[r.culturas.length - 1]
    return catalogoRascunho(catalogo.itens).map(it => {
      if (picker === 'rep' && cultSel && it.code === cultSel.code) return { ...it, nota: t('Atual'), desabilitado: true }
      if (picker === 'add' && ultimo && ultimo.e >= N_DEC) return { ...it, nota: t('Não cabe na safra'), desabilitado: true }
      return it
    })
  }, [catalogo.itens, picker, r.culturas, cultSel])

  const subtituloAdd = r.culturas.length === 0
    ? t('Entra na data de plantio usual da região')
    : cheio(r) ? t('A safra está cheia') : t('Entra depois de {nome}', { nome: minuscula(nomes[r.culturas.length - 1] ?? '') })

  // Status agregado: pior cultura com dado; enquanto simula ou sem 2 culturas, o estado da simulação.
  const status = incompleto
    ? { cls: 'incompleto', dot: 'none', texto: t('Incompleta') }
    : sim.status === 'erro'
      ? { cls: 'erro', dot: 'risk', texto: t('Não simulou') }
      : leitura.pior.i < 0
        ? { cls: 'simulando', dot: 'none', texto: t('Simulando…') }
        : { cls: leitura.velho ? 'simulando' : leitura.pior.cls, dot: leitura.pior.cls, texto: leitura.velho ? t('Simulando…') : t('Clima {classe}', { classe: t(ROTULO_CLASSE[leitura.pior.cls]).toLowerCase() }) }

  const mostrarCallout = cultSel && !arrastando && !picker
  const meio = cultSel ? ((cultSel.s + cultSel.e) / 2 / N_DEC) * 100 : 0

  return (
    <div ref={linha} className={`row draft${mostrarCallout ? ' withmenu' : ''}`} role="group" aria-label={t('Nova rotação, rascunho')}>
      <div className="rh">
        <span className="rk" aria-hidden="true">+</span>
        <div className="nm" ref={titulo} tabIndex={-1} title={nomeTitulo}>
          {nomes.length ? nomes.map((n, i) => (
            <span key={i}>{i > 0 && <span className="then"> {t('depois')} </span>}{i === 0 ? n : minuscula(n)}</span>
          )) : t('Nova rotação')}
        </div>
        {leitura.ranking && (
          <span className={`rankb${leitura.ranking.recomendada ? '' : ' fora'}`} style={leitura.velho ? { opacity: .55 } : undefined}
            title={t('Posição entre {n} rotações comparadas: {pos}', { n: leitura.ranking.entre, pos: posicaoRanking(leitura.ranking.rank, leitura.ranking.entre) })}>
            {seloRanking(leitura.ranking.rank, leitura.ranking.recomendada)}
          </span>
        )}
        {maisPragas && (
          <span className="pest">
            <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-bug" /></svg>
            {t('Mais pragas')}
          </span>
        )}
        <span className={`dst ${status.cls}`}><span className={`dot ${status.dot}`} />{status.texto}</span>
        <div className="acts">
          {confirmar ? (
            <>
              <span className="q">{t('Descartar esta rotação?')}</span>
              <button type="button" className="tb perigo" onClick={editor.fechar}>{t('Descartar')}</button>
              <button type="button" className="tb" autoFocus onClick={() => setConfirmar(false)}>{t('Continuar editando')}</button>
            </>
          ) : (
            <>
              <button ref={botaoAdd} type="button" className="tb" aria-haspopup="dialog" aria-expanded={picker === 'add'}
                disabled={cheio(r)} title={r.culturas.length >= MAX_CULTURAS ? t('Máximo de 2 culturas por rotação') : undefined}
                onClick={() => setPicker(p => (p === 'add' ? null : 'add'))}>
                <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-plus" /></svg>
                {t('Cultura')}
              </button>
              <button type="button" className="tb" onClick={() => (editor.editado ? setConfirmar(true) : editor.fechar())}>{t('Cancelar')}</button>
              <button type="button" className="tb pri" disabled={!podeSalvar} onClick={onSalvar}
                title={bloqueioSalvar ?? (incompleto ? t('Adicione uma cultura') : sim.status !== 'ok' ? t('Aguarde a simulação') : undefined)}>
                {t('Salvar')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="dtrack">
        {r.culturas.length === 0 ? (
          <div className="vazio-tl">{t('Adicione a primeira cultura com “+ Cultura”.')}</div>
        ) : (
          <CropTrack
            rascunho={r} ano={ano} nomes={nomes} classes={leitura.classes} velho={leitura.velho}
            onChange={editor.mudar} onSelect={i => { editor.selecionar(i); setPicker(null) }} onArrasto={g => { setArrastando(!!g); editor.marcarArrasto(g) }}
            onRemover={i => editor.mudar(remover(r, i))}
          />
        )}

        {mostrarCallout && (
          <div className="callout" style={{ left: `${meio.toFixed(2)}%` }}>
            <button type="button" aria-haspopup="dialog" onClick={() => setPicker('rep')}>
              <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-swap" /></svg>
              {t('Trocar')}
            </button>
            <span className="csep" aria-hidden="true" />
            <button type="button" className="danger" onClick={() => editor.mudar(remover(r, sel!))}>
              <svg className="ic" aria-hidden="true"><use href="/canvas-icons.svg#i-x" /></svg>
              {t('Remover')}
            </button>
          </div>
        )}
      </div>

      {picker && (
        <CropPicker
          modo={picker}
          titulo={picker === 'add' ? t('Adicionar cultura') : t('Trocar {nome}', { nome: minuscula(nomes[sel ?? 0] ?? '') })}
          subtitulo={picker === 'add' ? subtituloAdd : t('Mantém o plantio e usa o ciclo da nova cultura')}
          itens={itens}
          erro={catalogo.status === 'erro'}
          onTentar={catalogo.recarregar}
          onFechar={fecharPicker}
          style={picker === 'rep' && cultSel ? { left: `min(${(cultSel.s / N_DEC * 100).toFixed(2)}%, 62%)` } : undefined}
          onEscolher={code => {
            editor.mudar(picker === 'add' ? adicionar(r, code) : trocar(r, sel ?? 0, code))
            setPicker(null)
          }}
        />
      )}

      {sim.status === 'erro' && sim.erro && (
        <p className="aviso" role="alert" style={{ marginTop: 10 }}>
          {mensagemErro(sim.erro.motivo, sim.erro.detalhe, nomePorCodigo)}
          {sim.erro.motivo !== 'parametros' && <button className="link" type="button" onClick={sim.recarregar}>{t('Tentar de novo')}</button>}
        </p>
      )}
    </div>
  )
}
