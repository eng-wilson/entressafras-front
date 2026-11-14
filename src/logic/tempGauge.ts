import { TMIN, TMAX } from '../data/mock'
import type { TempResult, StatusLevel } from '../types'

const TRACK_W = 268
const X = (v: number) => Math.max(0, Math.min(45, v)) / 45 * TRACK_W
const off = (v: number) => (Math.max(0, Math.min(45, v)) / 45).toFixed(3)

export function tempGauge(
  crop: 'soja' | 'milho' | null,
  stageK: string,
  covered: boolean,
  idx: number
): TempResult {
  const lo = TMIN[idx], hi = TMAX[idx]
  const loX = X(lo), hiX = X(hi)
  const loLabel = `${lo}°`, hiLabel = `${hi}°`
  const merged = (hiX - loX) / TRACK_W < 0.19

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

  if (!crop) {
    const tk = covered ? 'good' : (hi >= 32 ? 'warn' : 'neu')
    const labels: Record<string,[string,string,string]> = {
      good: ['Protegido','#i-okc','A palhada mantém o solo mais fresco.'],
      warn: ['Exposto','#i-alert','O sol esquenta o solo descoberto e ele seca mais rápido.'],
      neu:  ['Sem cultura','#i-info','Sem calor forte agora.'],
    }
    const [label, icon, imp] = labels[tk]
    const cls: StatusLevel = tk === 'neu' ? 'good' : (tk as StatusLevel)
    return { ...gradSoil, cls, label, icon, tmin:lo, tmax:hi, aria:`Temperatura de ${lo} a ${hi} graus, ${label}`, imp, fix:'Mantenha o solo coberto.', hasCrop:false, rx:loX, rw:Math.max(10, hiX-loX), x1:-20,x2:-20,x3:-20,x4:-20, loLabel, hiLabel, loX, hiX, merged }
  }

  const flor = crop === 'soja' && stageK === 'flor'
  const coldA = flor ? 13 : 10
  const hotA = crop === 'soja' ? 30 : null
  const hotC = crop === 'soja' ? 40 : null
  const cold: StatusLevel = lo <= 2 ? 'risk' : lo < coldA ? 'warn' : 'good'
  const hot: StatusLevel = hotA == null ? 'good' : hi > (hotC as number) ? 'risk' : hi > hotA ? 'warn' : 'good'
  const rank = { good:0, warn:1, risk:2 }
  const side = rank[cold] >= rank[hot] && cold !== 'good' ? 'cold' : (hot !== 'good' ? 'hot' : 'none')
  const lvl: StatusLevel = side === 'cold' ? cold : side === 'hot' ? hot : 'good'
  const LVL: Record<string,string> = { warn:'Atenção', risk:'Risco' }
  const label = lvl === 'good' ? 'Bom'
    : side === 'cold' ? (lvl === 'risk' ? 'Geada · Risco' : 'Frio · Atenção')
    : `Calor · ${LVL[lvl]}`
  const icon = lvl === 'good' ? '#i-okc' : lvl === 'warn' ? '#i-alert' : '#i-xc'
  const ADV: Record<string,[string,string]> = {
    good:     ['A temperatura está boa para a cultura.','Nada a fazer.'],
    coldwarn: flor ? ['Com noites frias, a soja floresce mal.','Prefira plantar na época indicada pelo zoneamento, longe dos meses frios.'] : ['Com frio, a planta cresce devagar.','Prefira plantar na época indicada pelo zoneamento, longe dos meses frios.'],
    coldrisk: ['Geada pode queimar as folhas e matar a planta.','Plante mais cedo para colher antes do frio ou use uma cultivar de ciclo curto.'],
    hotwarn:  ['O calor começa a pesar. A planta gasta mais água.','Mantenha o solo coberto com palhada e fique de olho na água.'],
    hotrisk:  ['Calor forte. A planta pode perder flores e grãos.','Irrigue nas horas mais quentes, se puder. Nas próximas safras, ajuste a época de plantio.'],
  }
  const ak = lvl === 'good' ? 'good' : side + lvl
  return {
    ...gradCrop, cls: lvl, label, icon, tmin:lo, tmax:hi,
    aria: `Temperatura de ${lo} a ${hi} graus, ${label}`,
    imp: ADV[ak][0], fix: ADV[ak][1], hasCrop: true,
    rx: loX, rw: Math.max(10, hiX - loX),
    x1: X(2), x2: X(coldA),
    x3: hotA == null ? -20 : X(hotA),
    x4: hotC == null ? -20 : X(hotC),
    loLabel, hiLabel, loX, hiX, merged,
  }
}
