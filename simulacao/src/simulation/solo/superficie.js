// Superfície do solo: crosta, rachaduras e temperatura.
// Lê: chuva, tmax, cobertura, palhada, bio, W. Escreve: crosta, rachadura, tsup.
import { clamp } from '../../utils/math.js';

export function superficie(E, ctx) {
    const { NC, L, W, crosta, palhada, bio, rachadura, tsup } = E;
    const { FC, WP, SECO } = ctx.agua;
    const S = ctx.par.superficie, Cr = S.crosta, Ra = S.rachadura, Te = S.temperatura;
    const { chuva, tmax } = ctx.clima;
    const { cob } = ctx.fen;
    const propensao = ctx.classe.propensaoCrosta;

    for (let c = 0; c < NC; c++) {
        const base = c * L;
        const protecao = Math.max(palhada[c], cob);

        // Crosta: impacto da chuva em solo desprotegido; a biologia desfaz aos poucos.
        const exposto = (1 - protecao) * (1 - protecao);
        if (chuva > Cr.chuvaMinMm) crosta[c] = clamp(crosta[c] + (chuva / Cr.chuvaEscalaMm) * exposto * propensao * (1 - Cr.protecaoBio * bio[base]));
        crosta[c] = clamp(crosta[c] - Cr.recuperacaoBio * bio[base]);

        // Rachaduras: dias seguidos com a superfície seca (a pintura só mostra em solo argiloso).
        const umid0 = clamp((W[base] - SECO) / (FC - SECO));
        if (W[base] < WP * Ra.fatorPmp) rachadura[c] = clamp(rachadura[c] + Ra.sobe);
        else if (chuva > Ra.chuvaFechaMm) rachadura[c] = clamp(rachadura[c] - Ra.fecha);

        // Temperatura da superfície: solo descoberto e seco esquenta muito.
        tsup[c] = tmax + Te.descobertoC * (1 - protecao) * (1 - Te.efeitoUmidade * umid0) - Te.dosselC * cob;
    }
}
