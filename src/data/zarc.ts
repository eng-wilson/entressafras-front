// Vocabulário do ZARC (MAPA/Embrapa) usado na leitura do risco: nomes das fases, a régua de níveis e a proporção
// padrão das fases (só para cultura sem estágios na API). O risco em si vem da API; os antigos parâmetros das
// portarias (ISNA mínimo, CAD, Kc local) saíram com o cálculo do front (ver docs/PLANO_INTEGRACAO.md, fase 5).

export type Fonte = { titulo: string; url: string }
/** Id das culturas que a tela conhece (catálogo local e simulador). */
export type CulturaRef = 'soja' | 'milho' | 'sorgo' | 'milheto' | 'algodao'
/** Portaria do ZARC de referência da safra; hoje só a simulação do talhão usa (milho 2ª safra). */
export type ZarcId = 'soja' | 'milho2' | 'milhoBraquiaria' | 'sorgoGranifero' | 'coberturaMilheto'

/** Fases do ZARC: I estabelecimento, II crescimento vegetativo, III floração e enchimento de grãos, IV maturação. */
export const NOME_FASE = ['Estabelecimento', 'Crescimento vegetativo', 'Floração e enchimento de grãos', 'Maturação'] as const

const GOV = 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/portarias'

// Proporção padrão das fases (20/30/30/20%, milho consorciado, Grupo I): reserva para cultura cuja resposta da API
// não traz os estágios FAO-56.
export const FASES: [number, number, number, number] = [0.2, 0.3, 0.3, 0.2]
export const FONTE_FASES: Fonte = {
  titulo: 'Portaria SPA/MAPA nº 347/2026 (ZARC milho consorciado com braquiária, 2ª safra, SP, 2026/27), item 1.15',
  url: `${GOV}/safra-vigente/sao-paulo/POB09B1.PDF`,
}

export const FONTE_FASES_API: Fonte = {
  titulo: 'Duração dos estágios (Lini, Ldev, Lmid, Lend) e profundidade das raízes do catálogo da API Entressafras (FAO-56 via CropWat/INRAE)',
  url: 'https://entressafras-backend-production.up.railway.app/docs#/',
}
export const FONTE_KC_API: Fonte = {
  titulo: 'Catálogo de culturas da API Entressafras (FAO-56 via CropWat/INRAE, não calibrado por região)',
  url: 'https://entressafras-backend-production.up.railway.app/docs#/',
}

/** Nível de risco do ZARC para "deu certo em X de 10 anos": 20, 30, 40 ou null (acima de 40%: fora do zoneamento). */
export const nivelZarc = (anos: number): 20 | 30 | 40 | null => (anos >= 8 ? 20 : anos === 7 ? 30 : anos === 6 ? 40 : null)
