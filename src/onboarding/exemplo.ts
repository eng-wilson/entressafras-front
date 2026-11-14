import type { Contorno, DadosTalhao, Ponto } from '../types'
import { areaHa, centroide } from '../logic/geo'

/** Vista quando a localização do navegador não está disponível: Rio Verde, GO. */
export const VISTA_INICIAL: Ponto & { zoom: number } = { lat: -17.95, lon: -51.05, zoom: 14 }

/** Lavoura perto de Rio Verde, GO (~43 ha), a mesma do protótipo entressafras. */
export const TALHAO_EXEMPLO: Contorno = [
  [-17.9472, -51.0533], [-17.9472, -51.0467], [-17.9528, -51.0467], [-17.9528, -51.0533],
]

export function dadosExemplo(): DadosTalhao {
  return {
    nome: 'Talhão exemplo', contorno: TALHAO_EXEMPLO, areaHa: areaHa(TALHAO_EXEMPLO), centro: centroide(TALHAO_EXEMPLO),
    textura: 'argiloso', texturaInformada: true, texturaPeloLaudo: false, analise: null, historico: null,
  }
}
