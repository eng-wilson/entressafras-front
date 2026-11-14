import type { StatusResult } from '../types'

const ICONS = { good:'#i-okc', warn:'#i-alert', risk:'#i-xc' }
const LV = { good:'favorável', warn:'arriscado', risk:'desfavorável' }

export function rotationStatus(entries: [number, string][]): StatusResult {
  const worst = entries.slice().sort((a,b) => a[0] - b[0])[0]
  const [n, crop] = worst
  const cls = n >= 7 ? 'good' : n >= 4 ? 'warn' : 'risk'
  const lv = LV[cls]
  const text = `Água suficiente em ${n} de 10 anos (${crop})`
  return {
    cls, icon: ICONS[cls],
    label: `Clima ${lv}`,
    title: `Histórico ${lv}`,
    text,
    aria: `Clima ${lv}. ${text}, para estas culturas e datas.`,
  }
}
