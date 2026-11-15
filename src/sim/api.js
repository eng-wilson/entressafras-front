// Ponte para a simulação portátil em /simulacao (JS puro, sem build). Os tipos ficam em api.d.ts.
// Só o que o app usa passa por aqui; o resto da pasta continua importável direto, se precisar.
export { createTalhao, CLASSES_SOLO, CULTURAS, soloLocal, fonteSintetica } from '../../simulacao/index.js'
export { NORMAIS } from '../../simulacao/src/climate/clima-regional.js'
export { radiacaoExtraterrestre } from '../../simulacao/src/climate/et0.js'
