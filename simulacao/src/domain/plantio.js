// Posição de cada planta no talhão. Puro (sem DOM): usado pela lavoura desenhada e pelas corridas em lote
// da simulação (rotação, comparação). A ordem dos sorteios é fixa: mudar aqui muda a lavoura desenhada.
import { lerp, mulberry32 } from '../utils/math.js';

const MARGEM_FATOR = 0.5;

// Margem entre a borda do recorte e a primeira linha / planta. A margem de cada cultura é reduzida para
// a lavoura ir quase até a beira. Usada também pelos canteiros do topo (render/soil/surface2d.js).
export function margemPlantio(crop) {
    return Math.max(0.16, crop.plantio.margem * MARGEM_FATOR);
}

// variantes: quantas variantes de sprite existem (render/sprites/manifest.js); só afeta o campo `variante`.
export function gerarPlantas(crop, { width, depth, variantes = 3 }) {
    const { linhas: ROWS, plantasPorLinha: COLS, semente } = crop.plantio;
    const margem = margemPlantio(crop);
    const passoX = (width - margem * 2) / (COLS - 1);
    const passoZ = (depth - margem * 2) / (ROWS - 1);
    const M = crop.morfologia;
    const rng = mulberry32(semente);

    // Linhas de plantio correm em z: col = posição em x (linha), row = posição ao longo da linha.
    const plants = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            plants.push({
                px: -width / 2 + margem + c * passoX + (rng() - 0.5) * passoX * 0.12,
                pz: -depth / 2 + margem + r * passoZ + (rng() - 0.5) * passoZ * 0.3,
                row: r, col: c,
                seed: (r * 7919 + c * 104729 + semente) >>> 0,
                plantHeightMax: lerp(M.alturaMax[0], M.alturaMax[1], rng()),
                scaleJitter: 0.92 + rng() * 0.16,
                variante: Math.floor(rng() * variantes),
                lado: rng() < 0.5 ? -1 : 1,
                faseVento: rng() * Math.PI * 2,
                vis: null
            });
        }
    }
    return plants;
}
