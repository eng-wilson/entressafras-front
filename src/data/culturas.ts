// Catálogo enxuto das culturas do histórico (nomes de entressafras/src/domain/crops/*.js,
// unidades de agronomia.js). Morfologia e fases ficam no simulador, não aqui.

export type GrupoCultura = 'grao' | 'cobertura'
export type Cultura = { id: string; nome: string; grupo: GrupoCultura; unidade: string }

const lista: Cultura[] = [
  { id: 'soja', nome: 'Soja', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'milho', nome: 'Milho', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'feijao', nome: 'Feijão', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'arroz', nome: 'Arroz', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'sorgo', nome: 'Sorgo', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'trigo', nome: 'Trigo', grupo: 'grao', unidade: 'sc/ha' },
  { id: 'algodao', nome: 'Algodão', grupo: 'grao', unidade: '@/ha' },
  { id: 'milheto', nome: 'Milheto', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'brizantha_marandu', nome: 'Braquiária Marandu', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'brizantha_piata', nome: 'Braquiária Piatã', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'brizantha_paiaguas', nome: 'Braquiária Paiaguás', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'ruziziensis', nome: 'Braquiária ruziziensis', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'crotalaria_spectabilis', nome: 'Crotalária spectabilis', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'crotalaria_juncea', nome: 'Crotalária juncea', grupo: 'cobertura', unidade: 't/ha MS' },
  { id: 'crotalaria_ochroleuca', nome: 'Crotalária ochroleuca', grupo: 'cobertura', unidade: 't/ha MS' },
]

export const CULTURAS: Record<string, Cultura> = Object.fromEntries(lista.map(c => [c.id, c]))
