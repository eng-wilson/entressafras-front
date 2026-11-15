// Solo do talhão sem voltar ao onboarding: nome, textura e análise de solo numa folha modal.
// Mudar o lugar do talhão (redesenhar o contorno) continua no mapa, por um botão no fim da folha.
import { useState } from 'react'
import type { DadosTalhao, Talhao } from '../types'
import { fmtCoord, fmtHa } from '../logic/geo'
import { texturaEfetiva } from '../logic/solo'
import { PassoSolo } from '../onboarding/PassoSolo'
import { dadosDo, formDe, type Form } from '../onboarding/dados'
import { Icone } from '../onboarding/Icone'
import { Folha } from './Folha'

type Props = {
  talhao: Talhao
  onSalvar: (d: DadosTalhao) => void
  onCancelar: () => void
  /** Abre o mapa para redesenhar o contorno (muda localização e área). */
  onMudarLocal: () => void
}

export function SoloModal({ talhao, onSalvar, onCancelar, onMudarLocal }: Props) {
  const [f, setF] = useState<Form>(() => formDe(talhao))
  const tex = texturaEfetiva(f.textura, f.analise, f.texturaManual)
  const pode = !!tex.textura && !!f.nome.trim()

  return (
    <Folha titulo="Solo do talhão" largura={640} podeSalvar={pode} onCancelar={onCancelar}
      onSalvar={() => pode && onSalvar(dadosDo(f, talhao.contorno, talhao))}>
      <div className="fo-sec">
        <h3 className="fo-sh">Talhão</h3>
        <div className="fo-grp fo-lin">
          <label htmlFor="solo-nome">Nome</label>
          <input id="solo-nome" type="text" maxLength={24} autoComplete="off" value={f.nome}
            onChange={e => setF({ ...f, nome: e.target.value })} />
        </div>
      </div>

      <div className="fo-sec">
        <div className="fo-grp">
          <PassoSolo form={f} onMudar={s => setF({ ...f, ...s })} />
        </div>
        {!tex.textura && <p className="fo-nota">Escolha a textura para salvar.</p>}
      </div>

      <div className="fo-sec">
        <h3 className="fo-sh">Localização</h3>
        <div className="fo-grp fo-lin">
          <span className="fo-local">
            <Icone id="i-pin" />
            <span>{talhao.local || fmtCoord(talhao.centro)}<small>{fmtHa(talhao.areaHa)}</small></span>
          </span>
          <button className="fo-lnk" type="button" onClick={onMudarLocal}>Mudar no mapa</button>
        </div>
        <p className="fo-nota">Redesenhar o contorno muda a localização e a área. Solo e histórico continuam.</p>
      </div>
    </Folha>
  )
}
