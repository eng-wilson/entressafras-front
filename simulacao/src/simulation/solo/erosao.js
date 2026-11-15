// Transporte didático em células de mesma área; não é USLE nem usa kg/ha.
// relevo maior = baixada, como no balanço hídrico. Uma passagem entre vizinhos por dia.
import { GRID, NUTRIENTES } from '../estado.js';
export function erosao(E, ctx) {
    const cfg = ctx.par.superficie.erosao;
    E.erosaoDia.fill(0); E.deposicaoDia.fill(0); E.exportacaoSedimentoDia = 0;
    for (const n of NUTRIENTES) E.exportacaoNutrientesDia[n] = 0;
    if (!cfg?.ativa) return;
    const entrada = new Float64Array(E.NC);
    const nutrientes = Object.fromEntries(NUTRIENTES.map(n => [n, new Float64Array(E.NC)]));
    for (let c = 0; c < E.NC; c++) {
        const protecao = Math.max(E.palhada[c], ctx.fen.cob);
        const exposto = Math.max(0, 1 - protecao);
        const anterior = E.espA[c];
        const perda = ctx.clima.chuva >= cfg.chuvaMinMm ? Math.min(anterior, cfg.maxDiaU,
            E.enxurrada[c] * cfg.taxaUPorMm * exposto * exposto) : 0;
        E.espA[c] = Math.max(0, anterior - perda);
        E.erosaoDia[c] = perda;
        E.sedimento[c] += perda;
        const fracao = anterior > 0 ? Math.min(1, perda / anterior * cfg.enriquecimento) : 0;
        for (const n of NUTRIENTES) {
            const carga = E.fert[n][c] * fracao;
            E.fert[n][c] -= carga; E.nutrientesSedimento[n][c] += carga;
        }
        if (E.enxurrada[c] <= 0 || ctx.clima.chuva <= 0 || E.sedimento[c] <= 0) continue;
        const x = c % GRID, z = Math.floor(c / GRID);
        const borda = x === 0 || z === 0 || x === GRID - 1 || z === GRID - 1;
        let destino = -1, baixo = E.relevo[c];
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, nz = z + dz;
            if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) continue;
            const vizinho = nz * GRID + nx;
            if (E.relevo[vizinho] > baixo) { baixo = E.relevo[vizinho]; destino = vizinho; }
        }
        const retencao = destino < 0 && !borda ? 1 : cfg.deposicaoFracao;
        const deposito = Math.min(E.sedimento[c] * retencao, Math.max(0, .8 - E.espA[c]));
        const f = deposito / E.sedimento[c], resto = E.sedimento[c] - deposito;
        E.espA[c] += deposito; E.deposicaoDia[c] = deposito;
        if (destino >= 0) entrada[destino] += resto;
        else if (borda) E.exportacaoSedimentoDia += resto;
        else entrada[c] += resto;
        for (const n of NUTRIENTES) {
            const total = E.nutrientesSedimento[n][c], carga = total * (1 - f);
            E.nutrientesDepositados[n][c] += total * f;
            if (destino >= 0) nutrientes[n][destino] += carga;
            else if (borda) E.exportacaoNutrientesDia[n] += carga;
            else nutrientes[n][c] += carga;
            E.nutrientesSedimento[n][c] = 0;
        }
        E.sedimento[c] = 0;
    }
    // Aplicação simultânea impede percorrer várias células no mesmo passo.
    for (let c = 0; c < E.NC; c++) {
        E.sedimento[c] += entrada[c];
        for (const n of NUTRIENTES) {
            E.nutrientesSedimento[n][c] += nutrientes[n][c];
            const teto = n === 'N' ? Math.min(1, E.fertMax[c]) : 1;
            const retorno = Math.min(E.nutrientesDepositados[n][c], Math.max(0, teto - E.fert[n][c]));
            E.fert[n][c] += retorno; E.nutrientesDepositados[n][c] -= retorno;
        }
    }
    E.exportacaoSedimento += E.exportacaoSedimentoDia;
    for (const n of NUTRIENTES) E.exportacaoNutrientes[n] += E.exportacaoNutrientesDia[n];
}
