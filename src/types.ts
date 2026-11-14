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
