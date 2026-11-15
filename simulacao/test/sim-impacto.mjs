// Teste do impacto da simulação: produtividade, perda por causa, eventos, clima regional, rotação e comparação.
// Não compara bit a bit (isso é sim-referencia.mjs); verifica contratos e sentido agronômico.
//
// Uso: node test/sim-impacto.mjs
import assert from 'node:assert/strict';
import { simulateSeason } from '../src/simulation/season.js';
import { CENARIOS } from '../src/domain/soil/scenarios.js';
import { CLASSES_SOLO } from '../src/domain/soil/presets.js';
import { CULTURAS } from '../src/domain/crops/catalogo.js';
import { AGRONOMIA } from '../src/domain/crops/agronomia.js';
import { gerarPlantas } from '../src/domain/plantio.js';
import { climaDaSafraRegional, climaVsNormal, sobreposicaoRisco, diaAgricola } from '../src/climate/clima-regional.js';
import { ROTACOES } from '../src/simulation/rotacao.js';
import { avaliarRotacao } from '../src/simulation/comparar.js';
import { compararProdutividade } from '../src/decision/indicadores.js';

const W = 4.2;
const classe = CLASSES_SOLO[Object.keys(CLASSES_SOLO)[0]];
const t0 = performance.now();
let n = 0;
const ok = (nome, fn) => { fn(); n++; console.log(`ok  ${nome}`); };

function safra(crop, cenario) {
    return simulateSeason({ crop, classe, cenario, plants: gerarPlantas(crop, { width: W, depth: W }), width: W, depth: W, retratos: false });
}

ok('toda cultura do catálogo tem dados agronômicos', () => {
    for (const id of Object.keys(CULTURAS)) assert.ok(AGRONOMIA[id], `falta ${id} em domain/crops/agronomia.js`);
});

const ref = safra(CULTURAS.milho, CENARIOS.referencia).impacto;
const ver = safra(CULTURAS.milho, CENARIOS.veranico).impacto;
const cal = safra(CULTURAS.milho, CENARIOS.calor).impacto;

ok('perdas somam exatamente potencial − produtividade', () => {
    for (const r of [ref.resumo, ver.resumo, cal.resumo]) {
        const soma = Object.values(r.perdas).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(soma - (r.potencial - r.produtividade)) < 1e-6 * r.potencial, `${soma} vs ${r.potencial - r.produtividade}`);
    }
});

ok('referência fica perto do potencial; veranico e calor perdem', () => {
    assert.ok(ref.resumo.produtividade > 0.9 * ref.resumo.potencial);
    assert.ok(ver.resumo.produtividade < 0.8 * ref.resumo.produtividade);
    assert.ok(cal.resumo.produtividade < ref.resumo.produtividade);
});

ok('a causa principal bate com o cenário', () => {
    const top = r => Object.entries(r.perdas).sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(top(ver.resumo), 'agua_deficit');
    assert.equal(top(cal.resumo), 'calor');
});

ok('veranico gera evento crítico de seca na floração, com perda em sc/ha', () => {
    const e = ver.eventos[0];
    assert.equal(e.canal, 'agua_deficit');
    assert.ok(e.diaInicio >= 45 && e.diaInicio <= 80, `início ${e.diaInicio}`);
    assert.ok(e.fases.some(f => /VT/.test(f)), `fases ${e.fases}`);
    assert.ok(e.perda > 0.2 * ver.resumo.potencial);
    assert.ok(e.ksMin < 0.5);
});

ok('série diária: Ks e NDVI caem no veranico', () => {
    const minKs = s => Math.min(...s.slice(55, 80).map(d => d.ks));
    assert.ok(minKs(ver.serie) < minKs(ref.serie) - 0.2);
    const ndvi = s => s[75].ndvi;
    assert.ok(ndvi(ver.serie) < ndvi(ref.serie));
    assert.ok(ref.serie.every(d => d.ndvi <= d.ndviPotencial + 1e-6));
});

ok('clima regional: determinístico, pareado por ano, com régua do ano normal', () => {
    const a = climaDaSafraRegional({ semente: 7, plantio: '10-15', dias: 115 });
    const b = climaDaSafraRegional({ semente: 7, plantio: '10-15', dias: 115 });
    assert.deepEqual(a.chuva, b.chuva);
    assert.equal(a.data[0], '10-15');
    const total = a.chuva.reduce((x, y) => x + y, 0);
    assert.ok(total > 500 && total < 1700, `chuva da safra ${total}`);
    const dec = climaVsNormal({ clima: a, plantio: '10-15', dias: 115, anosFaixa: 10 });
    assert.ok(dec.length >= 11 && dec.every(d => d.p10 <= d.p90 && ['seco', 'normal', 'umido'].includes(d.classe)));
    const safrinha = climaDaSafraRegional({ semente: 7, plantio: '02-15', dias: 120 });
    const fev = diaAgricola('02-15') - diaAgricola('10-15');
    assert.equal(safrinha.chuva[0], climaDaSafraRegional({ semente: 7, plantio: '10-15', dias: 240 }).chuva[fev]);
    assert.ok(Array.isArray(sobreposicaoRisco({ crop: CULTURAS.soja, decendios: dec })));
});

const opc = { anos: 3, classe, solo: CENARIOS.compactacao.solo };
const atual = avaliarRotacao(ROTACOES.soja_milho, opc);
const crot = avaliarRotacao(ROTACOES.soja_crotalaria_milheto, opc);

ok('rotação: crotalária derruba nematoide e melhora a soja seguinte', () => {
    const nemSoja = av => av.anos[0].safras[0].pressaoPragas.nematoide;
    assert.ok(nemSoja(crot) < nemSoja(atual));
    assert.ok(crot.porSafra[0].p50 > atual.porSafra[0].p50);
});

ok('comparação pareada: mesmos anos, só posições com a mesma cultura, soja melhor depois da crotalária', () => {
    assert.deepEqual(atual.anos.map(a => a.semente), crot.anos.map(a => a.semente));
    const c = compararProdutividade(atual, crot);
    assert.deepEqual(c.map(x => x.cultura), ['soja']);   // milho safrinha × crotalária não se compara
    const soja = c[0];
    assert.ok(soja.deltaPp.p50 > 0, `soja: ${soja.deltaPp.p50} pp`);
    assert.ok(soja.anosBMelhor >= 0 && soja.anosBMelhor <= soja.totalAnos);
    assert.equal(soja.totalAnos, opc.anos);
});

console.log(`OK: ${n} verificações (${Math.round(performance.now() - t0)} ms)`);
