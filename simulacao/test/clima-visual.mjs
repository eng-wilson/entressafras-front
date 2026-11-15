import assert from 'node:assert/strict';
import { climaVisual } from '../src/render/clima.js';
import { chaveEstresse } from '../src/render/sprites/symptoms.js';
import { IDX, NCANAIS } from '../src/domain/channels.js';

const agudo = new Float32Array(NCANAIS);
const sim = { clima: { chuva: [0, 60] }, impacto: { serie: [{ agudo }, { agudo }] } };
agudo[IDX.agua_deficit] = 1;
assert.equal(climaVisual(sim, 0).seca, 1);
assert.equal(climaVisual(sim, 1).seca, 0, 'Chuva atual deve prevalecer no céu mesmo com déficit residual');
assert.equal(climaVisual(sim, 1).molhado, 1);
assert.equal(climaVisual({ clima: { chuva: [0] } }, 0).seca, 0, 'Dia sem chuva não implica seca');
const est = { modo: 'real', ag: new Float32Array(NCANAIS), cr: new Float32Array(NCANAIS), ganho: 1, senesc: 0 };
const saudavel = chaveEstresse(est);
est.ag[IDX.agua_excesso] = 0.8;
assert.notEqual(chaveEstresse(est), saudavel, 'Excesso agudo deve invalidar o cache de sintomas');
console.log('Clima visual: estados e cache de sintomas OK');
