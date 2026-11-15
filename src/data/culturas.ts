// Catálogo enxuto das culturas do histórico (nomes de entressafras/src/domain/crops/*.js,
// unidades de agronomia.js). Morfologia e fases ficam no simulador, não aqui.

export type GrupoCultura = 'grao' | 'cobertura'
export type Cultura = { id: string; nome: string; grupo: GrupoCultura; unidade: string }

// Correspondências por espécie verificadas na API em 14/11/2026.
// Cultivares de brizantha compartilham a referência geral da espécie.
export const REFERENCIAS_CULTURAS: Record<string, { codigo: number; especie: string; cultivar?: boolean }> = {
  soja: { codigo: 1150, especie: 'Glycine max' },
  milho: { codigo: 2175, especie: 'Zea mays' },
  feijao: { codigo: 1668, especie: 'Phaseolus vulgaris' },
  arroz: { codigo: 1574, especie: 'Oryza sativa' },
  sorgo: { codigo: 48747, especie: 'Sorghum bicolor' },
  trigo: { codigo: 2114, especie: 'Triticum aestivum' },
  algodao: { codigo: 1160, especie: 'Gossypium hirsutum' },
  milheto: { codigo: 8418, especie: 'Pennisetum glaucum' },
  brizantha_marandu: { codigo: 536, especie: 'Brachiaria brizantha', cultivar: true },
  brizantha_piata: { codigo: 536, especie: 'Brachiaria brizantha', cultivar: true },
  brizantha_paiaguas: { codigo: 536, especie: 'Brachiaria brizantha', cultivar: true },
  ruziziensis: { codigo: 543, especie: 'Brachiaria ruziziensis' },
  crotalaria_spectabilis: { codigo: 4982, especie: 'Crotalaria spectabilis' },
  crotalaria_juncea: { codigo: 801, especie: 'Crotalaria juncea' },
}

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
