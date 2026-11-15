import type { SoilResult, StatusLevel } from '../types'

const TRACK_W = 268
const fmtPt = (v: number) => v.toFixed(2).replace('.', ',')

export function soilGauge(atendimento: number | null, hasCrop: boolean): SoilResult {
  const gradCrop = { c0:'#FF3B30',c1:'#FF3B30',c2:'#FF9500',c3:'#FF9500',c4:'#34C759',c5:'#34C759' }
  const gradSoil = { c0:'#D6E6F7',c1:'#D6E6F7',c2:'#9CC3EC',c3:'#9CC3EC',c4:'#3D8BE0',c5:'#3D8BE0' }

  if (hasCrop && atendimento != null && Number.isFinite(atendimento)) {
    const wv = Math.max(0, Math.min(1, atendimento))
    const cls: StatusLevel = wv < 0.45 ? 'risk' : wv < 0.55 ? 'warn' : 'good'
    const SL: Record<string,[string,string]> = { good:['Bom','#i-okc'], warn:['Atenção','#i-alert'], risk:['Crítico','#i-xc'] }
    return { ...gradCrop, cls, label:SL[cls][0], icon:SL[cls][1],
      val: fmtPt(wv), cx: wv*TRACK_W,
      aria: `Atendimento à demanda de água ${fmtPt(wv)}, ${SL[cls][0]}, simulação local`,
      imp: 'Atendimento à demanda no quadro da simulação local.', fix: 'Confira os momentos de atenção e confirme as condições no campo.', hasCrop: true,
      m1: 0.45*TRACK_W, m2: 0.55*TRACK_W, unit: 'ETa ÷ ETc · simulação local' }
  }

  return { ...gradSoil, cls: 'good', semDado: true, label: hasCrop ? 'Sem dado' : 'Sem demanda', icon: '#i-info',
    val: '—', cx: 0, aria: hasCrop ? 'Atendimento à demanda de água sem dado' : 'Sem cultura no período; demanda de água não avaliada',
    imp: 'Não há atendimento à demanda calculado para este quadro.', fix: 'Consulte os limites da simulação.', hasCrop,
    m1: null, m2: null, unit: 'Simulação local' }
}
