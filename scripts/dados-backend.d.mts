// Tipos mínimos para o teste em src/logic/dadosBackend.test.ts.
export type Situacao = 'real_uso' | 'real_livre' | 'mock' | 'fora' | 'nenhum'
export type Dado = { dado: string; fonte: 'decendios' | 'cultura' | 'rotacoes' | null; front: string; emUso: boolean; precisa: string; servido: (a: Amostras) => 'real' | 'mock' | null }
export type Amostras = {
  openapi?: unknown; decendios?: unknown; cultura?: unknown; rotacoes?: unknown
  falhou?: Partial<Record<'decendios' | 'cultura' | 'rotacoes', boolean>>
}
export const DADOS: Dado[]
export function avaliar(amostras: Amostras, dados?: Dado[]): (Dado & { situacao: Situacao })[]
export function tabela(itens: (Dado & { situacao: Situacao })[], data: string): string
export function atualizarDoc(doc: string, bloco: string): string
