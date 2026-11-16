// Padrão de ladrilhos da marca (guia de identidade, seção 05): cada ladrilho é uma fase do talhão. Só para
// onboarding, telas vazias e capas, nunca atrás de dados. Sorteio com semente fixa: o desenho é sempre o mesmo.
import { useMemo } from 'react'

const C = { mata: '#16351F', folha: '#1F5130', broto: '#A6CE39', milho: '#E5A823', palha: '#F3EEDC' }

/** Ladrilhos 60×60: f = desenho, b = fundo. */
const LADRILHOS: Record<string, (f: string, b: string) => string> = {
  solo: (f, b) => `<rect width="60" height="60" fill="${b}"/><path d="M0 60A60 60 0 0 1 60 0V60Z" fill="${f}"/>`,
  linhas: (f, b) => `<rect width="60" height="60" fill="${b}"/>${[8, 22, 36, 50].map(y => `<rect x="6" y="${y}" width="48" height="5" rx="2.5" fill="${f}"/>`).join('')}`,
  broto: (f, b) => `<rect width="60" height="60" fill="${b}"/><rect x="28" y="30" width="4" height="22" rx="2" fill="${f}"/><path d="M30 32C30 20 22 12 10 12C10 24 18 32 30 32Z M30 32C30 22 38 14 50 14C50 26 42 32 30 32Z" fill="${f}"/>`,
  folha: (f, b) => `<rect width="60" height="60" fill="${b}"/><path d="M6 54C6 26 26 6 54 6C54 34 34 54 6 54Z" fill="${f}"/><path d="M10 50L44 16" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
  palhada: (f, b) => `<rect width="60" height="60" fill="${b}"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${-10 + i * 16}" y="-6" width="6" height="80" rx="3" fill="${f}" transform="rotate(30 30 30)"/>`).join('')}`,
  chuva: (f, b) => `<rect width="60" height="60" fill="${b}"/>${[[18, 16], [42, 10], [30, 36], [12, 44], [48, 40]].map(([x, y]) => `<path d="M${x} ${y - 8}c4 6 6 8.5 6 11a6 6 0 0 1-12 0c0-2.5 2-5 6-11z" fill="${f}"/>`).join('')}`,
  sol: (f, b) => `<rect width="60" height="60" fill="${b}"/><circle cx="30" cy="60" r="22" fill="${f}"/>${[-60, -30, 0, 30, 60].map(a => `<rect x="28" y="4" width="4" height="14" rx="2" fill="${f}" transform="rotate(${a} 30 60)"/>`).join('')}`,
  semente: (f, b) => `<rect width="60" height="60" fill="${b}"/>${[[15, 15], [45, 15], [15, 45], [45, 45]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="10" fill="${f}" transform="rotate(35 ${x} ${y})"/>`).join('')}`,
}
const FIXOS = new Set(['broto', 'chuva', 'sol'])
const PALETA: [string, string][] = [[C.broto, C.mata], [C.milho, C.mata], [C.mata, C.broto], [C.palha, C.folha]]

function desenhar(cols: number, linhas: number, semente: number): string {
  let s = semente
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const nomes = Object.keys(LADRILHOS)
  let h = ''
  for (let r = 0; r < linhas; r++) for (let c = 0; c < cols; c++) {
    const k = nomes[Math.floor(rnd() * nomes.length)]
    const [f, b] = PALETA[Math.floor(rnd() * PALETA.length)]
    const rot = FIXOS.has(k) ? 0 : [0, 90, 180, 270][Math.floor(rnd() * 4)]
    h += `<g transform="translate(${c * 40} ${r * 40}) scale(${40 / 60})"><g transform="rotate(${rot} 30 30)">${LADRILHOS[k](f, b)}</g></g>`
  }
  return h
}

type Props = { cols?: number; linhas?: number; semente?: number; className?: string }

export function PadraoMarca({ cols = 12, linhas = 3, semente = 11, className }: Props) {
  const html = useMemo(() => desenhar(cols, linhas, semente), [cols, linhas, semente])
  return (
    <svg className={className} viewBox={`0 0 ${cols * 40} ${linhas * 40}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }} />
  )
}
