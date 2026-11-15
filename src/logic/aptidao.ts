import type { CTRow, RotacaoDef } from '../data/mock'
import type { Priority } from '../types'
import { nivelZarc } from '../data/zarc'
import type { ResRotacao, ResSafra } from './resiliencia'
import { classeAnos } from './status'

export type Eixo = keyof Priority

// O piso de 12 evita que a pior rotação de um eixo desapareça no centro do mapa.
export const PISO = 12
const EIXOS_MOCK = ['agua', 'solo'] as const

/** Posição no mapa da resiliência (escala fixa): 10 pontos por ano, em 10, em que a safra atendeu ao ZARC. */
export const notaAnos = (anos: number) => anos * 10

/**
 * Nota 0–100 por eixo.
 * - Resiliência: escala fixa (10 por ano), null enquanto o clima não chega.
 * - Produtividade: proporcional à receita da melhor rotação (100 = maior R$/ha).
 * - Água e solo: SCORE (mock), relativa: 100 = melhor e 12 = pior entre as rotações.
 */
export function aptidao(i: number, rot: ResRotacao | null, rots: RotacaoDef[]): Record<Eixo, number | null> {
  const r = rots[i]
  const maior = Math.max(...rots.map(x => receitaHa(x.ct)))
  const out: Record<Eixo, number | null> = {
    risco: rot?.anos != null ? Math.max(PISO, notaAnos(rot.anos)) : null,
    agua: 0,
    solo: 0,
    prod: maior > 0 ? Math.max(PISO, Math.round((100 * receitaHa(r.ct)) / maior)) : PISO,
  }
  for (const k of EIXOS_MOCK) {
    const v = rots.map(x => x[k])
    const min = Math.min(...v)
    const max = Math.max(...v)
    out[k] = max === min ? 100 : Math.round(PISO + ((100 - PISO) * (max - r[k])) / (max - min))
  }
  return out
}

// Nome de cada eixo: todos femininos e no sentido "mais = melhor"
export const NOME_EIXO: Record<Eixo, string> = {
  risco: 'Resiliência climática',
  agua: 'Economia de água',
  solo: 'Saúde do solo',
  prod: 'Produtividade',
}

export type Faixa = { nivel: 1 | 2 | 3; rotulo: 'Fraca' | 'Média' | 'Ótima'; cls: 'risk' | 'warn' | 'good' }

export function faixa(v: number): Faixa {
  if (v >= 70) return { nivel: 3, rotulo: 'Ótima', cls: 'good' }
  if (v >= 40) return { nivel: 2, rotulo: 'Média', cls: 'warn' }
  return { nivel: 1, rotulo: 'Fraca', cls: 'risk' }
}

/** Faixa da resiliência pelos níveis de risco do ZARC: 8+ anos = Ótima (20%), 6–7 = Média (30–40%), até 5 = Fraca. */
export function faixaAnos(anos: number): Faixa {
  const cls = classeAnos(anos)
  return cls === 'good' ? { nivel: 3, rotulo: 'Ótima', cls } : cls === 'warn' ? { nivel: 2, rotulo: 'Média', cls } : { nivel: 1, rotulo: 'Fraca', cls }
}

/** "risco 20% no ZARC" ou "acima do risco aceito pelo ZARC (40%)". */
export function textoNivel(anos: number): string {
  const n = nivelZarc(anos)
  return n ? `risco ${n}% no ZARC` : 'acima do risco aceito pelo ZARC (40%)'
}

const REAIS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const numero = (s: string) => {
  const n = Number(s.replace(/[^\d,]/g, '').replace(',', '.'))
  return s && /\d/.test(s) ? n : 0
}

/** Receita ilustrativa da rotação: produção × preço das duas safras (o que não é vendido conta 0). */
export function receitaHa(r: CTRow): number {
  return numero(r.y1) * numero(r.p1) + numero(r.y2) * numero(r.p2)
}

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Safra que menos vezes teve chuva suficiente (ou a sem critério): é ela que puxa a resiliência da rotação. */
export const safraLimitante = (rot: ResRotacao): ResSafra =>
  rot.safras.reduce((a, b) => ((b.anos ?? -1) < (a.anos ?? -1) ? b : a))

/** Receita ilustrativa de uma safra (0 = 1ª, 1 = 2ª): sacas × preço; o que não é vendido conta 0. */
export function receitaSafra(r: CTRow, n: 0 | 1): number {
  return n === 0 ? numero(r.y1) * numero(r.p1) : numero(r.y2) * numero(r.p2)
}

export const reais = (v: number) => `R$ ${REAIS.format(v)}/ha`

const provisorio = (s: ResSafra) => (s.risco?.metodo === 'MOCK' ? ', provisório' : '')

/** "milho safrinha: risco hídrico de 30% (API, provisório)"; sem risco, "algodão: sem risco da API". */
export const motivoSafra = (s: ResSafra) => `${minuscula(s.nome)}: ${resultadoSafra(s)}`

/** Resultado curto de uma safra: "risco hídrico de 30% (API)" ou "sem risco da API". */
export const resultadoSafra = (s: ResSafra) =>
  s.risco ? `risco hídrico de ${s.risco.pct}% (API${provisorio(s)})` : 'sem risco da API'

/** Safra sem risco na resposta da API: a tela não estima nada no lugar. */
export const SEM_CRITERIO = 'A API não trouxe o risco hídrico desta cultura; a tela não faz estimativa própria.'

/** Explicação do risco que veio da API, com a ressalva quando o servidor ainda o marca como MOCK. */
export function detalheApi(s: ResSafra): string {
  const r = s.risco!
  const perda = r.perda != null ? ` A perda média estimada por falta de água é de ${r.perda}%.` : ''
  const mock = r.metodo === 'MOCK' ? ' Atenção: o servidor ainda marca este valor como MOCK (provisório, não calculado com o clima do talhão).' : ''
  return `Risco hídrico de ${minuscula(s.nome)} calculado pela API Entressafras: em ${r.pct}% das ${r.anosValidos} safras históricas a perda por falta de água passou de ${r.limiar}%.` +
    `${perda} Leitura pela régua do ZARC: ${textoNivel(s.anos!)}.${mock}`
}

/** Explicação completa (tooltip) da resiliência de uma safra. */
export function detalheSafra(s: ResSafra): string {
  return s.risco && s.anos != null ? detalheApi(s) : `${s.nome}: ${SEM_CRITERIO}`
}

/** Frase curta que explica a nota do eixo; null quando ainda não há dado para explicar. */
export function motivo(r: RotacaoDef, k: Eixo, rot: ResRotacao | null): string | null {
  if (k === 'risco') return rot ? motivoSafra(safraLimitante(rot)) : 'aguardando as rotações'
  if (k === 'solo') return minuscula(r.ct.soilWhy)
  if (k === 'prod') return reais(receitaHa(r.ct))
  return null
}

/** Explicação completa (tooltip) de onde vem o motivo; null quando o motivo curto já basta. */
export function motivoDetalhe(k: Eixo, rot: ResRotacao | null): string | null {
  if (k !== 'risco' || !rot) return null
  return detalheSafra(safraLimitante(rot))
}

// Cor fixa por rotação (posição no conjunto), usada no mapa e na caixa de seleção da tabela.
// A rotação atual é desenhada tracejada.
export const COR_ROT = ['#0A64D6', '#1B9E3E', '#E07A00', '#3A3A3C']
export const nomeRot = (r: RotacaoDef) => `${r.ct.c1} → ${r.ct.c2}`
