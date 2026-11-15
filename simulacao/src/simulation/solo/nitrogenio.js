// Nitrogênio do solo: adubação de cobertura, perdas por lixiviação e desnitrificação,
// reposição lenta pela matéria orgânica.
// Lê: lixiviado, excesso, mo, bio, manejo.adubN. Escreve: fert.N.
import { clamp } from '../../utils/math.js';

export function nitrogenio(E, ctx) {
    const { NC, L, fert, fertMax, lixiviado, excesso, mo, bio } = E;
    const N = ctx.par.nitrogenio;
    const adubN = ctx.manejo.adubN;
    const fN = fert.N;

    for (let c = 0; c < NC; c++) {
        const base = c * L;
        if (adubN && ctx.dia === adubN.dia) fN[c] = Math.min(fertMax[c], fN[c] + adubN.dose);
        fN[c] = clamp(fN[c] - lixiviado[c] * N.lixiviacao - (excesso[c] > N.excessoLimiar ? N.perdaEncharcado : 0)
            + N.mineralizacao * mo[base] * (bio[base] + N.bioBase), 0, fertMax[c]);
    }
}
