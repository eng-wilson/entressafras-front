// Raiz por célula: frente de crescimento com memória, densidade por camada e raiz morta.
//
// Frente: avança todo dia à taxa máxima da cultura, freada pela temperatura e pelo pior fator de solo
// na camada da ponta (umidade, resistência à penetração, acidez / Al). Não passa do teto da fase (raizPot).
// Encharcamento prolongado mata raiz da camada; se a camada da frente morre, a frente recua e só volta
// a descer crescendo de novo, depois que o solo drena.
//
// Potencial: a mesma frente sem restrição de solo (só clima e fase), um valor para o talhão todo.
// O canal de estresse `raiz` compara a frente com esse potencial.
//
// Densidade (0..1 por camada): alvo exponencial com a profundidade, cortado na frente; cresce devagar
// até o alvo e cai com a morte por encharcamento. Pesa a absorção de água (agua.js) e o desenho.
//
// Barreiras (código em `barreira`): 1 = compactação, 2 = acidez / Al, 3 = encharcamento, 4 = solo seco.
// Lê: W, comp, acid, bio, satDias, clima.tmax/tmin, fen.raizPot, fen.emergiu, crop.morfologia.
// Escreve: raizCel, raizPotCel, raizPotFrente, raizDens, raizMorta, barreira.
import { clamp, smoothstep } from '../../utils/math.js';
import { CAMADA_M } from '../estado.js';

export function raiz(E, ctx) {
    const { NC, L, W, comp, acid, bio, satDias, raizCel, raizPotCel, raizDens, raizMorta, barreira } = E;
    const R = ctx.par.raiz;
    const { raizPot, emergiu } = ctx.fen;
    const { FC, WP } = ctx.agua;
    const M = ctx.crop.morfologia;
    const taxaMax = M.raizTaxaM ?? R.taxaMaxM;
    const lambda = M.raizDecaimentoM ?? R.decaimentoM;
    // Tolerância ao alumínio (0..1): desloca os limiares de acidez da ponta. Milho e trigo são sensíveis (0);
    // a soja responde bem menos ao gesso que o milho (Embrapa Cerrados); braquiária é muito tolerante.
    const tolAl = (M.toleranciaAl ?? 0) * R.acidezTolerancia;

    // Fator de temperatura (média do dia).
    const tMed = (ctx.clima.tmax + ctx.clima.tmin) / 2;
    const fT = clamp((tMed - R.tBaseC) / (R.tOtimaC - R.tBaseC));

    if (!emergiu) {
        E.raizPotFrente = 0;
        raizCel.fill(0); raizPotCel.fill(0); barreira.fill(0);
        return;
    }

    // Potencial do talhão: só clima e fase.
    const minima = Math.min(R.minimaM, raizPot);
    E.raizPotFrente = Math.max(minima, Math.min(raizPot, E.raizPotFrente + taxaMax * fT));
    const potFrente = E.raizPotFrente;

    for (let c = 0; c < NC; c++) {
        const base = c * L;

        // 1) Morte por encharcamento e decomposição da raiz morta.
        let recuo = Infinity;
        for (let k = 0; k < L; k++) {
            const ck = base + k;
            raizMorta[ck] *= 1 - R.decomposicao;
            if (k >= R.camadaMinSat && satDias[ck] >= R.diasSatBarreira && raizDens[ck] > 0) {
                const perda = raizDens[ck] * R.morteSat;
                raizDens[ck] -= perda;
                raizMorta[ck] = Math.min(1, raizMorta[ck] + perda);
                if (raizDens[ck] < R.densMinFrente && k * CAMADA_M < recuo) recuo = k * CAMADA_M;
            }
        }
        let frente = Math.min(Math.max(raizCel[c], minima), recuo);
        if (frente < minima) frente = minima;
        let causa = recuo < Infinity && recuo < potFrente - 0.01 ? 3 : 0;

        // 2) Avanço da frente: pior fator do solo na camada da ponta.
        const kP = Math.min(L - 1, Math.floor((frente + 1e-4) / CAMADA_M));
        const ck = base + kP;
        const rel = clamp((W[ck] - WP) / (FC - WP));
        const sat = kP >= R.camadaMinSat && satDias[ck] >= R.diasSatBarreira;
        const fW = sat ? 0 : clamp(rel / R.umidadeLivre);
        // Solo compactado resiste mais quando seco; bioporos deixam passar um pouco.
        const compEf = comp[ck] * (1 + R.resistenciaSeco * (1 - rel));
        const fC = Math.max(1 - smoothstep(R.compactacaoInicio, R.compactacaoBloqueio, compEf), R.bioporos * bio[ck]);
        const fA = 1 - smoothstep(R.acidezInicio + tolAl, R.acidezBloqueio + tolAl, acid[ck]);
        const fS = Math.min(fW, fC, fA);
        if (frente < raizPot) frente = Math.min(raizPot, frente + taxaMax * fT * fS);

        if (!causa && frente < potFrente - 0.01) {
            if (fS < R.fatorRestritivo) causa = fS === fC ? 1 : fS === fA ? 2 : sat ? 3 : 4;
            else if (barreira[c] === 3) causa = 3;   // ainda recuperando a raiz perdida no encharcamento
        }
        raizCel[c] = frente;
        raizPotCel[c] = potFrente;
        barreira[c] = causa;

        // 3) Densidade: alvo exponencial até a frente; cresce devagar, não cresce em camada saturada.
        const ganho = R.taxaDens * fT;
        for (let k = 0; k < L; k++) {
            const topo = k * CAMADA_M;
            const ckk = base + k;
            const cobre = clamp((frente - topo) / CAMADA_M);
            if (cobre <= 0) {
                // Abaixo da frente recuada: o que restava vivo morre (ficou isolado pela camada morta).
                if (raizDens[ckk] > 0) { raizMorta[ckk] = Math.min(1, raizMorta[ckk] + raizDens[ckk]); raizDens[ckk] = 0; }
                continue;
            }
            if (k >= R.camadaMinSat && satDias[ckk] >= R.diasSatBarreira) continue;
            const alvo = cobre * Math.exp(-(topo + 0.5 * CAMADA_M * cobre) / lambda);
            if (raizDens[ckk] < alvo) raizDens[ckk] = Math.min(alvo, raizDens[ckk] + ganho * alvo);
        }
    }
}
