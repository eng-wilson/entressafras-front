// Estresse de cada planta no dia (agudo) e dano acumulado (crônico), por canal.
// Agudo: o que o solo e o clima impõem hoje. Crônico: sobe rápido com o agudo e desce devagar,
// ponderado pela sensibilidade da fase (crop.sensibilidade). Geada deixa dano permanente.
// Lê: dispRel, excesso, acidRaiz, raizCel, raizPotCel, tsup, sal, relevo, fert, clima, fenologia.
// Escreve: agudo, cron.
import { clamp, curve } from '../../utils/math.js';
import { CANAIS, IDX, NCANAIS } from '../../domain/channels.js';
import { NUTRIENTES } from '../estado.js';

export function estresse(E, ctx) {
    const { NP, celP, agudo, cron, dispRel, excesso, acidRaiz, raizCel, raizPotCel, tsup, sal, relevo, fert } = E;
    const S = ctx.par.estresse;
    const lim = ctx.crop.limites, sensib = ctx.crop.sensibilidade;
    const { tmax, tmin } = ctx.clima;
    const { t, emergiu, req } = ctx.fen;
    const fatores = { seca: 0, ench: 0, frio: 0, raiz: 0, acidez: 0 };

    for (let p = 0; p < NP; p++) {
        const c = celP[p];
        const ag = agudo.subarray(p * NCANAIS, (p + 1) * NCANAIS);
        ag.fill(0);
        const tminCel = tmin - S.frioRelevoC * relevo[c];

        if (emergiu) {
            ag[IDX.agua_deficit] = clamp((S.deficitMeio - dispRel[c]) / S.deficitMeio + sal[c] * S.salDeficit);
            ag[IDX.agua_excesso] = excesso[c];
            let calor = clamp((tmax - lim.tCalor) / S.calorFaixaC);
            if (t < S.soloQuente.ateT) calor = Math.max(calor, S.soloQuente.peso * clamp((tsup[c] - lim.tSoloQuente) / S.soloQuente.faixaC));
            ag[IDX.calor] = calor;
            ag[IDX.frio] = clamp((lim.tFrio - tminCel) / S.frioFaixaC);
            ag[IDX.raiz] = raizPotCel[c] > S.raizPotMinM ? clamp(1 - raizCel[c] / raizPotCel[c]) : 0;

            // Disponibilidade de cada nutriente: teor no solo reduzido por seca, encharcamento, frio, raiz curta e acidez.
            if (t > S.nutInicioT) {
                fatores.seca = ag[IDX.agua_deficit]; fatores.ench = ag[IDX.agua_excesso];
                fatores.frio = ag[IDX.frio]; fatores.raiz = ag[IDX.raiz]; fatores.acidez = acidRaiz[c];
                for (const n of NUTRIENTES) {
                    let disp = fert[n][c];
                    for (const [f, k] of S.disponibilidade[n]) disp *= 1 - k * fatores[f];
                    ag[IDX[n]] = clamp((req - disp) / req * S.nutGanho);
                }
            }
        }

        // Agudo -> crônico, ponderado pela sensibilidade da fase.
        for (let k = 0; k < NCANAIS; k++) {
            const nome = CANAIS[k];
            if (nome === 'frio') continue;
            const sens = sensib[nome] ? curve(sensib[nome], t) : 1;
            const alvo = ag[k] * sens;
            const ck = p * NCANAIS + k;
            const nut = NUTRIENTES.includes(nome);
            const sobe = nut ? S.taxaSobeNut : S.taxaSobe[nome];
            const desce = nut ? S.taxaDesceNut : S.taxaDesce[nome];
            cron[ck] += (alvo - cron[ck]) * (alvo > cron[ck] ? sobe : desce);
        }
        // Geada: dano permanente proporcional à intensidade.
        if (emergiu && tminCel <= lim.tGeada) {
            const dano = clamp((lim.tGeada + S.geada.folgaC - tminCel) / S.geada.faixaC);
            const ck = p * NCANAIS + IDX.frio;
            cron[ck] = Math.max(cron[ck], dano);
        }
    }
}
