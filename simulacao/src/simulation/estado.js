// Estado da simulação: grade do solo, camadas, arrays por célula e por planta.
// Só dados e inicialização; as regras ficam nos processos (solo/, planta/).
import { clamp, mulberry32 } from '../utils/math.js';
import { NCANAIS } from '../domain/channels.js';

export const GRID = 32;
export const CAMADAS = 12;
export const CAMADA_M = 0.1;
export const PROF_TOTAL_M = CAMADAS * CAMADA_M;   // 1,2 m
export const NUTRIENTES = ['N', 'P', 'K', 'Mg', 'S', 'Zn', 'FeMn'];

export function celulaDe(x, z, width, depth) {
    const i = clamp(Math.floor((x / width + 0.5) * GRID), 0, GRID - 1);
    const j = clamp(Math.floor((z / depth + 0.5) * GRID), 0, GRID - 1);
    return j * GRID + i;
}

// Amostragem bilinear igual ao filtro linear da GPU (centro do texel em (i + 0.5) / N).
export function bilinear(arr, x, z, width, depth) {
    const fx = clamp((x / width + 0.5) * GRID - 0.5, 0, GRID - 1);
    const fz = clamp((z / depth + 0.5) * GRID - 0.5, 0, GRID - 1);
    const i0 = Math.floor(fx), j0 = Math.floor(fz);
    const i1 = Math.min(GRID - 1, i0 + 1), j1 = Math.min(GRID - 1, j0 + 1);
    const tx = fx - i0, tz = fz - j0;
    const a = arr[j0 * GRID + i0], b = arr[j0 * GRID + i1];
    const c = arr[j1 * GRID + i0], d = arr[j1 * GRID + i1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

// Limites de água da classe de solo, em mm por camada de 100 mm.
export function limitesAgua(classe, par) {
    const SAT = classe.agua.sat * 100, FC = classe.agua.cc * 100, WP = classe.agua.pmp * 100;
    return { SAT, FC, WP, SECO: WP * par.agua.secoFracPmp };
}

export function criarEstado(NP) {
    const NC = GRID * GRID, L = CAMADAS;
    const f32 = n => new Float32Array(n);
    return {
        NC, L, NP,
        // Solo por célula e camada (índice c * L + k).
        W: f32(NC * L),                 // água (mm por camada de 100 mm)
        comp: f32(NC * L), acid: f32(NC * L), mo: f32(NC * L), bio: f32(NC * L),
        gley: f32(NC * L), satDias: new Uint16Array(NC * L),
        // Solo por célula.
        relevo: f32(NC), trafego: f32(NC), crosta: f32(NC), palhada: f32(NC), sal: f32(NC), espA: f32(NC),
        lencol: f32(NC).fill(-1),
        poca: f32(NC), rachadura: f32(NC), tsup: f32(NC),
        fert: Object.fromEntries(NUTRIENTES.map(n => [n, f32(NC)])),
        fertMax: f32(NC),
        pesoEsc: f32(NC),
        // Resultados do dia por célula, usados pelos processos seguintes e pelas plantas.
        escLocal: f32(NC),              // água sobre a superfície da célula (enxurrada retida)
        escoamentoGlobal: 0,            // enxurrada que sai da célula e se redistribui pelo relevo
        lixiviado: new Float64Array(NC),// mm drenados abaixo da raiz hoje
        dispRel: f32(NC), excesso: f32(NC), acidRaiz: f32(NC),
        raizCel: f32(NC), raizPotCel: f32(NC), barreira: new Uint8Array(NC),
        raizPotFrente: 0,               // frente potencial do talhão (só clima e fase), m
        raizDens: f32(NC * L),          // densidade de raiz viva por camada, 0..1
        raizMorta: f32(NC * L),         // raiz morta (encharcamento) por camada, 0..1
        // Plantas.
        celP: null, limiarAcama: null,
        agudo: f32(NP * NCANAIS), cron: f32(NP * NCANAIS),
        hAcc: f32(NP), hPot: f32(NP),
        espiga: f32(NP).fill(1), senesc: f32(NP), acama: f32(NP),
        // Atribuição das perdas por canal (planta/crescimento.js): acumulado por planta e soma do talhão no dia.
        //   bio: altura perdida (fração do potencial); esp: ln da queda do fator de espiga;
        //   sen: senescência antecipada; ac: acamamento (rad).
        atrib: { bio: f32(NP * NCANAIS), esp: f32(NP * NCANAIS), sen: f32(NP * NCANAIS), ac: f32(NP * NCANAIS) },
        atribDia: { bio: new Float64Array(NCANAIS), esp: new Float64Array(NCANAIS), sen: new Float64Array(NCANAIS), ac: new Float64Array(NCANAIS) }
    };
}

// Preenche o estado inicial a partir do cenário (solo por célula) e da classe de solo.
export function inicializarEstado(E, { cenario, plants, width, depth, agua, par }) {
    const { NC, L } = E;
    const { FC, SAT } = agua;
    for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
            const c = j * GRID + i;
            const u = (i + 0.5) / GRID, v = (j + 0.5) / GRID;
            const s = cenario.solo(u, v);
            E.relevo[c] = s.relevo; E.trafego[c] = s.trafego; E.crosta[c] = s.crosta;
            E.palhada[c] = s.palhada; E.sal[c] = s.sal; E.espA[c] = s.espessuraA;
            if (s.lencol !== null) E.lencol[c] = s.lencol;
            for (const n of NUTRIENTES) E.fert[n][c] = s.fert[n];
            E.fertMax[c] = s.fert.N + par.solo.fertMaxFolga;
            for (let k = 0; k < L; k++) {
                const d = (k + 0.5) * CAMADA_M;
                const ck = c * L + k;
                E.comp[ck] = clamp(s.compactacao(d));
                E.acid[ck] = clamp(s.acidez(d));
                E.mo[ck] = clamp(s.mo(d));
                E.bio[ck] = clamp(s.biologia * Math.exp(-d / par.solo.bioDecaimentoM));
                E.gley[ck] = clamp(s.gley(d));
                E.W[ck] = FC;
                if (E.lencol[c] >= 0 && d >= E.lencol[c]) E.W[ck] = SAT;
            }
        }
    }

    const esc = par.solo.escoamento;
    let soma = 0;
    for (let c = 0; c < NC; c++) {
        E.pesoEsc[c] = Math.pow(E.relevo[c] + esc.pesoTrafego * E.trafego[c] + esc.base, esc.expoente);
        soma += E.pesoEsc[c];
    }
    for (let c = 0; c < NC; c++) E.pesoEsc[c] /= soma;

    const lim = par.crescimento.acamamento.limiar;
    E.celP = plants.map(p => celulaDe(p.px, p.pz, width, depth));
    E.limiarAcama = plants.map(p => lim.base + lim.faixa * mulberry32(p.seed ^ 0x5bd1e995)());
}
