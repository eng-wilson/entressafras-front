// Crescimento e consequências do estresse: altura, espiga, senescência e acamamento.
// Lê: agudo, cron, fenologia, crop.janelas. Escreve: hAcc, hPot, espiga, senesc, acama.
// Também registra a atribuição: quanto de cada perda (altura, espiga, senescência, acamamento) veio de
// cada canal de estresse (atrib e atribDia). Só leitura dos valores acima; não muda o crescimento.
import { clamp } from '../../utils/math.js';
import { CANAIS, IDX, NCANAIS } from '../../domain/channels.js';

export function crescimento(E, ctx) {
    const { NP, agudo, cron, hAcc, hPot, espiga, senesc, acama, limiarAcama, atrib, atribDia } = E;
    const C = ctx.par.crescimento, Es = C.espiga, Se = C.senescencia, Ac = C.acamamento;
    const [fl0, fl1] = ctx.crop.janelas.floracao;
    const [, gr1] = ctx.crop.janelas.espiga;
    const { t, dPot } = ctx.fen;
    atribDia.bio.fill(0); atribDia.esp.fill(0); atribDia.sen.fill(0); atribDia.ac.fill(0);

    for (let p = 0; p < NP; p++) {
        const o = p * NCANAIS;
        const e0 = espiga[p], s0 = senesc[p], a0 = acama[p];

        // Crescimento: potencial do dia freado pelo pior estresse.
        let freio = 0, kFreio = -1;
        for (let k = 0; k < NCANAIS; k++) {
            const nome = CANAIS[k];
            const v = C.freioAgudo.includes(nome) ? agudo[o + k] : cron[o + k];
            const f = v * C.peso[nome];
            if (f > freio) kFreio = k;
            freio = Math.max(freio, f);
        }
        hAcc[p] += dPot * (1 - freio);
        hPot[p] += dPot;
        if (kFreio >= 0 && dPot > 0) {
            const perdido = dPot * freio;
            atrib.bio[o + kFreio] += perdido;
            atribDia.bio[kFreio] += perdido;
        }

        // Espiga: seca e calor na floração abortam grãos; no enchimento, reduzem o tamanho.
        let wDef = 0, wCal = 0;
        if (t >= fl0 && t <= fl1) {
            wDef = agudo[o + IDX.agua_deficit]; wCal = Es.pesoCalor * agudo[o + IDX.calor];
            espiga[p] *= 1 - Es.perdaFloracao * (agudo[o + IDX.agua_deficit] + Es.pesoCalor * agudo[o + IDX.calor]);
        } else if (t > fl1 && t <= gr1) {
            wDef = agudo[o + IDX.agua_deficit];
            espiga[p] *= 1 - Es.perdaEnchimento * agudo[o + IDX.agua_deficit];
        }
        espiga[p] = Math.max(Es.minimo, espiga[p]);
        const dEsp = espiga[p] < e0 ? Math.log(e0 / espiga[p]) : 0;
        if (dEsp > 0 && wDef + wCal > 0) repartir(dEsp, [IDX.agua_deficit, wDef, IDX.calor, wCal], atrib.esp, o, atribDia.esp);

        // Seca e falta de N no enchimento antecipam a senescência.
        if (t > Se.inicioT) {
            const wSeca = Se.seca * agudo[o + IDX.agua_deficit], wN = Se.N * cron[o + IDX.N];
            senesc[p] = Math.min(Se.maximo, senesc[p] + Se.seca * agudo[o + IDX.agua_deficit] + Se.N * cron[o + IDX.N]);
            const dSen = senesc[p] - s0;
            if (dSen > 0 && wSeca + wN > 0) repartir(dSen, [IDX.agua_deficit, wSeca, IDX.N, wN], atrib.sen, o, atribDia.sen);
        }

        // Acamamento: colmo fraco (K), raiz rasa e solo encharcado, depois que a espiga pesa.
        if (t > Ac.inicioT) {
            const wK = Ac.pesoK * cron[o + IDX.K], wR = Ac.pesoRaiz * cron[o + IDX.raiz], wX = Ac.pesoExcesso * cron[o + IDX.agua_excesso];
            const risco = clamp(Ac.pesoK * cron[o + IDX.K] + Ac.pesoRaiz * cron[o + IDX.raiz]
                + Ac.pesoExcesso * cron[o + IDX.agua_excesso] - Ac.desconto);
            const alvo = risco > limiarAcama[p] ? Math.min(Ac.maximo, (risco - limiarAcama[p]) * Ac.ganho + Ac.base) : 0;
            if (alvo > acama[p]) acama[p] += (alvo - acama[p]) * Ac.taxa;
            const dAc = acama[p] - a0;
            if (dAc > 0 && wK + wR + wX > 0) repartir(dAc, [IDX.K, wK, IDX.raiz, wR, IDX.agua_excesso, wX], atrib.ac, o, atribDia.ac);
        }
    }
}

// Divide `valor` entre os canais na proporção dos pesos: pares [canal, peso, canal, peso, ...].
function repartir(valor, pares, acum, o, dia) {
    let soma = 0;
    for (let i = 1; i < pares.length; i += 2) soma += pares[i];
    for (let i = 0; i < pares.length; i += 2) {
        const v = valor * pares[i + 1] / soma;
        acum[o + pares[i]] += v;
        dia[pares[i]] += v;
    }
}
