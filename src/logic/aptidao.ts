import type { CTRow, RotacaoDef } from '../data/mock'
import type { Priority, RotationCrop } from '../types'
import type { ResRotacao, ResSafra } from './resiliencia'
import { numero as fmtNumero, pctFmt, t, usdFmt } from '../i18n'

export type Eixo = keyof Priority

// O piso de 12 evita que a pior rotação de um eixo desapareça no centro do mapa.
export const PISO = 12

/** Escala da API (0–100, absoluta) na posição do mapa, com o piso para o ponto não sumir no centro. */
const doApi = (v: number | null | undefined) => (v == null ? null : Math.max(PISO, Math.round(v)))

/** Mock relativo (menor = melhor): 100 à melhor rotação e o piso à pior. Só no conjunto local, sem `scores`. */
function relativa(k: 'solo', r: RotacaoDef, rots: RotacaoDef[]) {
  const v = rots.map(x => x[k])
  const min = Math.min(...v)
  const max = Math.max(...v)
  return max === min ? 100 : Math.round(PISO + ((100 - PISO) * (max - r[k])) / (max - min))
}

/**
 * Nota 0–100 por eixo. Com a resposta da API (`scores`), os quatro eixos são dela, em escala absoluta:
 * - Resiliência = `water_security` (% de safras sem perda crítica, pior cultura).
 * - Produtividade = `productivity` (100 − perda estimada por falta de água).
 * - Saúde do solo = `soil_protection` (cobertura viva e troca de família botânica).
 * - Faturamento = `revenue` (faturamento de referência com desconto hídrico ÷ teto do catálogo).
 * Sem `scores` (conjunto local dos testes): resiliência pela segurança hídrica, produtividade e faturamento
 * pela receita ilustrativa e solo pelo mock.
 */
export function aptidao(i: number, rot: ResRotacao | null, rots: RotacaoDef[]): Record<Eixo, number | null> {
  const r = rots[i]
  if (r.scores) {
    return {
      risco: doApi(r.scores.water_security), fat: doApi(r.scores.revenue),
      solo: doApi(r.scores.soil_protection), prod: doApi(r.scores.productivity),
    }
  }
  const maior = Math.max(...rots.map(x => receitaHa(x.ct)))
  const receita = maior > 0 ? Math.max(PISO, Math.round((100 * receitaHa(r.ct)) / maior)) : PISO
  return {
    risco: rot?.seguranca != null ? Math.max(PISO, rot.seguranca) : null,
    fat: receita,
    solo: relativa('solo', r, rots),
    prod: receita,
  }
}

// Nome de cada eixo: todos femininos e no sentido "mais = melhor"
export const NOME_EIXO: Record<Eixo, string> = {
  risco: 'Resiliência climática',
  fat: 'Faturamento',
  solo: 'Saúde do solo',
  prod: 'Produtividade',
}

export type Faixa = { nivel: 1 | 2 | 3; rotulo: 'Fraca' | 'Média' | 'Ótima'; cls: 'risk' | 'warn' | 'good' }

export function faixa(v: number): Faixa {
  if (v >= 70) return { nivel: 3, rotulo: 'Ótima', cls: 'good' }
  if (v >= 40) return { nivel: 2, rotulo: 'Média', cls: 'warn' }
  return { nivel: 1, rotulo: 'Fraca', cls: 'risk' }
}

/** Faixa de uma nota 0–100 no mapa, nos cards e no painel: a mesma régua para as 4 prioridades. null = sem dado. */
export const faixaDaNota = (v: number | null): Faixa | null => (v == null ? null : faixa(v))

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
  rot.safras.reduce((a, b) => ((b.seguranca ?? -1) < (a.seguranca ?? -1) ? b : a))

/** Receita ilustrativa de uma safra (0 = 1ª, 1 = 2ª): sacas × preço; o que não é vendido conta 0. */
export function receitaSafra(r: CTRow, n: 0 | 1): number {
  return n === 0 ? numero(r.y1) * numero(r.p1) : numero(r.y2) * numero(r.p2)
}

export const reais = (v: number) => `R$ ${fmtNumero(v, { maximumFractionDigits: 0 })}/ha`

/** "milho safrinha: risco hídrico de 30% (API, provisório)"; sem risco, "algodão: sem risco da API". */
export const motivoSafra = (s: ResSafra) => `${minuscula(t(s.nome))}: ${resultadoSafra(s)}`

/** Resultado curto de uma safra: "risco hídrico de 30% (API)" ou "sem risco da API". */
export const resultadoSafra = (s: ResSafra) =>
  !s.risco ? t('sem risco da API')
    : s.risco.metodo === 'MOCK' ? t('risco hídrico de {pct}% (API, provisório)', { pct: pctFmt(s.risco.pct) })
      : t('risco hídrico de {pct}% (API)', { pct: pctFmt(s.risco.pct) })

/** Safra sem risco na resposta da API: a tela não estima nada no lugar. */
export const SEM_CRITERIO = 'A API não trouxe o risco hídrico desta cultura; a tela não faz estimativa própria.'

/** Explicação do risco que veio da API, com a ressalva quando o servidor ainda o marca como MOCK. */
export function detalheApi(s: ResSafra): string {
  const r = s.risco!
  return [
    t('Risco hídrico de {cultura} calculado pela API Entressafras: em {pct}% das {safras} safras históricas a perda por falta de água passou de {limiar}%.',
      { cultura: minuscula(t(s.nome)), pct: pctFmt(r.pct), safras: r.anosValidos, limiar: r.limiar }),
    r.perda != null ? t('A perda média estimada por falta de água é de {perda}%.', { perda: pctFmt(r.perda) }) : '',
    t('Segurança hídrica: {nota} de 100 ({faixa}).', { nota: s.seguranca!, faixa: t(faixa(s.seguranca!).rotulo).toLowerCase() }),
    r.metodo === 'MOCK' ? t('Atenção: o servidor ainda marca este valor como MOCK (provisório, não calculado com o clima do talhão).') : '',
  ].filter(Boolean).join(' ')
}

/** Explicação completa (tooltip) da resiliência de uma safra. */
export function detalheSafra(s: ResSafra): string {
  return s.risco && s.seguranca != null ? detalheApi(s) : `${t(s.nome)}: ${t(SEM_CRITERIO)}`
}

/** Frase curta que explica a nota do eixo; null quando ainda não há dado para explicar. */
export function motivo(r: RotacaoDef, k: Eixo, rot: ResRotacao | null): string | null {
  if (k === 'risco') return rot ? motivoSafra(safraLimitante(rot)) : t('aguardando as rotações')
  if (k === 'solo') return minuscula(t(r.ct.soilWhy))
  if (k === 'prod') {
    const p = r.scores?.productivity
    return p != null ? t('produção preservada de {p}% (perda por falta de água: {perda}%)', { p: Math.round(p), perda: Math.round(100 - p) }) : reais(receitaHa(r.ct))
  }
  if (k === 'fat') {
    const f = r.faturamento
    if (f?.ajustado == null) return r.scores ? t('sem faturamento de referência para esta rotação') : reais(receitaHa(r.ct))
    return f.bruto != null && f.bruto !== f.ajustado
      ? t('{ajustado}/ha com a perda hídrica ({bruto}/ha sem perda)', { ajustado: usdFmt(f.ajustado), bruto: usdFmt(f.bruto) })
      : t('{ajustado}/ha com a perda hídrica', { ajustado: usdFmt(f.ajustado) })
  }
  return null
}

/**
 * Faturamento de referência de uma safra, da API (US$/ha): o bruto e o mesmo com a perda por falta de água da
 * cultura (a mesma conta que a API faz para a rotação). null quando a API não traz dados econômicos da cultura.
 */
export function faturamentoSafra(c: RotationCrop | undefined): { bruto: number; ajustado: number | null } | null {
  const bruto = c?.economics?.gross_revenue_usd_ha
  if (bruto == null) return null
  const perda = c!.crop.risk.estimated_yield_loss_pct
  return { bruto, ajustado: perda == null ? null : bruto * (1 - perda / 100) }
}

/** Ressalva do faturamento da API, junto de toda nota ou valor dele. */
export const RESSALVA_FATURAMENTO = 'Estimativa com base em médias nacionais (FAO), sem custos de produção.'

/** Explicação completa (tooltip) de onde vem o motivo; null quando o motivo curto já basta. */
export function motivoDetalhe(k: Eixo, rot: ResRotacao | null): string | null {
  if (k === 'fat') return t(RESSALVA_FATURAMENTO)
  if (k !== 'risco' || !rot) return null
  return detalheSafra(safraLimitante(rot))
}

// Cor fixa por rotação (RotacaoDef.cor), usada no mapa e na caixa de seleção da tabela.
// A rotação atual é desenhada tracejada.
// Seis cores: com a rotação atual e as salvas, a lista pode passar de 4 sem repetir cor tão cedo.
export const COR_ROT = ['#0A64D6', '#1B9E3E', '#E07A00', '#3A3A3C', '#7A4FD0', '#00838F']
export const nomeRot = (r: RotacaoDef) => `${t(r.ct.c1)} → ${t(r.ct.c2)}`
