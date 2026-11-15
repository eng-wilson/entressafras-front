// Classes, rótulos e ícones da chuva mensal (HANDOFF-SPEC §5.4).

export type ClasseChuva = 'dry' | 'low' | 'good' | 'wet'

/** < 60 seco · 60–149 pouca · 150–300 boa · > 300 muita (mm no mês). */
export const classeChuva = (mm: number): ClasseChuva =>
  mm < 60 ? 'dry' : mm < 150 ? 'low' : mm <= 300 ? 'good' : 'wet'

export const ROTULO_CHUVA: Record<ClasseChuva, string> = {
  dry: 'Seco', low: 'Pouca chuva', good: 'Chuva boa', wet: 'Muita chuva',
}

/** Ícone do mês: sol, garoa, ou chuva (com sol de nov a jan). `mi` é o mês 0–11 a partir de setembro. */
export function iconeChuva(mm: number, mi: number): string {
  const rk = classeChuva(mm)
  if (rk === 'dry') return '/canvas-icons.svg#w-sun'
  if (rk === 'low') return '/canvas-icons.svg#w-drizzle'
  return mi >= 2 && mi <= 4 ? '/canvas-icons.svg#w-mixed' : '/canvas-icons.svg#w-rain'
}

/** Altura do preenchimento do trilho (satura em 400 mm). */
export const alturaChuva = (mm: number) => `${(Math.min(mm, 400) / 400 * 100).toFixed(1)}%`

// Faixas ilustrativas proporcionais às mensais (1/3), sem calibração agronômica.
export const classeChuvaDecendio = (mm: number): ClasseChuva => classeChuva(mm * 3)
export const MARCAS_CHUVA_DECENDIO = [20, 50, 100] as const
export const alturaChuvaDecendio = (mm: number) => `${(Math.max(0, Math.min(mm, 150)) / 150 * 100).toFixed(1)}%`
