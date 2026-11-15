export type Priority = { risco: boolean; agua: boolean; solo: boolean; prod: boolean }

export type AppState = {
  idx: number       // 0–35 (décimo 0 = 1–10 set)
  mode: 'cal' | 'cmp'
  pr: Priority
  /** Rotação selecionada (índice em SAFRAS/CT); 3 = a atual. */
  rot: number
}

export type StatusLevel = 'good' | 'warn' | 'risk'

export type StatusResult = {
  cls: StatusLevel; label: string; icon: string
  title: string; text: string; aria: string
}

export type SoilResult = {
  cls: StatusLevel; label: string; icon: string
  val: string; cx: number; aria: string
  imp: string; fix: string; hasCrop: boolean
  c0:string; c1:string; c2:string; c3:string; c4:string; c5:string
  m1: number | null; m2: number | null
  unit: string
}

export type TempResult = {
  cls: StatusLevel; label: string; icon: string
  /** null quando não há dado de temperatura (semDado). */
  tmin: number | null; tmax: number | null; aria: string
  semDado: boolean
  imp: string; fix: string; hasCrop: boolean
  rx: number; rw: number
  x1: number; x2: number; x3: number; x4: number
  loLabel: string; hiLabel: string; loX: number; hiX: number; merged: boolean
  z0:string;c0:string; z1:string;c1:string; z2:string;c2:string
  z3:string;c3:string; z4:string;c4:string; z5:string;c5:string
  z6:string;c6:string; z7:string;c7:string; z8:string;c8:string
}

// ---------- Talhão (onboarding) ----------
/** Contorno do talhão: [lat, lon] em graus, sem repetir o primeiro ponto no fim. */
export type Contorno = [number, number][]
export type Ponto = { lat: number; lon: number }
export type Textura = 'argiloso' | 'medio' | 'arenoso'
export type CampoLaudo = 'ph' | 'mo' | 'p' | 'k' | 'v' | 'arg'
/** Valores do laudo como digitados (aceitam vírgula decimal). */
export type AnaliseSolo = Partial<Record<CampoLaudo, string>>

/** Um ano agrícola. c1/c2: id do catálogo, 'nao_plantei' (só c2) ou 'outra:<nome>'. */
export type RegistroSafra = {
  c1?: string | null; c2?: string | null
  sc1?: string; sc2?: string
  pragas?: boolean; quais?: string[]
}
/** Chave: rótulo da safra, ex.: '2025/26'. */
export type Historico = Record<string, RegistroSafra>

export type Talhao = {
  id: string
  nome: string
  contorno: Contorno
  areaHa: number
  centro: Ponto
  /** "Cidade, UF" pelo geocoding reverso; ausente até a resposta chegar. */
  local?: string
  textura: Textura | null
  /** false quando o agricultor marcou "Não sei". */
  texturaInformada: boolean
  texturaPeloLaudo: boolean
  analise: AnaliseSolo | null
  classe: string
  historico: Historico | null
}

export type DadosTalhao = Omit<Talhao, 'id' | 'classe' | 'local'>
export type EstadoTalhoes = { talhoes: Talhao[]; ativo: string | null }

// ---------- Clima (API /api/clima/decendios) ----------
/** Um decêndio climatológico (média de várias safras). Campos null = sem dado. */
export type Decendio = {
  /** 0 = 1–10 set … 35 = 21–31 ago (mesma numeração de AppState.idx). */
  idx: number
  rotulo: string
  dias: number
  anos_validos: number
  dias_preenchidos: number
  /** Chuva total média no decêndio, mm. */
  chuva_media: number | null
  /** Chuva superada em 8 de cada 10 anos, mm. */
  chuva_p20: number | null
  /** ET0 total média, mm. */
  et0_media: number | null
  tmin_media: number | null
  tmin_extremo_medio: number | null
  tmin_absoluto: number | null
  tmax_media: number | null
  tmax_extremo_medio: number | null
  tmax_absoluto: number | null
  /** Umidade do solo superficial, fração 0–1. */
  gwettop_media: number | null
  /** Umidade da zona das raízes, fração 0–1. */
  gwetroot_media: number | null
}

export type ClimaDecendios = {
  ponto: Ponto
  celula: { lat: number; lon: number; elev: number }
  safras: string[]
  fonte: string
  aviso_resolucao: string
  /** Sempre 36, ordenados por idx (validado em services/clima.ts). */
  decendios: Decendio[]
}

/** Recorte do clima para o decêndio simulado; null = sem dado (nunca 0). */
export type ClimaPeriodo = {
  chuvaMes: number | null
  chuvaDecendio: number | null
  chuvaP20: number | null
  et0: number | null
  tmin: number | null
  tmax: number | null
  tminAbs: number | null
  tmaxAbs: number | null
}

export type EstadoClima =
  | { status: 'carregando'; dados: null }
  | { status: 'ok'; dados: ClimaDecendios }
  | { status: 'erro'; dados: null; erro: string }

export type FaixaCultura = {
  optimal_min: number | null; optimal_max: number | null
  absolute_min: number | null; absolute_max: number | null
}
export type TemperaturaCultura = FaixaCultura & { killing_rest: number | null; killing_early_growth: number | null }
export type OpcoesSoloCultura = { optimal: string[]; absolute: string[] }
export type CropSummary = {
  eco_port_code: number; scientific_name: string; common_names: string[]
  category: string[]; life_span: string[]
}
export type CropPage = { total: number; limit: number; offset: number; items: CropSummary[] }
export type CropDetail = Pick<CropSummary, 'eco_port_code' | 'scientific_name'> & {
  temperature: TemperaturaCultura; rainfall: FaixaCultura; soil_ph: FaixaCultura
  crop_cycle: { min_days: number | null; max_days: number | null }
  soil: Record<'depth' | 'texture' | 'fertility' | 'al_toxicity' | 'salinity' | 'drainage', OpcoesSoloCultura>
  /** Ausente em respostas antigas do cache; null quando o catálogo não tem perfil hídrico. */
  water_requirements?: WaterRequirements | null
}
export type EstadoCultura =
  | { status: 'carregando'; dados: null }
  | { status: 'ok'; dados: CropDetail }
  | { status: 'sem_referencia'; dados: null }
  | { status: 'erro'; dados: null }

// ---------- Requisitos hídricos (FAO-56) do catálogo ----------
/** Parâmetros de referência da FAO-56 (via CropWat/INRAE), não calibrados por região. null = sem perfil. */
export type WaterRequirements = {
  profile: string
  profile_name: string
  /** Kc no início, meio e fim do ciclo; na fase de desenvolvimento, interpola-se. */
  crop_coefficient: { initial: number; mid_season: number; late_season: number }
  stage_length_days: { initial: number; development: number; mid_season: number; late_season: number; total: number }
  root_depth_m: { initial: number; max: number }
  allowable_depletion: { initial: number; mid_season: number; late_season: number }
  yield_response_factor: Record<'initial' | 'development' | 'mid_season' | 'late_season' | 'season', number | null>
  max_height_m?: number | null
}

// ---------- Rotações recomendadas (POST /api/rotations/recommendations) ----------
export type SoilType = 'sandy' | 'medium' | 'clayey'
export type EstagioFao = 'initial' | 'development' | 'mid_season' | 'late_season'
export type CropRisk = {
  /** % das safras simuladas com perda acima de loss_threshold_pct. Não é queda de produtividade. */
  risk_percentage: number | null
  estimated_yield_loss_pct: number | null
  loss_threshold_pct: number
  critical_stage: EstagioFao | null
  mean_isna: Record<EstagioFao, number | null>
  valid_years: number
  method: 'MOCK' | 'FAO56_SIMPLIFIED_KY'
  validated?: false
}
/** Detalhe completo da cultura (igual a /api/crops/{code}) mais o risco hídrico dela; só o que o front usa. */
export type CropWithRisk = Pick<CropSummary, 'eco_port_code' | 'scientific_name' | 'common_names'> & {
  water_requirements: WaterRequirements | null
  risk: CropRisk
}
export type RotationCrop = { crop: CropWithRisk; planting_date: string; harvest_date: string }
export type Rotation = { id: string; rank: number; crops: [RotationCrop, RotationCrop] }
export type RotationRecommendations = {
  agricultural_year: number
  soil_type: SoilType
  rotations: Rotation[]
  /** As rotações do agricultor enviadas em custom_rotations, simuladas e ranqueadas, na ordem do pedido. */
  custom_rotations?: CustomRotation[]
  assumptions: { loss_threshold_pct: number; initial_soil_water_fraction: number; spinup_days: number; planting_gap_days: number }
  warnings: string[]
}

// ---------- Simulação de rotação do agricultor (POST /api/rotations/simulate) ----------
export type Prioridades = { productivity: 0 | 1; water_security: 0 | 1; soil_protection: 0 | 1 }
/** Origem da data de plantio e do ciclo da cultura. */
export type CropCalendarInfo = {
  source: 'GGCMI_PHASE3_V1_01' | 'FAO56_REFERENCE'
  /** Do plantio à colheita: o ciclo enviado, ou o de referência quando a cultura vai sem datas. */
  cycle_days: number
  reference_planting_date?: string | null
  data_source?: string | null
}
export type SimulatedCrop = RotationCrop & {
  crop: CropWithRisk & { family?: string | null; crop_cycle?: { min_days: number | null; max_days: number | null } }
  calendar: CropCalendarInfo
}
/** Escalas absolutas 0–100 (100 = melhor); null quando o risco é desconhecido. */
export type RotationScores = {
  productivity: number | null
  water_security: number | null
  soil_protection: number
  overall: number | null
}
export type SoilProtection = {
  score: number
  living_cover_days: number
  season_days: number
  cover_fraction: number
  botanical_families: string[]
}
export type CustomRotation = {
  id: string
  /** Posição entre os candidatos da recomendação (1 = melhor que todos). */
  rank: number
  /** Rotações comparadas, esta incluída (todos os candidatos, não só as 4 recomendadas). */
  ranked_among: number
  /** rank dentro das 4 melhores. */
  would_be_recommended: boolean
  crops: [SimulatedCrop, SimulatedCrop]
  soil_protection: SoilProtection
  scores: RotationScores
  /** Avisos agronômicos (em inglês, texto livre); vazio = passa nos filtros da recomendação. */
  checks: string[]
}
export type SweepCrop = {
  code: number
  planting_date: string
  harvest_date: string
  risk_percentage: number | null
  estimated_yield_loss_pct: number | null
  in_calendar: boolean
  temperature_ok: boolean
}
export type SweepPoint = { decendio_idx: number; label: string; crops: [SweepCrop, SweepCrop]; scores: RotationScores }
export type PlantingSweep = {
  /** first: as duas culturas andam juntas; second: só a 2ª. */
  moved_crop: 'first' | 'second'
  points: SweepPoint[]
  best_decendio_idx: number | null
  worst_decendio_idx: number | null
}
export type RotationSimulationResponse = {
  agricultural_year: number
  soil_type: SoilType
  priorities: Prioridades
  rotation: CustomRotation
  first_planting_sweep: PlantingSweep | null
  second_planting_sweep: PlantingSweep | null
  assumptions: Record<string, number>
  warnings: string[]
}
/** Uma cultura enviada para simular: sem datas, a API usa o calendário regional. */
export type CustomCropInput = { code: number; planting_date?: string; harvest_date?: string }
