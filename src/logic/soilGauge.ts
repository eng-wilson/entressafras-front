import type { SoilResult, StatusLevel } from '../types'

const TRACK_W = 268
const fmtPt = (v: number) => v.toFixed(2).replace('.', ',')

/**
 * Widget "Água para a cultura": atendimento à demanda (ETa/ETc) da fase em que a cultura está, da API
 * (`risk.mean_isna`, média das safras históricas). Não é umidade do solo. `provisorio`: o servidor marca o risco MOCK.
 */
export function soilGauge(atendimento: number | null, hasCrop: boolean, provisorio = false): SoilResult {
  const gradCrop = { c0:'#FF3B30',c1:'#FF3B30',c2:'#FF9500',c3:'#FF9500',c4:'#34C759',c5:'#34C759' }
  const gradSoil = { c0:'#D6E6F7',c1:'#D6E6F7',c2:'#9CC3EC',c3:'#9CC3EC',c4:'#3D8BE0',c5:'#3D8BE0' }

  if (hasCrop && atendimento != null && Number.isFinite(atendimento)) {
    const wv = Math.max(0, Math.min(1, atendimento))
    const cls: StatusLevel = wv < 0.45 ? 'risk' : wv < 0.55 ? 'warn' : 'good'
    const SL: Record<string,[string,string]> = { good:['Bom','#i-okc'], warn:['Atenção','#i-alert'], risk:['Crítico','#i-xc'] }
    return { ...gradCrop, cls, label:SL[cls][0], icon:SL[cls][1],
      val: fmtPt(wv), cx: wv*TRACK_W,
      aria: `Atendimento à demanda de água nesta fase ${fmtPt(wv)}, ${SL[cls][0]}, média histórica da API${provisorio ? ', provisório' : ''}`,
      imp: `Atendimento à demanda na fase, média das safras históricas da API${provisorio ? ' (provisório)' : ''}.`, fix: 'Confira os momentos de atenção e confirme as condições no campo.', hasCrop: true,
      m1: 0.45*TRACK_W, m2: 0.55*TRACK_W, unit: `ETa ÷ ETc · fase, média da API${provisorio ? ' · provisório' : ''}` }
  }

  return { ...gradSoil, cls: 'good', semDado: true, label: hasCrop ? 'Sem dado' : 'Sem demanda', icon: '#i-info',
    val: '—', cx: 0, aria: hasCrop ? 'Atendimento à demanda de água sem dado' : 'Sem cultura no período; demanda de água não avaliada',
    imp: 'A API não trouxe o atendimento à demanda desta fase.', fix: 'A tela não estima um valor no lugar.', hasCrop,
    m1: null, m2: null, unit: 'ETa ÷ ETc · API' }
}
