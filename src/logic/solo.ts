// Do que o agricultor sabe do solo (textura no tato, análise de solo) para as entradas da simulação.
// Portado de entressafras/src/domain/soil/laudo.js.
// Limites para o Cerrado: Sousa & Lobato (eds.), "Cerrado: correção do solo e adubação", Embrapa, 2004.
import type { AnaliseSolo, CampoLaudo, Textura } from '../types'
import { t } from '../i18n'

export const TEXTURAS: Record<Textura, { nome: string; dica: string; classe: string; foto: string; alt: string }> = {
  argiloso: { nome: 'Argiloso', dica: 'Molhada, faz uma fita na mão', classe: 'latossolo_vermelho', foto: '/onboarding/solo_argiloso.jpg', alt: 'Mão segurando uma bola de terra avermelhada, lisa e firme' },
  medio: { nome: 'Médio', dica: 'Faz bolinha, mas quebra', classe: 'latossolo_vermelho_amarelo', foto: '/onboarding/solo_medio.jpg', alt: 'Mão segurando terra marrom em torrões que se desfazem' },
  arenoso: { nome: 'Arenoso', dica: 'Esfarela e é áspera', classe: 'neossolo_quartzarenico', foto: '/onboarding/solo_arenoso.jpg', alt: 'Mão segurando areia clara que escorre entre os dedos' },
}
/** "Não sei": o solo mais comum das lavouras do Cerrado. */
export const CLASSE_PADRAO = 'latossolo_vermelho'
export const NAO_SEI = 'naosei'

export const CAMPOS_LAUDO: { k: CampoLaudo; nome: string; sub: string; unidade: string; exemplo: string }[] = [
  { k: 'ph', nome: 'pH', sub: 'em CaCl₂', unidade: '', exemplo: '5,5' },
  { k: 'mo', nome: 'Matéria orgânica', sub: 'MO', unidade: 'g/dm³', exemplo: '25' },
  { k: 'p', nome: 'Fósforo', sub: 'P (Mehlich)', unidade: 'mg/dm³', exemplo: '15' },
  { k: 'k', nome: 'Potássio', sub: 'K', unidade: 'cmolc/dm³', exemplo: '0,20' },
  { k: 'v', nome: 'Saturação por bases', sub: 'V', unidade: '%', exemplo: '50' },
  { k: 'arg', nome: 'Argila', sub: 'define a textura', unidade: '%', exemplo: '35' },
]

/** Aceita vírgula decimal. Vazio ou inválido → null. */
export function lerNumero(txt: string | null | undefined): number | null {
  if (txt === null || txt === undefined || txt.trim() === '') return null
  const n = parseFloat(txt.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const classeDaTextura = (tx: Textura | null) => (tx ? TEXTURAS[tx].classe : CLASSE_PADRAO)

/** Embrapa: arenosa < 15 %, média 15–35 %, argilosa > 35 %. */
export function texturaDaArgila(arg: number | null): Textura | null {
  if (arg === null) return null
  return arg > 35 ? 'argiloso' : arg >= 15 ? 'medio' : 'arenoso'
}

type Nivel = 'baixa' | 'media' | 'alta'
function classeFosforo(p: number, arg: number | null): Nivel {
  const [baixo, medio] = arg === null ? [5, 8] : arg <= 15 ? [20, 30] : arg <= 35 ? [12, 18] : arg <= 60 ? [5, 8] : [3, 4]
  return p <= baixo ? 'baixa' : p <= medio ? 'media' : 'alta'
}
const classePotassio = (k: number): Nivel => (k <= 0.064 ? 'baixa' : k <= 0.128 ? 'media' : 'alta')
const PIOR: Record<Nivel, number> = { baixa: 0, media: 1, alta: 2 }

/** Acidez e fertilidade a partir do laudo; só responde o que o laudo permite. */
export function respostasDoLaudo(analise: AnaliseSolo | null): { acidez?: Nivel; fertilidade?: Nivel } {
  if (!analise) return {}
  const n = Object.fromEntries(CAMPOS_LAUDO.map(c => [c.k, lerNumero(analise[c.k])])) as Record<CampoLaudo, number | null>
  const out: { acidez?: Nivel; fertilidade?: Nivel } = {}
  if (n.v !== null || n.ph !== null) {
    const alta = (n.v !== null && n.v < 35) || (n.ph !== null && n.ph < 4.6)
    const media = (n.v !== null && n.v < 50) || (n.ph !== null && n.ph < 5.0)
    out.acidez = alta ? 'alta' : media ? 'media' : 'baixa'
  }
  const fp = n.p !== null ? classeFosforo(n.p, n.arg) : null
  const fk = n.k !== null ? classePotassio(n.k) : null
  const niveis = [fp, fk].filter((x): x is Nivel => x !== null)
  if (niveis.length) out.fertilidade = niveis.sort((a, b) => PIOR[a] - PIOR[b])[0]
  return out
}

/** Textura que vale: a argila do laudo manda, a menos que o agricultor tenha escolhido o cartão depois. */
export function texturaEfetiva(
  escolhida: Textura | typeof NAO_SEI | null,
  analise: AnaliseSolo | null,
  manual: boolean,
): { textura: Textura | typeof NAO_SEI | null; peloLaudo: boolean } {
  const pelo = analise && !manual ? texturaDaArgila(lerNumero(analise.arg)) : null
  return { textura: pelo ?? escolhida, peloLaudo: !!pelo }
}

/** Rótulo para a Sidebar. */
export function rotuloSolo(s: { textura: Textura | null; texturaInformada: boolean; texturaPeloLaudo: boolean }) {
  if (!s.textura) return s.texturaInformada ? '—' : t('Padrão da região')
  const nome = t(TEXTURAS[s.textura].nome)
  return s.texturaPeloLaudo ? t('{textura} (laudo)', { textura: nome }) : nome
}
