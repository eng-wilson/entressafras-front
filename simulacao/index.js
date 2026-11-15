// API pública. Os módulos do motor também podem ser importados diretamente de src/.
export { criarSimulacao } from './src/components/simulacao.js';
export { createTalhao } from './src/components/talhao.js';
export { desenharRetrato } from './src/components/retrato.js';
export { createPainelImpacto, sinalVital } from './src/components/impacto-talhao.js';
export { medidorVertical } from './src/components/graficos.js';
export { simulateSeason } from './src/simulation/season.js';
export { simulateRotacao, ROTACOES } from './src/simulation/rotacao.js';
export { CULTURAS } from './src/domain/crops/catalogo.js';
export { CLASSES_SOLO } from './src/domain/soil/presets.js';
export { soloLocal } from './src/domain/soil/solo-local.js';
export { CENARIOS } from './src/domain/soil/scenarios.js';
export { fontePower, fonteSintetica, comCenario } from './src/climate/fonte-clima.js';
export { estadoDecendio } from './src/decision/estado-decendio.js';
export { panoramaRotacao } from './src/decision/panorama-rotacao.js';
