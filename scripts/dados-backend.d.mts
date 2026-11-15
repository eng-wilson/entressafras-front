// Tipos mínimos para o teste em src/logic/dadosBackend.test.ts.
export type Situacao = 'real_uso' | 'real_livre' | 'mock' | 'nenhum'
export type Dado = { dado: string; front: string; emUso: boolean; precisa: string; servido: (a: Amostras) => 'real' | 'mock' | null }
export type Amostras = { openapi?: unknown; decendios?: unknown; cultura?: unknown; rotacoes?: unknown }
export const DADOS: Dado[]
export function avaliar(amostras: Amostras, dados?: Dado[]): (Dado & { situacao: Situacao })[]
export function tabela(itens: (Dado & { situacao: Situacao })[], data: string): string
export function atualizarDoc(doc: string, bloco: string): string
