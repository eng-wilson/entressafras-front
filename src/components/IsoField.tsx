import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Visual config por estágio (fill, row, rw, ro)
// ---------------------------------------------------------------------------
const FILL: Record<string, [string, string, number, number]> = {
  bare:  ['#C8A37A', '#A9835B', 2,   0.6],
  ready: ['#A9825A', '#8C6A45', 3,   0.9],
  seed:  ['#B08860', '#8C6A45', 3,   0.9],
  emerg: ['#B08860', '#8C6A45', 3,   0.8],
  veg:   ['#A89464', '#7E9A4A', 3,   0.7],
  flor:  ['#6E8F48', '#5A7E3A', 3,   0.6],
  ench:  ['#5E8A3E', '#4E7A34', 3,   0.6],
  mat:   ['#BFA25A', '#A08744', 3,   0.6],
  straw: ['#D9C27A', '#B89A4E', 2.5, 0.8],
}

// ---------------------------------------------------------------------------
// SVG path helpers (idênticos à referência)
// ---------------------------------------------------------------------------
type Plant = { d: string; fill: string; stroke: string; sw: number }

const P = (x: number, y: number) => x.toFixed(1) + ' ' + y.toFixed(1)
const ell = (x: number, y: number, rx: number, ry: number) =>
  'M' + P(x - rx, y) +
  ' A' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' 0 1 0 ' + P(x + rx, y) +
  ' A' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' 0 1 0 ' + P(x - rx, y) + 'Z'
const ln = (x1: number, y1: number, x2: number, y2: number) => 'M' + P(x1, y1) + ' L' + P(x2, y2)
const qb = (x: number, y: number, cx: number, cy: number, ex: number, ey: number) =>
  'M' + P(x, y) + ' Q' + P(cx, cy) + ' ' + P(ex, ey)
const part = (d: string, fill: string | null, stroke: string | null, sw: number): Plant =>
  ({ d, fill: fill ?? 'none', stroke: stroke ?? 'none', sw })

// ---------------------------------------------------------------------------
// Funções de desenho das plantas (soja / milho) — transcritas da referência
// ---------------------------------------------------------------------------
function soja(k: string, x: number, y: number, s: number): Plant[] {
  if (k === 'seed') return [part(ell(x, y, 1.5 * s, 1 * s), '#5A3A1E', null, 0)]
  if (k === 'emerg') return [
    part(ln(x, y, x, y - 4 * s), null, '#5A9E3A', 1.1),
    part(ell(x - 1.9 * s, y - 4.3 * s, 1.9 * s, 1.1 * s), '#9BD068', null, 0),
    part(ell(x + 1.9 * s, y - 4.3 * s, 1.9 * s, 1.1 * s), '#9BD068', null, 0),
  ]
  const big = k === 'veg' ? 1 : 1.35
  const leaf = k === 'mat' ? '#CDA846' : k === 'veg' ? '#5DB244' : '#3F9A36'
  const stem = k === 'mat' ? '#9C7B3A' : '#4C8F32'
  const h = 7 * s * big
  const out: Plant[] = [
    part(ln(x, y, x, y - h), null, stem, 1.2),
    part(ell(x - 3 * s * big, y - h * 0.7,  3 * s * big, 1.8 * s * big), leaf, null, 0),
    part(ell(x + 3 * s * big, y - h * 0.75, 3 * s * big, 1.8 * s * big), leaf, null, 0),
    part(ell(x, y - h - 1.2 * s, 2.7 * s * big, 1.8 * s * big), leaf, null, 0),
  ]
  if (k === 'flor') {
    out.push(part(ell(x - 1.5 * s, y - h * 0.9,  0.9 * s, 0.9 * s), '#B48CE0', null, 0))
    out.push(part(ell(x + 2   * s, y - h * 1.05, 0.9 * s, 0.9 * s), '#F2EAFB', null, 0))
  }
  if (k === 'ench' || k === 'mat') {
    const pod = k === 'mat' ? '#7E5D33' : '#A6C565'
    out.push(part(ell(x - 1.6 * s, y - h * 0.45, 0.7 * s, 1.8 * s), pod, null, 0))
    out.push(part(ell(x + 1.6 * s, y - h * 0.5,  0.7 * s, 1.8 * s), pod, null, 0))
  }
  return out
}

function milho(k: string, x: number, y: number, s: number): Plant[] {
  if (k === 'seed') return [part(ell(x, y, 1.8 * s, 1.3 * s), '#E3B93C', null, 0)]
  if (k === 'emerg') return [
    part(ln(x, y, x, y - 5 * s), null, '#6BBF45', 1.6),
    part(qb(x, y - 3 * s, x + 2 * s, y - 5 * s, x + 3 * s, y - 4 * s), null, '#6BBF45', 1.2),
  ]
  const tall = k === 'veg' ? 13 : 22
  const h = tall * s
  const leaf = k === 'mat' ? '#C8A85A' : '#52A83A'
  const stem = k === 'mat' ? '#B08F45' : '#3F8F2E'
  const out: Plant[] = [part(ln(x, y, x, y - h), null, stem, 1.7)]
  const pairs = k === 'veg' ? [0.35, 0.7] : [0.3, 0.55, 0.8]
  pairs.forEach((f, i) => {
    const yy = y - h * f
    const dir = i % 2 ? 1 : -1
    out.push(part(qb(x, yy,     x + dir * 5 * s, yy - 4 * s, x + dir * 7 * s, yy + 1 * s), null, leaf, 1.8))
    out.push(part(qb(x, yy - 2 * s, x - dir * 4 * s, yy - 6 * s, x - dir * 6 * s, yy - 2 * s), null, leaf, 1.6))
  })
  if (k !== 'veg') {
    out.push(part(ln(x, y - h, x - 2 * s, y - h - 4 * s), null, '#D9B44A', 1.1))
    out.push(part(ln(x, y - h, x + 2 * s, y - h - 4 * s), null, '#D9B44A', 1.1))
    out.push(part(ln(x, y - h, x,          y - h - 5 * s), null, '#D9B44A', 1.1))
  }
  if (k === 'ench' || k === 'mat') {
    out.push(part(ell(x + 2.3 * s, y - h * 0.45, 1.6 * s, 3.4 * s),
      k === 'mat' ? '#C9A04A' : '#E8CB62',
      k === 'mat' ? '#9C7B3A' : '#7FB04E',
      0.8))
  }
  if (k === 'flor') {
    out.push(part(ell(x + 2 * s, y - h * 0.48, 0.9 * s, 2.2 * s), '#7FB04E', null, 0))
    out.push(part(ln(x + 2 * s, y - h * 0.48 - 2 * s, x + 3.5 * s, y - h * 0.48 - 4 * s), null, '#C77B4A', 0.8))
  }
  return out
}

// ---------------------------------------------------------------------------
// Geração das 63 plantas (grade 7×9) — memoizado por crop:stage
// ---------------------------------------------------------------------------
const plantCache: Record<string, Plant[]> = {}

function buildPlants(crop: 'soja' | 'milho', k: string): Plant[] {
  const growStages = ['seed', 'emerg', 'veg', 'flor', 'ench', 'mat']
  if (!growStages.includes(k)) return []

  const pts: { x: number; y: number; s: number }[] = []
  for (let a = 0; a < 7; a++) {
    for (let b = 0; b < 9; b++) {
      const u = 0.1 + b * 0.1
      const v = 0.1 + a * 0.133
      pts.push({
        x: 180 + 164 * u - 164 * v,
        y: 14  +  82 * u +  82 * v,
        s: 0.85 + 0.35 * ((u + v) / 2),
      })
    }
  }
  pts.sort((a, b) => a.y - b.y)

  const drawFn = crop === 'soja' ? soja : milho
  const raw: Plant[] = []
  pts.forEach(p => {
    const scale = crop === 'soja' ? p.s * 1.45 : p.s
    drawFn(k, p.x, p.y, scale).forEach(pp => raw.push(pp))
  })

  // Agrupa caminhos com o mesmo estilo num único <path>
  const grp: Record<string, Plant> = {}
  const grouped: Plant[] = []
  raw.forEach(pp => {
    const key = pp.fill + '|' + pp.stroke + '|' + pp.sw
    if (!grp[key]) {
      grp[key] = { d: '', fill: pp.fill, stroke: pp.stroke, sw: pp.sw }
      grouped.push(grp[key])
    }
    grp[key].d += pp.d
  })
  return grouped
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
type Props = {
  crop: 'soja' | 'milho' | null
  stageKey: string
  stageName: string
  periodLabel: string
}

export function IsoField({ crop, stageKey, stageName, periodLabel }: Props) {
  const fz = FILL[stageKey] ?? FILL.bare
  const [fill, row, rw, ro] = fz

  const hasC = crop !== null
  const pill = hasC
    ? (crop === 'soja' ? 'Soja' : 'Milho') + ' · ' + stageName.toLowerCase()
    : (stageKey === 'ready' ? 'Pronto para o plantio' : stageName)

  const plants = useMemo(() => {
    if (!crop) return []
    const pkey = crop + ':' + stageKey
    if (!plantCache[pkey]) plantCache[pkey] = buildPlants(crop, stageKey)
    return plantCache[pkey]
  }, [crop, stageKey])

  return (
    <div className="isow">
      <svg
        className="iso"
        viewBox="0 0 360 200"
        role="img"
        aria-label={`Talhão em ${periodLabel}: ${pill}`}
      >
        <defs>
          <clipPath id="topclip">
            <polygon points="180,14 344,96 180,178 16,96" />
          </clipPath>
        </defs>
        {/* Faces laterais */}
        <polygon points="16,96 180,178 180,194 16,112"  fill="#9C7A55" />
        <polygon points="180,178 344,96 344,112 180,194" fill="#7E6142" />
        {/* Face superior (solo) */}
        <polygon points="180,14 344,96 180,178 16,96" fill={fill} />
        {/* Linhas de plantio */}
        <g clipPath="url(#topclip)" stroke={row} strokeWidth={rw} strokeLinecap="round" opacity={ro}>
          <line x1="16"  y1="96"  x2="180" y2="14" />
          <line x1="32"  y1="104" x2="196" y2="22" />
          <line x1="48"  y1="112" x2="212" y2="30" />
          <line x1="64"  y1="120" x2="228" y2="38" />
          <line x1="80"  y1="128" x2="244" y2="46" />
          <line x1="96"  y1="136" x2="260" y2="54" />
          <line x1="112" y1="144" x2="276" y2="62" />
          <line x1="128" y1="152" x2="292" y2="70" />
          <line x1="144" y1="160" x2="308" y2="78" />
          <line x1="160" y1="168" x2="324" y2="86" />
          <line x1="176" y1="176" x2="340" y2="94" />
        </g>
        {/* Contorno */}
        <polygon points="180,14 344,96 180,178 16,96" fill="none" stroke="rgba(0,0,0,.18)" />
        {/* Plantas */}
        <g className="plants">
          {plants.map((pp, i) => (
            <path
              key={i}
              d={pp.d}
              fill={pp.fill}
              stroke={pp.stroke}
              strokeWidth={pp.sw}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>
      <div className="fpill" aria-hidden="true">
        <span className="fsw" style={{ background: fill }} />
        {pill}
      </div>
    </div>
  )
}
