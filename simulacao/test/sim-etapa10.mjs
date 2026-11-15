import assert from 'node:assert/strict';
import { progressoTermico } from '../src/simulation/fenologia.js';
import { PARAMS } from '../src/simulation/parametros.js';
import { criarEstado } from '../src/simulation/estado.js';
import { erosao } from '../src/simulation/solo/erosao.js';
import { criarHeranca } from '../src/simulation/solo/entressafra.js';
import { simulateSeason } from '../src/simulation/season.js';
import { CULTURAS } from '../src/domain/crops/catalogo.js';
import { CLASSES_SOLO } from '../src/domain/soil/presets.js';
import { CENARIOS } from '../src/domain/soil/scenarios.js';
import { gerarPlantas } from '../src/domain/plantio.js';
const crop = CULTURAS.soja, dias = crop.cicloDias;
const clima = temp => ({ tmax: Array(dias + 1).fill(temp), tmin: Array(dias + 1).fill(temp) });
const frio = progressoTermico(clima(5), dias, crop, PARAMS);
const ref = progressoTermico(clima(24.5), dias, crop, PARAMS);
const quente = progressoTermico(clima(30), dias, crop, PARAMS);
assert.equal(frio.progresso[dias], 0);
assert.ok(Math.abs(ref.progresso[dias] - 1) < 1e-12);
assert.ok(quente.progresso[40] > ref.progresso[40]);
assert.deepEqual(progressoTermico(clima(50), dias, crop, PARAMS).progresso,
    progressoTermico(clima(35), dias, crop, PARAMS).progresso);
const futuro = clima(24.5); futuro.tmax.fill(35, 50); futuro.tmin.fill(35, 50);
assert.deepEqual(progressoTermico(futuro, dias, crop, PARAMS).progresso.slice(0, 51), ref.progresso.slice(0, 51));
assert.throws(() => progressoTermico(clima(NaN), dias, crop, PARAMS));
for (const cultura of Object.values(CULTURAS)) assert.ok(progressoTermico(clima(24.5), dias, cultura, PARAMS).alvo > 0);
function perder({ cob = 0, palhada = 0, chuva = 100, enxurrada = 80 } = {}) {
    const E = criarEstado(1); E.espA.fill(.3); E.palhada.fill(palhada); E.enxurrada.fill(enxurrada);
    erosao(E, { par: PARAMS, clima: { chuva }, fen: { cob } }); return E;
}
const descoberto = perder();
assert.ok(descoberto.espA[0] < .3 && descoberto.erosaoDia[0] > 0);
for (const op of [{ cob: 1 }, { palhada: 1 }, { chuva: 0 }, { enxurrada: 0 }]) assert.equal(perder(op).erosaoDia[0], 0);
assert.ok(perder({ palhada: .8 }).erosaoDia[0] < descoberto.erosaoDia[0]);
for (let d = 0; d < 1000; d++) erosao(descoberto, { par: PARAMS, clima: { chuva: 100 }, fen: { cob: 0 } });
assert.ok(descoberto.espA.every(v => v >= 0));
const novo = criarEstado(1); novo.espA.fill(.4);
criarHeranca({ anterior: { E: descoberto, residuo: { palhada: 0, meiaVidaDias: 90, creditoN: 0, descompacta: 0 }, biomassa: 0, cicloDias: dias }, diasEntressafra: 30 })(novo,
    { par: PARAMS, agua: { WP: 10, SAT: 50 } });
assert.equal(novo.espA[0], descoberto.espA[0]);
const plants = gerarPlantas(crop, { width: 4.2, depth: 4.2 });
const sim = simulateSeason({ crop, classe: Object.values(CLASSES_SOLO)[0], cenario: CENARIOS.referencia, plants, width: 4.2, depth: 4.2 });
assert.equal(sim.impacto.serie.length, dias + 1);
for (let d = 0; d <= dias; d++) assert.equal(sim.impacto.serie[d].t, sim.termica.progresso[d]);
assert.ok(sim.impacto.serie.every((v, d, a) => !d || v.espessuraAU <= a[d - 1].espessuraAU));
console.log('OK: soma térmica, frio/calor/teto, causalidade, catálogo, erosão/proteção, herança e integração diária');
