// Histórico de safras do talhão: o que foi plantado em cada ano agrícola (1ª safra de verão, 2ª safra).
// Portado de entressafras/src/domain/historico.js (sem a parte de simulação).
import { CULTURAS } from '../data/culturas'
import type { Historico, RegistroSafra } from '../types'
import { t } from '../i18n'

export const NAO_PLANTEI = 'nao_plantei'
export const GRUPOS_CULTURA: [string, string[]][] = [
  ['Grãos', ['soja', 'milho', 'feijao', 'arroz', 'sorgo', 'trigo', 'algodao']],
  ['Cobertura do solo', ['milheto', 'brizantha_marandu', 'brizantha_piata', 'brizantha_paiaguas', 'ruziziensis', 'crotalaria_spectabilis', 'crotalaria_juncea', 'crotalaria_ochroleuca']],
]
/** Mais comuns no Cerrado. */
export const SUGESTOES = { c1: ['soja', 'milho', 'algodao'], c2: ['milho', 'sorgo', 'milheto', NAO_PLANTEI] } as const
export const PRAGAS = ['Lagarta', 'Percevejo', 'Cigarrinha', 'Mosca-branca', 'Nematoide', 'Outra']

export const rotuloSafra = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`
/** Ano agrícola de julho a junho: de julho em diante, a safra que começa neste ano é a que se planeja agora. */
export const safraPlanejada = (hoje = new Date()) => (hoje.getMonth() >= 6 ? hoje.getFullYear() : hoje.getFullYear() - 1)
export const ultimaSafra = (hoje = new Date()) => safraPlanejada(hoje) - 1
/** Ano de início de um rótulo de safra: '2024/25' → 2024. */
export const anoDaSafra = (rotulo: string) => parseInt(rotulo.slice(0, 4), 10)
/** As duas safras do ano registradas. */
export const completo = (r: RegistroSafra | null | undefined) => !!(r && r.c1 && r.c2)
/** Situação de um ano no histórico: as duas safras, só uma ou nenhuma. */
export const statusSafra = (r: RegistroSafra | null | undefined) =>
  completo(r) ? t('Completa') : r && (r.c1 || r.c2) ? t('1 de 2') : t('Vazia')

export const ehOutra = (v: string | null | undefined): v is string => typeof v === 'string' && v.startsWith('outra:')
export const outra = (nome: string) => `outra:${nome.trim()}`

export function nomeCultura(v: string | null | undefined): string {
  if (!v) return ''
  if (v === NAO_PLANTEI) return t('Não plantei')
  if (ehOutra(v)) return v.slice(6)
  return CULTURAS[v] ? t(CULTURAS[v].nome) : v
}

/** Unidade de produtividade (só grãos pedem produtividade). */
export const unidadeDe = (v: string | null | undefined) => (v && CULTURAS[v]?.grupo === 'grao' ? CULTURAS[v].unidade : null)

/** Registro mais recente com a 1ª safra. */
export function registroMaisRecente(historico: Historico | null | undefined) {
  if (!historico) return null
  const anos = Object.keys(historico).filter(k => historico[k]?.c1).sort()
  const safra = anos.at(-1)
  return safra ? { safra, registro: historico[safra] } : null
}

/** "Soja, milho" (sem "Não plantei"); '' sem registro. */
export function resumoSafra(r: RegistroSafra | null | undefined): string {
  if (!r) return ''
  const nomes = [r.c1, r.c2].filter(c => c && c !== NAO_PLANTEI).map(nomeCultura)
  return nomes.map((n, i) => (i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1))).join(', ')
}

/** Normaliza para busca sem acento. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
