import { WAT2, SOIL } from '../data/mock'
import type { SoilResult, StatusLevel } from '../types'

const TRACK_W = 268
const fmtPt = (v: number) => v.toFixed(2).replace('.', ',')

export function soilGauge(idx: number, crop: 'soja'|'milho'|null, covered: boolean): SoilResult {
  const gradCrop = { c0:'#FF3B30',c1:'#FF3B30',c2:'#FF9500',c3:'#FF9500',c4:'#34C759',c5:'#34C759' }
  const gradSoil = { c0:'#D6E6F7',c1:'#D6E6F7',c2:'#9CC3EC',c3:'#9CC3EC',c4:'#3D8BE0',c5:'#3D8BE0' }

  if (crop) {
    const wv = WAT2[idx] ?? 0.5
    const cls: StatusLevel = wv < 0.45 ? 'risk' : wv < 0.55 ? 'warn' : 'good'
    const SL: Record<string,[string,string]> = { good:['Bom','#i-okc'], warn:['Atenção','#i-alert'], risk:['Crítico','#i-xc'] }
    const ADV: Record<string,[string,string]> = {
      good: ['A planta tem água suficiente para crescer bem.','Nada a fazer. Mantenha a palhada no solo.'],
      warn: ['A planta começa a sofrer com a falta de água. A produção pode cair.','Se puder, irrigue. Mantenha a palhada e evite revolver o solo.'],
      risk: ['Falta água. A planta pode murchar e a produção cair muito.','Irrigue se tiver. Nas próximas safras, plante na época indicada pelo zoneamento agrícola.'],
    }
    return { ...gradCrop, cls, label:SL[cls][0], icon:SL[cls][1],
      val: fmtPt(wv), cx: (wv-0.30)/0.50*TRACK_W,
      aria: `Umidade do solo ${fmtPt(wv)}, ${SL[cls][0]}`,
      imp: ADV[cls][0], fix: ADV[cls][1], hasCrop: true,
      m1: 0.45*TRACK_W, m2: 0.55*TRACK_W, unit: 'água ÷ necessidade' }
  }

  const wv = SOIL[idx] ?? 0.35
  const k = covered ? 'good' : (wv < 0.45 ? 'warn' : 'neu')
  const NS: Record<string,[string,string]> = { good:['Protegido','#i-okc'], warn:['Secando','#i-alert'], neu:['Sem cultura','#i-info'] }
  const ADV: Record<string,[string,string]> = {
    good: ['A palhada segura a umidade do solo.','Deixe a palhada no lugar até o plantio.'],
    warn: ['O solo descoberto perde água rápido e pode erodir.','Mantenha palhada ou plante uma cobertura (ex.: milheto).'],
    neu:  ['O solo ainda tem umidade razoável.','Planeje uma cobertura antes que ele fique descoberto.'],
  }
  const cls: StatusLevel = k === 'neu' ? 'good' : (k as StatusLevel)
  return { ...gradSoil, cls, label:NS[k][0], icon:NS[k][1],
    val: fmtPt(wv), cx: (Math.max(wv,0.3)-0.30)/0.50*TRACK_W,
    aria: `Umidade do solo ${fmtPt(wv)}, ${NS[k][0]}`,
    imp: ADV[k][0], fix: ADV[k][1], hasCrop: false,
    m1: null, m2: null, unit: 'água guardada no solo' }
}
