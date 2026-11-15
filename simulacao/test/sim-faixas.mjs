// Validação da simulação contra faixas de perda publicadas pela Embrapa.
// Cada faixa cita a fonte; a faixa do teste é mais larga que o número publicado, porque os ensaios
// variam com cultivar, solo e ano. Encharcamento e geada não têm percentual Embrapa: ficam sem teste.
//
// Uso: node test/sim-faixas.mjs
// Calibrou algo e uma faixa quebrou? A fonte manda; ajuste PARAMS ou a cultura, não a faixa.
import assert from 'node:assert/strict';
import { simulateSeason } from '../src/simulation/season.js';
import { medirIntervencoes, medirIntervencoesAnos } from '../src/simulation/contrafactual.js';
import { CENARIOS } from '../src/domain/soil/scenarios.js';
import { CLASSES_SOLO } from '../src/domain/soil/presets.js';
import { CULTURAS } from '../src/domain/crops/catalogo.js';
import { AGRONOMIA } from '../src/domain/crops/agronomia.js';
import { gerarPlantas } from '../src/domain/plantio.js';

export const FAIXAS_EMBRAPA = [
    {
        id: 'milho_seca_floracao', faixa: [45, 75], medida: 'perda % do potencial, 25 dias sem chuva em VT–R1',
        fonte: 'Durães et al., Circular Técnica 39, Embrapa Milho e Sorgo, 2004: uma semana de déficit no florescimento reduz 50 %; estresse no florescimento passa de 50 %.'
    },
    {
        id: 'soja_seca_reprodutivo', faixa: [25, 45], medida: 'perda % do potencial, 25 dias sem chuva em R1–R5',
        fonte: 'Embrapa Cerrados, BRS 7581RR: déficit no reprodutivo (R1–R4 ou R5–R7) reduziu 30–40 % (Revista Cultivar).'
    },
    {
        id: 'compactacao_ano_seco', faixa: [18, 45], medida: 'perda evitada pela descompactação, safra com veranico',
        fonte: 'Embrapa Soja: compactação reduziu a produtividade em 28 % (soja) e 30 % (milho); perdas concentradas em safras com deficiência hídrica (Debiasi, Circular Técnica 2008; portal SECA).'
    },
    {
        id: 'milho_acidez_subsolo', faixa: [15, 45], medida: 'perda evitada por calagem e gessagem, mediana de 8 anos',
        fonte: 'Embrapa Cerrados, relatório de impacto do gesso no milho (2013): ganho de 27,9 % (perda evitada ≈ 22 %); maior sob veranico (Sousa, Lobato e Rein, Circular Técnica 32, 2005).'
    },
    {
        id: 'soja_acidez_subsolo', faixa: [3, 30], medida: 'perda evitada por calagem e gessagem, mediana de 8 anos; menor que no milho',
        fonte: 'Embrapa Cerrados (Circular Técnica 32): a soja responde ao gesso bem menos que o milho.'
    },
    {
        id: 'soja_nematoide_maximo', faixa: [10, 50], medida: 'perda máxima por Pratylenchus com pressão 1 (% da produtividade)',
        fonte: 'Embrapa Soja (Franchini et al., 2014): Pratylenchus brachyurus causa perdas de até 50 % no Centro-Oeste.'
    }
];

const W = 4.2;
const classe = CLASSES_SOLO.latossolo_vermelho;
const plantas = crop => gerarPlantas(crop, { width: W, depth: W });
const faixa = id => FAIXAS_EMBRAPA.find(f => f.id === id);
const t0 = performance.now();
let n = 0;
function dentro(id, valor, rotulo = '') {
    const f = faixa(id);
    const ok = valor >= f.faixa[0] && valor <= f.faixa[1];
    console.log(`${ok ? 'ok ' : 'ERRO'} ${id}${rotulo}: ${valor.toFixed(1)} em [${f.faixa.join(', ')}] — ${f.medida}`);
    assert.ok(ok, `${id}${rotulo}: ${valor.toFixed(1)} fora de [${f.faixa}]. Fonte: ${f.fonte}`);
    n++;
}

// Veranico: o cenário corta a chuva dos dias 50 a 75.
for (const [c, id] of [['milho', 'milho_seca_floracao'], ['soja', 'soja_seca_reprodutivo']]) {
    const crop = CULTURAS[c];
    const r = simulateSeason({ crop, classe, cenario: CENARIOS.veranico, plants: plantas(crop), width: W, depth: W, retratos: false }).impacto.resumo;
    dentro(id, r.perdaPct);
}

// Compactação em safra com veranico (o cenário tem veranico nos dias 62–76).
for (const c of ['milho', 'soja']) {
    const crop = CULTURAS[c];
    const r = medirIntervencoes({ crop, classe, cenario: CENARIOS.compactacao, plants: plantas(crop), width: W, depth: W, ids: ['descompactacao'] });
    dentro('compactacao_ano_seco', r.intervencoes[0].perdaEvitadaPct, ` (${c})`);
}

// Compactação pesa mais em ano seco que em ano médio (forma qualitativa da Embrapa Soja).
{
    const crop = CULTURAS.milho;
    const r = medirIntervencoesAnos({ crop, classe, cenario: CENARIOS.compactacao, plants: plantas(crop), width: W, depth: W, plantio: '10-15', anos: 8, ids: ['descompactacao'] });
    const e = r.intervencoes[0].perdaEvitadaPct;
    console.log(`ok  compactacao vale mais em ano seco: p90 ${e.p90.toFixed(1)} vs p50 ${e.p50.toFixed(1)}`);
    assert.ok(e.p90 > 1.5 * e.p50);
    n++;
}

// Acidez e alumínio no subsolo: mediana de 8 anos de clima regional.
const acidez = {};
for (const c of ['milho', 'soja']) {
    const crop = CULTURAS[c];
    const r = medirIntervencoesAnos({ crop, classe, cenario: CENARIOS.pobre_acido, plants: plantas(crop), width: W, depth: W, plantio: '10-15', anos: 8, ids: ['calagem_gessagem'] });
    acidez[c] = r.intervencoes[0].perdaEvitadaPct.p50;
    dentro(`${c}_acidez_subsolo`, acidez[c]);
}
assert.ok(acidez.soja < acidez.milho, `soja (${acidez.soja}) deveria responder menos ao gesso que o milho (${acidez.milho})`);
console.log(`ok  soja responde menos ao gesso que o milho: ${acidez.soja.toFixed(1)} < ${acidez.milho.toFixed(1)}`);
n++;

// Nematoide: perda máxima da soja com pressão 1 e hospedeiro pleno (simulation/pragas.js).
dentro('soja_nematoide_maximo', 100 * AGRONOMIA.soja.sensPragas.nematoide);

console.log(`OK: ${n} verificações contra faixas da Embrapa (${Math.round(performance.now() - t0)} ms)`);
