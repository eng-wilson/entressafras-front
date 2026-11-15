// Balanço de água do solo, em três passos do dia:
//   entradaAgua     infiltração, enxurrada, drenagem, lençol freático e evaporação
//   transpiracao    a cultura tira água da zona de raiz (depois que raiz.js define a profundidade)
//   redistribuirPoca a enxurrada que saiu das células se acumula nas partes baixas e nos rastros
import { clamp, smoothstep } from '../../utils/math.js';
import { CAMADA_M } from '../estado.js';

// Lê: chuva, et0, cobertura, crosta, comp, palhada, trafego, lencol, raizCel (de ontem), poca (de ontem).
// Escreve: W, escLocal, escoamentoGlobal, lixiviado.
export function entradaAgua(E, ctx) {
    const { NC, L, W, comp, crosta, trafego, palhada, lencol, raizCel, poca, escLocal, lixiviado } = E;
    const { SAT, FC, WP, SECO } = ctx.agua;
    const A = ctx.par.agua, B = A.bloqueioDrenagem;
    const { chuva, et0 } = ctx.clima;
    const { cob } = ctx.fen;
    const classe = ctx.classe;

    escLocal.fill(0);
    let escoamentoGlobal = 0;
    for (let c = 0; c < NC; c++) {
        const base = c * L;

        // Infiltração: crosta e compactação da superfície reduzem a entrada de água.
        const entrada = chuva + poca[c];
        poca[c] = 0;
        const cap = classe.infiltracao * (1 - A.infilCrosta * crosta[c]) * (1 - A.infilCompactacao * comp[base]);
        const infil = Math.min(entrada, cap);
        const esc = entrada - infil;
        E.enxurrada[c] = esc;
        const retido = esc * (A.retencaoBase + A.retencaoTrafego * trafego[c]);
        escLocal[c] += retido;
        escoamentoGlobal += esc - retido;
        W[base] += infil;

        // Drenagem: camada compactada abaixo segura a água (lençol suspenso).
        const raizLix = Math.max(raizCel[c], A.raizMinLixiviacaoM);
        let lix = 0;
        for (let k = 0; k < L; k++) {
            const ck = base + k;
            if (W[ck] > SAT) {
                const ex = W[ck] - SAT; W[ck] = SAT;
                if (k + 1 < L) W[ck + 1] += ex;
            }
            if (W[ck] > FC) {
                let q = (W[ck] - FC) * classe.drenagem;
                if (k + 1 < L) {
                    q *= 1 - B.max * smoothstep(B.de, B.ate, comp[ck + 1]);
                    q = Math.min(q, Math.max(0, SAT - W[ck + 1]));
                    W[ck + 1] += q;
                } else if (lencol[c] >= 0) {
                    q = 0;
                }
                W[ck] -= q;
                if ((k + 1) * CAMADA_M > raizLix && (k * CAMADA_M) <= raizLix) lix += q;
            }
        }
        lixiviado[c] = lix;

        // Lençol freático alimenta as camadas abaixo dele.
        if (lencol[c] >= 0) {
            for (let k = 0; k < L; k++) if ((k + 0.5) * CAMADA_M >= lencol[c]) W[base + k] = SAT;
        }
        // Excesso sobe de volta; o que passa da superfície vira poça.
        for (let k = L - 1; k >= 1; k--) {
            const ck = base + k;
            if (W[ck] > SAT) { W[ck - 1] += W[ck] - SAT; W[ck] = SAT; }
        }
        if (W[base] > SAT) { escLocal[c] += W[base] - SAT; W[base] = SAT; }

        // Evaporação: primeiro da poça, depois da superfície (palhada e dossel reduzem).
        let demanda = et0;
        const ep = Math.min(escLocal[c], demanda);
        escLocal[c] -= ep; demanda -= ep;
        const rel0 = clamp((W[base] - SECO) / (FC - SECO));
        const es = demanda * (1 - cob) * (1 - A.evapPalhada * palhada[c]) * rel0;
        W[base] = Math.max(SECO, W[base] - es);
        if (W[base + 1] > WP) W[base + 1] = Math.max(WP, W[base + 1] - es * A.evapSubsuperficie);
    }
    E.escoamentoGlobal = escoamentoGlobal;
}

// Cada camada pesa pela densidade de raiz viva: camada com pouca raiz contribui pouco para a água
// disponível e para a absorção (raiz.js define a densidade).
// Lê: raizCel, raizDens, W, satDias, acid, et0, kc. Escreve: W, dispRel, excesso, acidRaiz.
export function transpiracao(E, ctx) {
    const { NC, L, W, satDias, acid, raizCel, raizDens, dispRel, excesso, acidRaiz } = E;
    const { SAT, FC, WP } = ctx.agua;
    const A = ctx.par.agua;
    const densPlena = ctx.par.raiz.densPlenaAbsorcao;
    const peso = (ck, prof, topo) => Math.min(1, (prof - topo) / CAMADA_M) * Math.min(1, raizDens[ck] / densPlena);
    const { et0 } = ctx.clima;
    const { kc } = ctx.fen;

    for (let c = 0; c < NC; c++) {
        const base = c * L;
        let disp = 0, capac = 0, satCam = 0, nCam = 0, ac = 0;
        const prof = raizCel[c];
        for (let k = 0; k < L; k++) {
            const topo = k * CAMADA_M;
            if (topo >= prof) break;
            const ck = base + k;
            const f = peso(ck, prof, topo);
            disp += Math.max(0, W[ck] - WP) * f;
            capac += (FC - WP) * f;
            if (W[ck] >= A.quaseSaturado * SAT && satDias[ck] >= A.diasSatExcesso) satCam += f;
            ac += acid[ck] * f;
            nCam += f;
        }
        const rel = capac > 0 ? disp / capac : 1;
        dispRel[c] = rel;
        excesso[c] = nCam > 0 ? satCam / nCam : 0;
        acidRaiz[c] = nCam > 0 ? ac / nCam : acid[base];
        const ks = clamp(rel / A.ksMeio);
        const tr = et0 * kc * ks;
        if (tr > 0 && disp > 0) {
            for (let k = 0; k < L; k++) {
                const topo = k * CAMADA_M;
                if (topo >= prof) break;
                const ck = base + k;
                const f = peso(ck, prof, topo);
                const tira = tr * (Math.max(0, W[ck] - WP) * f) / disp;
                W[ck] = Math.max(WP, W[ck] - tira);
            }
        }
    }
}

// Lê: escLocal, escoamentoGlobal, pesoEsc. Escreve: poca (lâmina sobre a superfície, mm).
export function redistribuirPoca(E) {
    const { NC, poca, escLocal, pesoEsc, escoamentoGlobal } = E;
    for (let c = 0; c < NC; c++) poca[c] = escLocal[c] + escoamentoGlobal * pesoEsc[c];
}
