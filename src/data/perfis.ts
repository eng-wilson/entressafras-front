// MOCK — perfil local de cada cultura que a API de rotações pode devolver, pelo código EcoPort.
// A API traz a cultura, as datas e o risco hídrico; o resto da tela (nome exibido, critério do ZARC, produtividade,
// preço, efeito no solo e nas pragas, scores de água e solo) ainda não vem do backend. Valores ilustrativos, os
// mesmos do conjunto local quando a cultura coincide. Pendências: docs/PLANO_INTEGRACAO.md, "Fase 5".
import type { CulturaRef, ZarcId } from './zarc'

export type PerfilCultura = {
  /** Id no catálogo local (data/culturas.ts) e no simulador. */
  id: CulturaRef
  /** Nome na 1ª safra e na 2ª (safrinha). */
  nome: string
  nome2?: string
  /** Portaria do ZARC por posição na rotação; null = sem critério (algodão: não copiado das portarias). */
  zarc: ZarcId | null
  zarc2?: ZarcId | null
  cobertura?: boolean
  /** Água que a cultura consome no ciclo, texto da tabela. */
  agua: string
  /** Produtividade, unidade e preço por unidade; null = não é vendida. */
  prod: { y: string; u: string; p: string } | null
  /** Efeito como 2ª safra depois da soja. */
  solo: { efeito: 'Melhora' | 'Mantém'; porque: string }
  pragas: { nivel: 'Menor risco' | 'Maior risco'; porque: string }
  /** Scores ilustrativos como 2ª safra (menor = melhor), na escala de SCORE em mock.ts. */
  score: { agua: number; solo: number }
}

export const PERFIS: Record<number, PerfilCultura> = {
  1150: {
    id: 'soja', nome: 'Soja', zarc: 'soja', agua: '450–800 mm',
    prod: { y: '58', u: 'sc/ha', p: 'R$ 152,45' },
    solo: { efeito: 'Mantém', porque: 'Fixa nitrogênio, mas deixa pouca palhada' },
    pragas: { nivel: 'Maior risco', porque: 'Soja depois de soja mantém as pragas e os nematoides no talhão.' },
    score: { agua: -5, solo: 100 },
  },
  2175: {
    id: 'milho', nome: 'Milho', nome2: 'Milho safrinha', zarc: null, zarc2: 'milho2', agua: '380–550 mm',
    prod: { y: '98', u: 'sc/ha', p: 'R$ 66,60' },
    solo: { efeito: 'Mantém', porque: 'Solo descoberto por 4 meses' },
    pragas: { nivel: 'Maior risco', porque: 'Soja e milho em sequência: pragas como o percevejo passam de uma para a outra.' },
    score: { agua: -4, solo: 110 },
  },
  48747: {
    id: 'sorgo', nome: 'Sorgo', zarc: 'sorgoGranifero', agua: '~450 mm',
    prod: { y: '62', u: 'sc/ha', p: 'R$ 44,00' },
    solo: { efeito: 'Mantém', porque: 'A palhada do sorgo protege o solo' },
    pragas: { nivel: 'Menor risco', porque: 'O sorgo não hospeda as principais pragas da soja.' },
    score: { agua: -7, solo: 60 },
  },
  8418: {
    id: 'milheto', nome: 'Milheto', zarc: 'coberturaMilheto', cobertura: true, agua: 'Sem dado',
    prod: null,
    solo: { efeito: 'Melhora', porque: 'Muita palhada e raízes profundas cobrem e estruturam o solo' },
    pragas: { nivel: 'Menor risco', porque: 'O milheto quebra a sequência de hospedeiros das pragas da soja.' },
    score: { agua: -8, solo: 10 },
  },
  1160: {
    id: 'algodao', nome: 'Algodão', nome2: 'Algodão 2ª safra', zarc: null, agua: 'Sem dado',
    prod: { y: '280', u: '@/ha', p: 'R$ 62,00' },
    solo: { efeito: 'Mantém', porque: 'Ciclo longo e pouca palhada depois da destruição da soqueira' },
    pragas: { nivel: 'Maior risco', porque: 'Soja e algodão compartilham pragas como a mosca-branca e o percevejo.' },
    score: { agua: -2, solo: 120 },
  },
}
