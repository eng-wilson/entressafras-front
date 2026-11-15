import { writeFileSync } from 'node:fs';

const posturas = ['normal', 'enrolada', 'murcha'];
const estados = ['cheia', 'parcial', 'abortada'];
const variantes = [0, 1, 2];

const fases = [
    ['E', 'E_emergencia', [91, 293], 2231, false],
    ['AF', 'AF_perfilhamento', [282, 494], 1899, false],
    ['AL', 'EMB_alongamento', [190, 642], 1061, false],
    ['EMB', 'EMB_alongamento', [190, 642], 804, false],
    ['ESP', 'ESP_espigamento', [201, 693], 861, true],
    ['ANT', 'ESP_espigamento', [201, 693], 861, true],
    ['GL', 'ESP_espigamento', [201, 693], 861, true],
    ['MAS', 'M_maturacao', [217, 693], 861, true],
    ['M', 'M_maturacao', [217, 693], 861, true]
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
    new URL('../assets/sprites/trigo/manifest.json', import.meta.url),
    `${JSON.stringify({ sprites }, null, 2)}\n`
);

console.log(`Manifesto do trigo: ${Object.keys(sprites).length} entradas.`);
