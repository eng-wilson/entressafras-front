// Teste de referência da simulação: roda todos os cenários em todas as classes de solo e compara
// um hash dos retratos diários (superfície, perfil, plantas) com o valor gravado.
// Serve para refatorar src/sim sem mudar o comportamento: o hash tem que bater bit a bit.
//
// Uso:
//   node test/sim-referencia.mjs           compara com test/sim-referencia.json
//   node test/sim-referencia.mjs --gravar  grava os hashes atuais (só quando a mudança de comportamento for intencional)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulateSeason } from '../src/simulation/season.js';
import { CENARIOS } from '../src/domain/soil/scenarios.js';
import { CLASSES_SOLO } from '../src/domain/soil/presets.js';
import crop from '../src/domain/crops/milho.js';
import { mulberry32 } from '../src/utils/math.js';

const ARQ = fileURLToPath(new URL('./sim-referencia.json', import.meta.url));
const WIDTH = 4.2, DEPTH = 4.2;

// Lavoura fixa (7 x 7 com jitter), independente de crop.plantio, para o teste não mudar quando o plantio mudar.
function plantasFixas() {
    const rng = mulberry32(1337), plants = [];
    const n = 7, margem = 0.42, passo = (WIDTH - 2 * margem) / (n - 1);
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            plants.push({
                px: -WIDTH / 2 + margem + c * passo + (rng() - 0.5) * passo * 0.12,
                pz: -DEPTH / 2 + margem + r * passo + (rng() - 0.5) * passo * 0.3,
                seed: (r * 7919 + c * 104729 + 1337) >>> 0
            });
        }
    }
    return plants;
}

function hashSim(sim) {
    const h = createHash('sha256');
    const add = a => h.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
    for (const k of ['chuva', 'tmax', 'tmin', 'et0']) add(Float64Array.from(sim.clima[k]));
    add(sim.relevo); add(sim.trafego); add(Int32Array.from(sim.celP));
    for (let d = 0; d <= sim.dias; d++) {
        const s = sim.superficie[d], p = sim.perfil[d];
        add(s.S0); add(s.S1); add(s.S2); add(p.P0); add(p.P1); add(p.P2); add(sim.plantas[d]);
    }
    const dec = sim.decodificar;
    h.update(JSON.stringify([dec.umidadePct(0.5), dec.compactacaoMPa(0.5), dec.tempC(0.5), dec.satAlPct(0.5)]));
    return h.digest('hex').slice(0, 16);
}

const plants = plantasFixas();
const atual = {};
const t0 = performance.now();
for (const [idC, cenario] of Object.entries(CENARIOS)) {
    for (const [idS, classe] of Object.entries(CLASSES_SOLO)) {
        atual[`${idC}/${idS}`] = hashSim(simulateSeason({ crop, classe, cenario, plants, width: WIDTH, depth: DEPTH }));
    }
}
const ms = Math.round(performance.now() - t0);

if (process.argv.includes('--gravar') || !existsSync(ARQ)) {
    writeFileSync(ARQ, JSON.stringify(atual, null, 2) + '\n');
    console.log(`gravado: ${Object.keys(atual).length} combinações (${ms} ms)`);
} else {
    const ref = JSON.parse(readFileSync(ARQ, 'utf8'));
    const chaves = new Set([...Object.keys(ref), ...Object.keys(atual)]);
    const dif = [...chaves].filter(k => ref[k] !== atual[k]);
    if (dif.length) {
        for (const k of dif) console.log(`DIFERENTE ${k}: ref ${ref[k] ?? '-'} atual ${atual[k] ?? '-'}`);
        console.log(`FALHOU: ${dif.length} de ${chaves.size} combinações mudaram (${ms} ms)`);
        process.exit(1);
    }
    console.log(`OK: ${chaves.size} combinações idênticas (${ms} ms)`);
}
