// MOCK — perfil local de cada cultura que a API de rotações pode devolver, pelo código EcoPort.
// A API traz a cultura, as datas, o risco hídrico, os scores e a proteção do solo; o resto (nome exibido, produção e
// preço, efeito nas pragas e score de água) ainda não vem do backend. O consumo de água do ciclo é Σ Kc × ET0 (dados da API). Valores ilustrativos, os
// mesmos do conjunto local quando a cultura coincide. Pendências: docs/INTEGRACAO_API.md.
import type { CulturaRef } from './fases'

export type PerfilCultura = {
  /** Id no catálogo local (data/culturas.ts) e no simulador. */
  id: CulturaRef
  /** Nome na 1ª safra e na 2ª (safrinha). */
  nome: string
  nome2?: string
  cobertura?: boolean
  /** Produtividade, unidade e preço por unidade; null = não é vendida. */
  prod: { y: string; u: string; p: string } | null
  /** Efeito nas pragas como 2ª safra depois da soja. (O efeito no solo vem da API: proteção do solo planejada.) */
  pragas: { nivel: 'Menor risco' | 'Maior risco'; porque: string }
}

export const PERFIS: Record<number, PerfilCultura> = {
  1150: {
    id: 'soja', nome: 'Soja',
    prod: { y: '58', u: 'sc/ha', p: 'R$ 152,45' },
    pragas: { nivel: 'Maior risco', porque: 'Soja depois de soja mantém as pragas e os nematoides no talhão.' },
  },
  2175: {
    id: 'milho', nome: 'Milho', nome2: 'Milho safrinha',
    prod: { y: '98', u: 'sc/ha', p: 'R$ 66,60' },
    pragas: { nivel: 'Maior risco', porque: 'Soja e milho em sequência: pragas como o percevejo passam de uma para a outra.' },
  },
  48747: {
    id: 'sorgo', nome: 'Sorgo',
    prod: { y: '62', u: 'sc/ha', p: 'R$ 44,00' },
    pragas: { nivel: 'Menor risco', porque: 'O sorgo não hospeda as principais pragas da soja.' },
  },
  8418: {
    id: 'milheto', nome: 'Milheto', cobertura: true,
    prod: null,
    pragas: { nivel: 'Menor risco', porque: 'O milheto quebra a sequência de hospedeiros das pragas da soja.' },
  },
  1160: {
    id: 'algodao', nome: 'Algodão', nome2: 'Algodão 2ª safra',
    prod: { y: '280', u: '@/ha', p: 'R$ 62,00' },
    pragas: { nivel: 'Maior risco', porque: 'Soja e algodão compartilham pragas como a mosca-branca e o percevejo.' },
  },
}
