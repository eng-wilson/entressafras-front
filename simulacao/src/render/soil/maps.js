// Camadas do modo mapa do solo e leitura dos retratos diários da simulação.
// Fontes: 0..2 = S0..S2 (superfície), 3 = P0, 4 = P1 (por camada). comp = componente RGBA.
import { GRID, CAMADAS, CAMADA_M } from '../../simulation/season.js';

export const MAPAS_SOLO = {
    umidade: { rotulo: 'Umidade do solo', src: 3, comp: 0, min: 'seco', max: 'saturado' },
    compactacao: { rotulo: 'Resistência à penetração', src: 3, comp: 1, min: '0 MPa', max: '4 MPa' },
    acidez: { rotulo: 'Acidez / saturação por Al', src: 3, comp: 3, min: 'corrigido', max: 'Al tóxico' },
    mo: { rotulo: 'Matéria orgânica', src: 3, comp: 2, min: 'baixa', max: 'alta' },
    biologia: { rotulo: 'Atividade biológica', src: 4, comp: 0, min: 'baixa', max: 'alta' },
    temperatura: { rotulo: 'Temperatura da superfície', src: 2, comp: 0, min: '10 °C', max: '70 °C' },
    cobertura: { rotulo: 'Cobertura (palhada)', src: 1, comp: 0, min: '0 %', max: '100 %' },
    crosta: { rotulo: 'Crosta superficial', src: 0, comp: 1, min: 'solta', max: 'selada' }
};

// Array Uint8 e passo de camada para a fonte do mapa no dia.
export function fonteMapa(sim, dia, id) {
    const m = MAPAS_SOLO[id];
    const s = sim.superficie[dia], p = sim.perfil[dia];
    const arr = [s.S0, s.S1, s.S2, p.P0, p.P1][m.src];
    return { arr, comp: m.comp, porCamada: m.src >= 3 };
}

// Índice RGBA da célula (i, j) na camada k (k = 0 para texturas de superfície).
export const idx2D = (i, j) => (j * GRID + i) * 4;
export const idx3D = (i, j, k) => ((k * GRID + j) * GRID + i) * 4;
export { GRID, CAMADAS, CAMADA_M };
