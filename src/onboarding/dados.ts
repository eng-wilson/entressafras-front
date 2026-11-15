// Formulário da janela de etapas ↔ dados do talhão.
import type { AnaliseSolo, Contorno, DadosTalhao, RegistroSafra, Talhao, Textura } from '../types'
import { areaHa, centroide } from '../logic/geo'
import { NAO_SEI, lerNumero, texturaEfetiva } from '../logic/solo'
import { rotuloSafra, ultimaSafra } from '../logic/historico'
import { t } from '../i18n'

export type EscolhaTextura = Textura | typeof NAO_SEI | null
export type FormSolo = { textura: EscolhaTextura; texturaManual: boolean; analise: AnaliseSolo | null }
export type Form = FormSolo & { nome: string; registro: RegistroSafra | null }

export function formDe(t: Talhao | null | undefined): Form {
  if (!t) return { nome: '', textura: null, texturaManual: false, analise: null, registro: null }
  return {
    nome: t.nome,
    textura: t.textura ?? (t.texturaInformada ? null : NAO_SEI),
    texturaManual: !t.texturaPeloLaudo,
    analise: t.analise ? { ...t.analise } : null,
    registro: null,
  }
}

export function dadosDo(f: Form, contorno: Contorno, talhao?: Talhao | null, hoje = new Date()): DadosTalhao {
  const tex = texturaEfetiva(f.textura, f.analise, f.texturaManual)
  const r = f.registro
  const temAnalise = !!f.analise && Object.values(f.analise).some(v => lerNumero(v) !== null)
  return {
    nome: f.nome.trim() || t('Talhão'),
    contorno,
    areaHa: areaHa(contorno),
    centro: centroide(contorno),
    textura: tex.textura === NAO_SEI ? null : tex.textura,
    texturaInformada: tex.textura !== NAO_SEI,
    texturaPeloLaudo: tex.peloLaudo,
    analise: temAnalise ? f.analise : null,
    // Na edição o histórico não aparece: mantém o que já havia.
    historico: talhao ? talhao.historico : r && (r.c1 || r.c2) ? { [rotuloSafra(ultimaSafra(hoje))]: r } : null,
  }
}
