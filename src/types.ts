export type Priority = { risco: boolean; agua: boolean; solo: boolean; prod: boolean }

export type AppState = {
  idx: number       // 0–35 (décimo 0 = 1–10 set)
  mode: 'cal' | 'cmp'
  pr: Priority
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
  tmin: number; tmax: number; aria: string
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
