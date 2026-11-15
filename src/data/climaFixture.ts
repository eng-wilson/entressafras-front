// Resposta de /api/clima/decendios construída a partir do mock: chuva mensal soma exatamente THIS_RAIN e as
// temperaturas são TMIN/TMAX. Serve aos testes unitários e ao Playwright (paridade visual com a referência).
import type { ClimaDecendios, Decendio } from '../types'
import { LEN, MONTHS_SHORT, THIS_RAIN, TMAX, TMIN } from './mock'

export function climaDeMock(): ClimaDecendios {
  const decendios: Decendio[] = Array.from({ length: 36 }, (_, i) => {
    const m = Math.floor(i / 3), d = i % 3
    const mm = THIS_RAIN[m], q = Math.floor(mm / 3)
    const chuva = d < 2 ? q : mm - 2 * q
    const tmin = TMIN[i], tmax = TMAX[i]
    const faixa = d === 0 ? '1-10' : d === 1 ? '11-20' : '21-fim'
    return {
      idx: i,
      rotulo: `${faixa} ${MONTHS_SHORT[m].toLowerCase()}`,
      dias: d < 2 ? 10 : LEN[m] - 20,
      anos_validos: 10,
      dias_preenchidos: 0,
      chuva_media: chuva,
      chuva_p20: Math.round(chuva * 0.4 * 100) / 100,
      et0_media: 45,
      tmin_media: tmin,
      tmin_extremo_medio: tmin - 2,
      tmin_absoluto: tmin - 4,
      tmax_media: tmax,
      tmax_extremo_medio: tmax + 2,
      tmax_absoluto: tmax + 4,
      gwettop_media: 0.5,
      gwetroot_media: 0.6,
    }
  })
  return {
    ponto: { lat: -12.54285, lon: -55.717 },
    celula: { lat: -12.5, lon: -55.625, elev: 370.59 },
    safras: ['2016/17', '2017/18', '2018/19', '2019/20', '2020/21', '2021/22', '2022/23', '2023/24', '2024/25', '2025/26'],
    fonte: 'NASA POWER (comunidade AG), série diária; ET0 FAO-56 Penman-Monteith',
    aviso_resolucao: 'Dados do NASA POWER numa grade de ~50 km (0,5° × 0,625°): o resultado vale para a região, não para o talhão. Talhões vizinhos caem na mesma célula.',
    decendios,
  }
}
