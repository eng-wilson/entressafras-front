import type { CropDetail, TempResult, StatusLevel } from '../types'
import { SEM_DADO } from './formato'

const TRACK_W = 268
const X = (v: number) => Math.max(0, Math.min(45, v)) / 45 * TRACK_W
const off = (v: number) => (Math.max(0, Math.min(45, v)) / 45).toFixed(3)

/** Temperaturas do decêndio em °C; null = sem dado. */
export type FaixaTemp = { tmin: number | null; tmax: number | null; tminExtremo?: number | null }

const gradCrop = {
  z0:'0',       c0:'#2F6FD0',
  z1:off(2),    c1:'#2F6FD0',
  z2:off(10),   c2:'#6FB1F0',
  z3:off(14),   c3:'#5AC8B4',
  z4:off(18),   c4:'#34C759',
  z5:off(23),   c5:'#34C759',
  z6:off(27),   c6:'#FFCC00',
  z7:off(31),   c7:'#FF9500',
  z8:off(40),   c8:'#FF3B30',
}
const gradSoil = {
  z0:'0',   c0:'#C9DDF2', z1:'.2',  c1:'#C9DDF2',
  z2:'.35', c2:'#E4E1DA', z3:'.45', c3:'#EFE0CC',
  z4:'.55', c4:'#F2D7B8', z5:'.62', c5:'#F2D7B8',
  z6:'.7',  c6:'#EDBF8E', z7:'.8',  c7:'#E8A766',
  z8:'.9',  c8:'#D9772E',
}

// Rótulos arredondados (spec: números redondos); geometria e limiares usam o valor bruto.
const grau = (v: number) => `${Math.round(v)}°`

export function tempGauge(
  crop: 'soja' | 'milho' | null,
  stageK: string,
  covered: boolean,
  faixa: FaixaTemp,
  referencia: CropDetail | null = null
): TempResult {
  const { tmin: lo, tmax: hi } = faixa

  if (lo == null || hi == null) {
    return {
      ...(crop ? gradCrop : gradSoil),
      cls: 'good', label: SEM_DADO, icon: '#i-info', semDado: true,
      tmin: null, tmax: null, aria: 'Temperatura: sem dado',
      imp: 'Sem dado de temperatura para este talhão.', fix: 'Tente de novo mais tarde.',
      hasCrop: !!crop, rx: 0, rw: 0, x1: -20, x2: -20, x3: -20, x4: -20,
      loLabel: '–', hiLabel: '–', loX: 0, hiX: 0, merged: true,
    }
  }

  const loX = X(lo), hiX = X(hi)
  const loLabel = grau(lo), hiLabel = grau(hi)
  const merged = (hiX - loX) / TRACK_W < 0.19
  const aria = (label: string) => `Temperatura de ${Math.round(lo)} a ${Math.round(hi)} graus, ${label}`

  if (!crop) {
    const tk = covered ? 'good' : (hi >= 32 ? 'warn' : 'neu')
    const labels: Record<string,[string,string,string]> = {
      good: ['Protegido','#i-okc','A palhada mantém o solo mais fresco.'],
      warn: ['Exposto','#i-alert','O sol esquenta o solo descoberto e ele seca mais rápido.'],
      neu:  ['Sem cultura','#i-info','Sem calor forte agora.'],
    }
    const [label, icon, imp] = labels[tk]
    const cls: StatusLevel = tk === 'neu' ? 'good' : (tk as StatusLevel)
    return { ...gradSoil, cls, label, icon, semDado:false, tmin:lo, tmax:hi, aria:aria(label), imp, fix:'Mantenha o solo coberto.', hasCrop:false, rx:loX, rw:Math.max(10, hiX-loX), x1:-20,x2:-20,x3:-20,x4:-20, loLabel, hiLabel, loX, hiX, merged }
  }

  const t = referencia?.temperature
  const geometria = { semDado: false, tmin: lo, tmax: hi, hasCrop: true,
    rx: loX, rw: Math.max(10, hiX - loX), loLabel, hiLabel, loX, hiX, merged }
  if (!t || t.optimal_min == null || t.optimal_max == null || t.absolute_min == null || t.absolute_max == null) {
    return { ...gradSoil, ...geometria, cls: 'good', label: 'Sem referência', icon: '#i-info',
      aria: aria('Sem referência da cultura'), imp: 'Requisitos térmicos indisponíveis.',
      fix: 'Consulte os dados da cultura.', x1: -20, x2: -20, x3: -20, x4: -20 }
  }
  // Faixas gerais da espécie (EcoCrop); nenhuma regra fenológica é inventada quando o catálogo não a fornece.
  // A faixa ótima do EcoCrop vale para a temperatura MÉDIA: comparar a mínima da madrugada com o ótimo dava
  // "Frio" a 23–33 °C (milheto, ótimo 25–35). Os limites absolutos seguem nos extremos: noite abaixo do mínimo
  // ou tarde acima do máximo tolerado é risco real, mesmo com a média boa.
  const media = (lo + hi) / 2
  const cold: StatusLevel = lo < t.absolute_min ? 'risk' : media < t.optimal_min ? 'warn' : 'good'
  const hot: StatusLevel = hi > t.absolute_max ? 'risk' : media > t.optimal_max ? 'warn' : 'good'
  // Limite letal inicial só vale em semeadura/emergência e usa extremo histórico, não a média.
  const geada = (stageK === 'seed' || stageK === 'emerg') && t.killing_early_growth != null
    && faixa.tminExtremo != null && faixa.tminExtremo <= t.killing_early_growth
  const rank = { good:0, warn:1, risk:2 }
  const side = rank[cold] >= rank[hot] && cold !== 'good' ? 'cold' : (hot !== 'good' ? 'hot' : 'none')
  const lvl: StatusLevel = geada ? 'risk' : side === 'cold' ? cold : side === 'hot' ? hot : 'good'
  const LVL: Record<string,string> = { warn:'Atenção', risk:'Risco' }
  const label = geada ? 'Geada · Risco histórico' : lvl === 'good' ? 'Bom'
    : side === 'cold' ? `Frio · ${LVL[lvl]}`
    : `Calor · ${LVL[lvl]}`
  const icon = lvl === 'good' ? '#i-okc' : lvl === 'warn' ? '#i-alert' : '#i-xc'
  const grad = { ...gradCrop, z1: off(t.absolute_min), z2: off(t.optimal_min),
    z3: off(t.optimal_min), z4: off((t.optimal_min + t.optimal_max) / 2),
    z5: off(t.optimal_max), z6: off(t.optimal_max), z7: off(t.absolute_max), z8: '1' }
  return {
    ...grad, ...geometria, cls: lvl, label, icon,
    aria: aria(label),
    imp: geada ? 'Extremo histórico atingiu o limite letal inicial informado pelo EcoCrop.'
      : `Média do decêndio de ${grau(media)}, comparada à faixa ótima de ${referencia!.scientific_name} (EcoCrop, ${grau(t.optimal_min)} a ${grau(t.optimal_max)}).`,
    fix: 'Requisitos gerais da espécie; avalie cultivar e condições locais com seu agrônomo.',
    x1: X(t.absolute_min), x2: X(t.optimal_min), x3: X(t.optimal_max), x4: X(t.absolute_max),
  }
}
