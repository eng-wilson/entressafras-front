import type { CulturaRef } from './fases'
import type { CropCalendarInfo, CropRisk, Priorities, RotationScores, SoilInfo, SoilProperties, SoilProtection, RotationCrop } from '../types'

// TMIN, TMAX e THIS_RAIN alimentam apenas testes e a fixture de clima.
// Temperaturas mínimas por décimo (setembro décimo 0 → agosto décimo 35)
export const TMIN = [19,19,19,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,20,20,20,17,17,17,15,15,15,14,14,14,15,15,15]
export const TMAX = [35,35,34,33,32,31,30,30,30,29,29,29,29,29,30,29,29,29,30,30,30,30,31,31,31,31,31,31,31,32,32,33,33,34,34,35]

// Umidade do solo — rotação r4 (soja/milho safrinha), com cultura
export const WAT2: Record<number, number> = {5:.66,6:.64,7:.58,8:.56,9:.52,10:.48,11:.44,12:.41,13:.46,14:.5,15:.55,16:.62,17:.64,18:.6,19:.58,20:.55,21:.5,22:.47,23:.45,24:.44,25:.43,26:.45,27:.48,28:.5}

// Umidade do solo — sem cultura (pousio/palhada)
export const SOIL: Record<number, number> = {0:.32,1:.30,2:.34,3:.40,4:.48,29:.42,30:.38,31:.35,32:.33,33:.31,34:.30,35:.30}

// Chuva mensal atual (set→ago)
export const THIS_RAIN = [45,150,180,230,200,280,250,120,40,10,5,15]

// Chuva mensal histórica (normal)
export const USUAL_RAIN = [40,130,220,280,250,180,80,40,15,10,15,25]

export type StageKey = 'bare'|'ready'|'seed'|'emerg'|'veg'|'flor'|'ench'|'mat'|'straw'
export type Stage = {
  /** Planta desenhada no talhão (o desenho só tem soja e milho). */
  crop: 'soja'|'milho'|null; k: StageKey; name: string; from: number; to: number
  /** Cultura de verdade da safra (requisitos do catálogo) e nome exibido; ausentes fora das safras. */
  ref?: CulturaRef | string; cultura?: string
}

// Estágios fenológicos da rotação r4 (Soja → Milho safrinha)
export const STAGES: Stage[] = [
  { crop: null,    k: 'bare',  name: 'Pousio',                       from: 0,  to: 3  },
  { crop: null,    k: 'ready', name: 'Solo pronto para o plantio',    from: 4,  to: 4  },
  { crop: 'soja',  k: 'seed',  name: 'Semeadura',                     from: 5,  to: 5  },
  { crop: 'soja',  k: 'emerg', name: 'Germinação e emergência',       from: 6,  to: 6  },
  { crop: 'soja',  k: 'veg',   name: 'Crescimento',                   from: 7,  to: 8  },
  { crop: 'soja',  k: 'flor',  name: 'Floração',                      from: 9,  to: 10 },
  { crop: 'soja',  k: 'ench',  name: 'Enchimento de grãos',           from: 11, to: 12 },
  { crop: 'soja',  k: 'mat',   name: 'Pronta para colher',            from: 13, to: 14 },
  { crop: 'soja',  k: 'straw', name: 'Colheita',                      from: 15, to: 15 },
  { crop: 'milho', k: 'seed',  name: 'Semeadura',                     from: 16, to: 16 },
  { crop: 'milho', k: 'emerg', name: 'Germinação e emergência',       from: 17, to: 17 },
  { crop: 'milho', k: 'veg',   name: 'Crescimento',                   from: 18, to: 20 },
  { crop: 'milho', k: 'flor',  name: 'Floração',                      from: 21, to: 22 },
  { crop: 'milho', k: 'ench',  name: 'Enchimento de grãos',           from: 23, to: 25 },
  { crop: 'milho', k: 'mat',   name: 'Pronto para colher',            from: 26, to: 27 },
  { crop: 'milho', k: 'straw', name: 'Colheita',                      from: 28, to: 28 },
  { crop: null,    k: 'straw', name: 'Palhada',                       from: 29, to: 31 },
  { crop: null,    k: 'bare',  name: 'Pousio',                        from: 32, to: 35 },
]

// Cada safra aponta a cultura do catálogo (ref), de onde vêm os requisitos e o Kc de reserva.
// Em consórcio vale a cultura que define a safra: o milho (vendido); na cobertura, o milheto.
/** Janela de uma safra em decêndios (idx 0 = 1–10 set), inclusiva. */
export type SafraDef = {
  nome: string
  /** Id da cultura no catálogo local (data/culturas.ts): requisitos do EcoCrop e Kc de reserva. */
  ref: CulturaRef | string
  de: number; ate: number
  cobertura?: boolean
  /** Cultura plantada junto, só no desenho do talhão (id do simulador). */
  companheira?: string
  /** Kc (início, meio, fim) do catálogo da API; ausente = consumo sem dado. */
  kc?: [number, number, number]
  /** Fração do ciclo em cada fase (I a IV), dos estágios FAO-56 da API; ausente = FASES (20/30/30/20%). */
  fases?: [number, number, number, number]
  /** Profundidade das raízes no plantio e máxima, m (API); exibida nos dados da cultura. */
  raiz?: { ini: number; max: number }
  /** Risco hídrico da cultura, da API: é a única fonte da resiliência na tela (mesmo enquanto MOCK). */
  risco?: CropRisk
  /** De onde vieram a data de plantio e o ciclo (calendário regional GGCMI ou referência FAO-56). */
  calendario?: CropCalendarInfo
  /** Ky por fase (I a IV), da API: resposta da produção ao déficit hídrico (FAO-33). null = não informado. */
  ky?: [number | null, number | null, number | null, number | null]
  /** A cultura como veio da API (rotations[].crops[n]), sem nenhuma conta: base de "De onde vêm estes números". */
  api?: RotationCrop
}

/** Barra do calendário, em meses desde 1º de setembro (0–12); sem rótulo = pousio. */
export type BarDef = { s: number; e: number; label: string }

export type CTRow = {
  c1: string; c2: string
  w1: string; w2: string; soil: string; soilWhy: string
  pest: string; pestWhy: string
  y1: string; y2: string; p1l: string; p1: string; p2l: string; p2: string
  /** Unidade da produção de cada safra; ausente = sc/ha. */
  u1?: string; u2?: string
  atual?: boolean
}

/** Uma rotação exibida: janelas das safras, textos da tabela e scores. */
export type RotacaoDef = {
  id: string
  safras: SafraDef[]
  ct: CTRow
  /** Score ilustrativo de solo (mock, menor = melhor); só no conjunto local. Na API vale `scores.soil_protection`. */
  solo: number
  barras: BarDef[]
  maisPragas?: boolean
  /** Posição em COR_ROT, estável quando a API só reordena as mesmas rotações. */
  cor: number
  /** Escalas 0–100 da API (produtividade preservada, segurança hídrica, proteção do solo, faturamento, média). */
  scores?: RotationScores
  /** Faturamento de referência da API (US$/ha): bruto e com o desconto hídrico. */
  faturamento?: { bruto: number | null; ajustado: number | null }
  /** Índice de proteção do solo planejada, da API. */
  protecaoSolo?: SoilProtection
  /** Rotação criada pelo agricultor ("Nova"), ranqueada pela API em custom_rotations; id da salva no navegador. */
  salva?: { id: string; em: number }
  /** Rotação atual do talhão (a última safra do histórico), simulada pela API em custom_rotations para comparar. */
  historico?: boolean
}

/** Rotações da tela: da API (POST /api/rotations/recommendations) ou o conjunto local dos testes. */
export type ConjuntoRotacoes = {
  origem: 'api' | 'local'
  /** Ano de início da safra: 2027 = set/2027 a ago/2028. */
  ano: number
  rotacoes: RotacaoDef[]
  /** Avisos do backend e do adaptador (ex.: ranking MOCK, rotação sem dado suficiente). */
  avisos: string[]
  /** Solo usado na simulação da API (textura informada ou estimada pelo local). */
  solo?: SoilInfo
  /** Propriedades do solo superficial estimadas pelo local (SoilGrids), só exibição. */
  propriedadesSolo?: SoilProperties | null
  /** Prioridades que a API usou no ranking. */
  prioridades?: Priorities
}

// Conjunto local (o protótipo original): 4 rotações fixas, na ordem de CT. Hoje alimenta só testes e fixtures.
export const SAFRAS: SafraDef[][] = [
  [{ nome: 'Soja', ref: 'soja', de: 5, ate: 15 }, { nome: 'Crotalária + milheto', ref: 'milheto', de: 16, ate: 27, cobertura: true, companheira: 'crotalaria_spectabilis' }],
  [{ nome: 'Soja', ref: 'soja', de: 5, ate: 15 }, { nome: 'Sorgo', ref: 'sorgo', de: 16, ate: 27 }],
  [{ nome: 'Soja precoce', ref: 'soja', de: 3, ate: 12 }, { nome: 'Milho + braquiária', ref: 'milho', de: 13, ate: 26, companheira: 'brizantha_marandu' }],
  [{ nome: 'Soja', ref: 'soja', de: 5, ate: 15 }, { nome: 'Milho safrinha', ref: 'milho', de: 16, ate: 28 }],
]

// Scores ilustrativos (menor = melhor); índice = rotação 0–3. Resiliência e produtividade já não vêm daqui:
// a primeira é calculada com o clima (logic/resiliencia.ts) e a segunda com a receita de CT (receitaHa).
export const SCORE: Record<'solo', number[]> = {
  solo:  [0, 60, 10, 110],
}

export const CT: CTRow[] = [
  { c1:'Soja', c2:'Crotalária + milheto', w1:'450–800 mm', w2:'Sem dado', soil:'Melhora', soilWhy:'Fixa nitrogênio e cobre o solo', pest:'Menor risco', pestWhy:'A crotalária não hospeda as principais pragas e nematoides da soja.', y1:'58', y2:'-', p1l:'Soja', p1:'R$ 152,45', p2l:'Crotalária + milheto', p2:'Não é vendida' },
  { c1:'Soja', c2:'Sorgo',                w1:'450–800 mm', w2:'~450 mm',  soil:'Mantém', soilWhy:'A palhada do sorgo protege o solo', pest:'Menor risco', pestWhy:'O sorgo não hospeda as principais pragas da soja.', y1:'58', y2:'62', p1l:'Soja', p1:'R$ 152,45', p2l:'Sorgo', p2:'R$ 44,00' },
  { c1:'Soja precoce', c2:'Milho + braquiária', w1:'450–800 mm', w2:'380–550 mm', soil:'Melhora', soilWhy:'Raízes e palha da braquiária', pest:'Maior risco', pestWhy:'Soja e milho em sequência: pragas como o percevejo passam de uma para a outra.', y1:'55', y2:'105', p1l:'Soja', p1:'R$ 152,45', p2l:'Milho', p2:'R$ 66,60' },
  { c1:'Soja', c2:'Milho safrinha', w1:'450–800 mm', w2:'380–550 mm', soil:'Mantém', soilWhy:'Solo descoberto por 4 meses', pest:'Maior risco', pestWhy:'Repete soja e milho da safra anterior: as pragas continuam no talhão.', y1:'52', y2:'98', p1l:'Soja', p1:'R$ 152,45', p2l:'Milho', p2:'R$ 66,60', atual:true },
]

// Barras desenhadas à mão na referência visual (meses desde setembro).
const BARRAS_LOCAIS: BarDef[][] = [
  [{ s: 1.7, e: 5.3, label: 'Soja' }, { s: 5.3, e: 9.4, label: 'Crotalária + milheto' }, { s: 9.4, e: 12, label: '' }],
  [{ s: 1.7, e: 5.3, label: 'Soja' }, { s: 5.4, e: 9.4, label: 'Sorgo' }, { s: 9.4, e: 12, label: '' }],
  [{ s: 1, e: 4.4, label: 'Soja precoce' }, { s: 4.4, e: 9, label: 'Milho + braquiária' }, { s: 9, e: 12, label: '' }],
  [{ s: 1.7, e: 5.3, label: 'Soja' }, { s: 5.6, e: 9.6, label: 'Milho safrinha' }, { s: 9.6, e: 12, label: '' }],
]

export const CONJUNTO_LOCAL: ConjuntoRotacoes = {
  origem: 'local',
  ano: 2026,
  avisos: [],
  rotacoes: SAFRAS.map((safras, i) => ({
    id: `r${i + 1}`, safras, ct: CT[i], solo: SCORE.solo[i], barras: BARRAS_LOCAIS[i], maisPragas: i === 3, cor: i,
  })),
}

export const MONTHS = ['setembro','outubro','novembro','dezembro','janeiro','fevereiro','março','abril','maio','junho','julho','agosto']
export const MONTHS_SHORT = ['Set','Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago']
export const LEN = [30,31,30,31,31,28,31,30,31,30,31,31]
