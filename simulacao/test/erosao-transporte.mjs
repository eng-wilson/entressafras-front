import assert from 'node:assert/strict';
import { criarEstado, GRID, NUTRIENTES } from '../src/simulation/estado.js';
import { PARAMS } from '../src/simulation/parametros.js';
import { erosao } from '../src/simulation/solo/erosao.js';
import { criarHeranca } from '../src/simulation/solo/entressafra.js';
const soma = a => a.reduce((s, v) => s + v, 0);
const E = criarEstado(1);
E.espA.fill(.3); E.fertMax.fill(1); E.enxurrada.fill(80);
for (const n of NUTRIENTES) E.fert[n].fill(.6);
for (let c = 0; c < E.NC; c++) E.relevo[c] = c % GRID / GRID;
const inicial = soma(E.espA), nutrientes = Object.fromEntries(NUTRIENTES.map(n => [n, soma(E.fert[n])]));
const ctx = { par: PARAMS, clima: { chuva: 100 }, fen: { cob: 0 } };
for (let dia = 0; dia < 60; dia++) {
    erosao(E, ctx);
    assert.ok(Math.abs(soma(E.espA) + soma(E.sedimento) + E.exportacaoSedimento - inicial) < .002, 'Sedimento não conserva volume');
    for (const n of NUTRIENTES) {
        const total = soma(E.fert[n]) + soma(E.nutrientesSedimento[n]) + soma(E.nutrientesDepositados[n]) + E.exportacaoNutrientes[n];
        assert.ok(Math.abs(total - nutrientes[n]) < .002, `${n}: balanço de nutrientes divergente`);
        assert.ok(E.fert[n].every(v => v >= 0 && v <= 1));
    }
}
assert.ok(E.exportacaoSedimento > 0 && E.exportacaoNutrientes.N > 0);
assert.ok(soma(E.deposicaoDia) > 0 && soma(E.sedimento) > 0);
const parado = E.sedimento.slice();
erosao(E, { ...ctx, clima: { chuva: 0 } });
assert.deepEqual(E.sedimento, parado);
assert.equal(E.exportacaoSedimentoDia, 0);
const protegido = criarEstado(1); protegido.espA.fill(.3); protegido.enxurrada.fill(80); protegido.palhada.fill(1);
erosao(protegido, ctx);
assert.equal(soma(protegido.erosaoDia), 0);
const sucessor = criarEstado(1);
criarHeranca({ anterior: { E, residuo: { palhada: 0, meiaVidaDias: 90, creditoN: 0, descompacta: 0 }, biomassa: 0, cicloDias: 100 }, diasEntressafra: 20 })(sucessor,
    { par: PARAMS, agua: { WP: 10, SAT: 50 } });
assert.deepEqual(sucessor.sedimento, E.sedimento);
assert.deepEqual(sucessor.espA, E.espA);
assert.equal(sucessor.exportacaoSedimento, E.exportacaoSedimento);
assert.deepEqual(sucessor.exportacaoNutrientes, E.exportacaoNutrientes);
assert.notEqual(sucessor.exportacaoNutrientes, E.exportacaoNutrientes);
for (const n of NUTRIENTES) {
    assert.deepEqual(sucessor.nutrientesSedimento[n], E.nutrientesSedimento[n]);
    assert.deepEqual(sucessor.nutrientesDepositados[n], E.nutrientesDepositados[n]);
}
console.log('OK: 60 dias, conservação de sedimentos e 7 nutrientes, exportação, deposição, proteção e dia seco');
