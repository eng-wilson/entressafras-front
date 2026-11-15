import { writeFileSync } from 'node:fs';

const posturas = ['normal', 'enrolada', 'murcha'];
const estados = ['cheia', 'parcial', 'abortada'];
const variantes = [0, 1, 2];

const fases = [
    ['V0', 'V0_emergencia', [111, 295], 2273, false],
    ['V1', 'V0_emergencia', [111, 295], 1663, false],
    ['V2', 'V4_vegetativo', [268, 591], 2139, false],
    ['V3', 'V4_vegetativo', [268, 591], 1260, false],
    ['V4', 'V4_vegetativo', [268, 591], 816, false],
    ['R5', 'R6_floracao', [257, 691], 871, false],
    ['R6', 'R6_floracao', [257, 691], 871, false],
    ['R7', 'R8_vagens', [202, 688], 874, true],
    ['R8', 'R8_vagens', [202, 688], 874, true],
    ['R9', 'R9_maturacao', [148, 693], 876, true]
];

const sprites = {};
for (const [id, arquivo, ancora, resolucao, reprodutiva] of fases) {
    for (const postura of posturas) {
        for (const estado of reprodutiva ? estados : [null]) {
            for (const variante of variantes) {
                const sufixoEstado = reprodutiva ? `_${estado}` : '';
                const nome = `${id}_${postura}${sufixoEstado}_${variante}`;
                sprites[nome] = {
                    cor: `${arquivo}.png`,
                    dados: `${arquivo}.dados.png`,
                    ancora,
                    resolucao
                };
            }
        }
    }
}

writeFileSync(
    new URL('../assets/sprites/feijao/manifest.json', import.meta.url),
    `${JSON.stringify({ sprites }, null, 2)}\n`
);

console.log(`Manifesto do feijão: ${Object.keys(sprites).length} entradas.`);
