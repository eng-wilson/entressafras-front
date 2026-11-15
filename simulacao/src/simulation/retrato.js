// Retrato do dia: empacota o estado em texturas Uint8 (solo) e no registro Float32 das plantas.
// É o que a renderização e o inspetor leem; nada aqui muda o estado.
//
// Texturas de estado (Uint8, 0..255 = 0..1), uma célula por texel:
//   S0 = (umidade da superfície, crosta, tráfego, matéria orgânica da superfície)
//   S1 = (palhada, salinidade, relevo/baixada, espessura do horizonte A / 0.8 u)
//   S2 = (temperatura da superfície, acidez da superfície, poça, índice de rachadura)
//   P0 = por camada: (umidade, compactação, matéria orgânica, acidez)
//   P1 = por camada: (biologia, gleização, salinidade, reservado)
//   P2 = por camada: (densidade de raiz viva, raiz morta, reservado, reservado)
// Registro das plantas: layout P de src/domain/channels.js.
import { clamp } from '../utils/math.js';
import { NCANAIS, P } from '../domain/channels.js';
import { GRID, CAMADAS, CAMADA_M } from './estado.js';

// Escalas de codificação (valor físico -> 0..1).
const ESC = { tsupMinC: 10, tsupFaixaC: 60, pocaMaxMm: 25, espAMax: 0.8, salDecaimento: 0.5, compMaxMPa: 4, satAlMaxPct: 70 };

const u8 = x => Math.round(clamp(x) * 255);

export function retratoSolo(E, agua) {
    const { NC, L, W, comp, mo, acid, bio, gley, raizDens, raizMorta, crosta, trafego, palhada, sal, relevo, espA, tsup, poca, rachadura } = E;
    const { SAT, SECO } = agua;
    const S0 = new Uint8Array(NC * 4), S1 = new Uint8Array(NC * 4), S2 = new Uint8Array(NC * 4);
    const P0 = new Uint8Array(NC * L * 4), P1 = new Uint8Array(NC * L * 4), P2 = new Uint8Array(NC * L * 4);
    for (let c = 0; c < NC; c++) {
        const base = c * L;
        const o = c * 4;
        S0[o] = u8((W[base] - SECO) / (SAT - SECO));
        S0[o + 1] = u8(crosta[c]);
        S0[o + 2] = u8(trafego[c]);
        S0[o + 3] = u8(mo[base]);
        S1[o] = u8(palhada[c]);
        S1[o + 1] = u8(sal[c]);
        S1[o + 2] = u8(relevo[c]);
        S1[o + 3] = u8(espA[c] / ESC.espAMax);
        S2[o] = u8((tsup[c] - ESC.tsupMinC) / ESC.tsupFaixaC);
        S2[o + 1] = u8(acid[base]);
        S2[o + 2] = u8(poca[c] / ESC.pocaMaxMm);
        S2[o + 3] = u8(rachadura[c]);
        const i = c % GRID, j = (c / GRID) | 0;
        for (let k = 0; k < L; k++) {
            const ck = base + k;
            const t3 = ((k * GRID + j) * GRID + i) * 4;   // layout (x, z, profundidade)
            P0[t3] = u8((W[ck] - SECO) / (SAT - SECO));
            P0[t3 + 1] = u8(comp[ck]);
            P0[t3 + 2] = u8(mo[ck]);
            P0[t3 + 3] = u8(acid[ck]);
            P1[t3] = u8(bio[ck]);
            P1[t3 + 1] = u8(gley[ck]);
            P1[t3 + 2] = u8(sal[c] * Math.exp(-k * ESC.salDecaimento));
            P1[t3 + 3] = 0;
            P2[t3] = u8(raizDens[ck]);
            P2[t3 + 1] = u8(raizMorta[ck]);
        }
    }
    return { superficie: { S0, S1, S2 }, perfil: { P0, P1, P2 } };
}

export function registroPlantas(E) {
    const { NP, celP, agudo, cron, hAcc, hPot, espiga, senesc, acama, raizCel, raizPotCel, barreira } = E;
    const reg = new Float32Array(NP * P.STRIDE);
    for (let p = 0; p < NP; p++) {
        const c = celP[p];
        const o = p * P.STRIDE;
        for (let k = 0; k < NCANAIS; k++) {
            reg[o + P.AGUDO + k] = agudo[p * NCANAIS + k];
            reg[o + P.CRONICO + k] = cron[p * NCANAIS + k];
        }
        reg[o + P.CRESC] = hPot[p] > 1e-6 ? 0.5 + 0.5 * hAcc[p] / hPot[p] : 1;
        reg[o + P.ESPIGA] = espiga[p];
        reg[o + P.SENESC] = senesc[p];
        reg[o + P.ACAMA] = acama[p];
        reg[o + P.RAIZ_M] = raizCel[c];
        reg[o + P.RAIZ_POT_M] = raizPotCel[c];
        reg[o + P.BARREIRA] = barreira[c];
        reg[o + P.CELULA] = c;
    }
    return reg;
}

// Conversões para o inspetor (valores físicos aproximados).
export function decodificador({ SAT, SECO }) {
    return {
        umidadePct: n => SECO + n * (SAT - SECO),      // % do volume
        compactacaoMPa: n => n * ESC.compMaxMPa,
        tempC: n => ESC.tsupMinC + n * ESC.tsupFaixaC,
        satAlPct: n => n * ESC.satAlMaxPct
    };
}

// Lê o perfil de uma célula num dia (valores 0..1 por camada).
export function perfilCelula(sim, dia, c) {
    const { P0, P1, P2 } = sim.perfil[dia];
    const i = c % GRID, j = (c / GRID) | 0;
    const camadas = [];
    for (let k = 0; k < CAMADAS; k++) {
        const t3 = ((k * GRID + j) * GRID + i) * 4;
        camadas.push({
            prof: (k + 0.5) * CAMADA_M,
            umidade: P0[t3] / 255, compactacao: P0[t3 + 1] / 255, mo: P0[t3 + 2] / 255, acidez: P0[t3 + 3] / 255,
            biologia: P1[t3] / 255, gley: P1[t3 + 1] / 255,
            raiz: P2[t3] / 255, raizMorta: P2[t3 + 1] / 255
        });
    }
    return camadas;
}
