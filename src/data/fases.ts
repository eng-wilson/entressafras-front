// Fases do ciclo usadas na leitura do risco (nomes e proporção padrão) e tipos de apoio. O risco vem da API.

export type Fonte = { titulo: string; url: string }
/** Id das culturas que a tela conhece (catálogo local e simulador). */
export type CulturaRef = 'soja' | 'milho' | 'sorgo' | 'milheto' | 'algodao'

/** Fases do ciclo: I estabelecimento, II crescimento vegetativo, III floração e enchimento de grãos, IV maturação. */
export const NOME_FASE = ['Estabelecimento', 'Crescimento vegetativo', 'Floração e enchimento de grãos', 'Maturação'] as const

// Proporção padrão das fases (20/30/30/20%): reserva para cultura cuja resposta da API não traz os estágios FAO-56.
export const FASES: [number, number, number, number] = [0.2, 0.3, 0.3, 0.2]
