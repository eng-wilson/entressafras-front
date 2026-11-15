// Etapa 9: herança física das sete coberturas e sucessão no motor real.
// Rodar da raiz: node simulacao/test/sim-coberturas.mjs
import assert from 'node:assert/strict';
import { criarEstado } from '../src/simulation/estado.js';
import { criarHeranca } from '../src/simulation/solo/entressafra.js';
import { simulateRotacao } from '../src/simulation/rotacao.js';
import { PARAMS } from '../src/simulation/parametros.js';
import { AGRONOMIA } from '../src/domain/crops/agronomia.js';
import { CULTURAS } from '../src/domain/crops/catalogo.js';
import { CLASSES_SOLO } from '../src/domain/soil/presets.js';
import { CENARIOS } from '../src/domain/soil/scenarios.js';

const ids = ['brizantha_marandu', 'brizantha_piata', 'brizantha_paiaguas', 'ruziziensis',
  'crotalaria_juncea', 'crotalaria_spectabilis', 'crotalaria_ochroleuca'];
const classe = Object.values(CLASSES_SOLO)[0];
function soloControlado() {
  const E = criarEstado(1);
  E.comp.fill(.7); E.mo.fill(.2); E.bio.fill(.2); E.W.fill(20);
  E.fert.N.fill(.3);
  // Sem tráfego: isola o efeito da raiz. Só a primeira camada foi colonizada.
  for (let c = 0; c < E.NC; c++) E.raizDens[c * E.L] = .5;
  return E;
}
for (const id of ids) {
  const crop = CULTURAS[id], residuo = AGRONOMIA[id].residuo;
  const A = soloControlado(), copia = structuredClone(A);
  const herdar = (biomassa, diasEntressafra, fracaoUmida = 1) => {
    const E = soloControlado();
    criarHeranca({ anterior: { E: A, residuo, biomassa, cicloDias: crop.cicloDias,
      graminea: crop.archetype.startsWith('graminea') }, diasEntressafra, fracaoUmida })(E,
      { par: PARAMS, agua: { WP: 10, SAT: 50 } });
    return E;
  };
  const com = herdar(1, 0), sem = herdar(0, 0);
  assert.ok(com.palhada[0] > sem.palhada[0], `${id}: resíduo não cobre o solo`);
  assert.ok(com.comp[0] < sem.comp[0], `${id}: raiz não alivia camada colonizada`);
  assert.equal(com.comp[1], sem.comp[1], `${id}: descompactou camada sem raiz`);
  assert.ok(com.mo[0] > sem.mo[0] && com.bio[0] > sem.bio[0], `${id}: falta herança de MO/biologia`);
  if (residuo.creditoN > 0) assert.ok(com.fert.N[0] > sem.fert.N[0], `${id}: falta crédito de N`);
  const longa = herdar(1, 120), seca = herdar(1, 120, 0);
  assert.ok(longa.palhada[0] < com.palhada[0], `${id}: palhada não decompõe`);
  assert.ok(seca.palhada[0] >= longa.palhada[0], `${id}: decomposição maior sem umidade`);
  assert.deepEqual(A, copia, `${id}: herança alterou o estado da safra anterior`);

  const resultado = simulateRotacao({ rotacao: { safras: [
    { cultura: id, plantio: '09-01' }, { cultura: 'soja', plantio: '02-01' }
  ] }, sementes: [2024, 2025], classe, solo: CENARIOS.compactacao.solo });
  assert.equal(resultado.safras.length, 4);
  assert.deepEqual(resultado.safras.map(s => s.cultura), [id, 'soja', id, 'soja']);
  assert.equal(resultado.safras[0].diasEntressafraAntes, null);
  for (const safra of resultado.safras) {
    for (const [chave, valor] of Object.entries(safra.soloInicial)) {
      assert.ok(Number.isFinite(valor) && valor >= 0 && valor <= 1, `${id}: solo inicial inválido ${chave}`);
    }
    assert.ok(Number.isFinite(safra.resumo.produtividade), `${id}: produção inválida`);
  }
  for (const posicao of [1, 3]) {
    assert.ok(resultado.safras[posicao].soloInicial.palhada > 0, `${id}: soja seguinte sem palhada`);
    assert.ok(resultado.safras[posicao].diasEntressafraAntes >= 0);
  }
  console.log(`ok ${id}: palhada, raiz, N, decomposição e dois ciclos de sucessão`);
}
