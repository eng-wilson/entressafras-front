import { writeFileSync } from 'node:fs';

const posturas = ['normal', 'enrolada', 'murcha'];
const estados = ['cheia', 'parcial', 'abortada'];
const variantes = [0, 1, 2];

// Uma arte-chave pode representar fases vizinhas. A resolução varia por fase
// para preservar a altura de referência usada pela lavoura.
const fases = [
    ['VE', 'VE_emergencia', [116, 293], 2081, false],
    ['VC', 'VE_emergencia', [116, 293], 1517, false],
    ['V2', 'V4_vegetativo', [214, 591], 1736, false],
    ['V4', 'V4_vegetativo', [214, 591], 921, false],
    ['V6', 'V4_vegetativo', [214, 591], 649, false],
    ['R1', 'R1_floracao', [218, 691], 716, false],
    ['R3', 'R5_vagens', [218, 691], 716, true],
    ['R5', 'R5_vagens', [218, 691], 716, true],
    ['R6', 'R5_vagens', [218, 691], 716, true],
    ['R7', 'R8_maturacao', [166, 691], 716, true],
    ['R8', 'R8_maturacao', [166, 691], 716, true]
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
    new URL('../assets/sprites/soja/manifest.json', import.meta.url),
    `${JSON.stringify({ sprites }, null, 2)}\n`
);

console.log(`Manifesto da soja: ${Object.keys(sprites).length} entradas.`);
