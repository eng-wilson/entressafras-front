// Entressafra: o que uma safra deixa para a próxima. É o que faz uma rotação diferir de outra.
//   palhada: resíduo da cultura anterior (pela biomassa que ela fez), decomposto ao longo do intervalo;
//   N: crédito de leguminosa, imobilização por palhada de gramínea, metade do saldo da safra anterior;
//   compactação: raiz forte (braquiária, crotalária, milheto) desfaz parte da camada densa onde chegou;
//     a colheita soma compactação nos rastros;
//   biologia e matéria orgânica: sobem com a palhada;
//   crosta: palhada desfaz; água: entressafra seca longa esvazia o perfil.
//
// criarHeranca(...) devolve a função `herdar(E, ctx)` que simulateSeason chama depois do estado inicial.
// Lê do estado anterior: W, comp, acid, mo, bio, gley, crosta, palhada, fert, raizDens, trafego.
// Escreve no estado novo: os mesmos campos (o resto vem do cenário).
import { clamp } from '../../utils/math.js';
import { CAMADA_M, NUTRIENTES } from '../estado.js';

// Resíduo combinado de cultura principal + companheira (consórcio).
export function residuoCombinado(agro, agroCompanheira) {
    const a = agro.residuo;
    if (!agroCompanheira) return { ...a };
    const b = agroCompanheira.residuo;
    return {
        palhada: clamp(Math.max(a.palhada, b.palhada) + 0.3 * Math.min(a.palhada, b.palhada)),
        meiaVidaDias: (a.meiaVidaDias + b.meiaVidaDias) / 2,
        creditoN: a.creditoN + 0.6 * b.creditoN,
        descompacta: Math.max(a.descompacta, b.descompacta)
    };
}

// anterior: { E, residuo, biomassa (hAcc/hPot médio), cicloDias, graminea }; diasEntressafra: dias sem cultura.
// fracaoUmida: fração dos dias da entressafra com umidade para decompor (1 = todos; simulation/rotacao.js calcula
// pela chuva). Dia seco conta como `decomposicaoSeca` de um dia úmido.
export function criarHeranca({ anterior, diasEntressafra, fracaoUmida = 1 }) {
    return function herdar(E, ctx) {
        const A = anterior.E, R = anterior.residuo;
        const Es = ctx.par.entressafra;
        const { WP } = ctx.agua;
        const { NC, L } = E;
        const biom = clamp(anterior.biomassa);
        const fSeca = Es.decomposicaoSeca ?? 1;
        const diasDecomp = diasEntressafra * (fracaoUmida + (1 - fracaoUmida) * fSeca);

        E.exportacaoSedimento = A.exportacaoSedimento;
        E.exportacaoNutrientes = { ...A.exportacaoNutrientes };
        for (let c = 0; c < NC; c++) {
            const base = c * L;
            E.espA[c] = A.espA[c]; // erosão acumulada não se recompõe ao trocar de safra
            E.sedimento[c] = A.sedimento[c];
            for (const n of NUTRIENTES) {
                E.nutrientesSedimento[n][c] = A.nutrientesSedimento[n][c];
                E.nutrientesDepositados[n][c] = A.nutrientesDepositados[n][c];
            }

            // Palhada: a antiga decompõe durante a safra e o intervalo; a nova vem do resíduo.
            const velha = A.palhada[c] * Math.pow(0.5, (anterior.cicloDias + diasDecomp) / 90);
            const nova = R.palhada * biom * Math.pow(0.5, diasDecomp / R.meiaVidaDias);
            const palhada = clamp(velha + nova);
            E.palhada[c] = palhada;
            E.crosta[c] = clamp(A.crosta[c] * (1 - Es.crostaPalhada * palhada));

            // Nitrogênio: base do cenário (adubação de manutenção) + saldo + crédito − imobilização.
            const Nbase = E.fert.N[c];
            const imob = anterior.graminea ? Es.imobilizacaoN * palhada : 0;
            E.fert.N[c] = clamp(Es.retornoN * A.fert.N[c] + (1 - Es.retornoN) * Nbase + R.creditoN * biom - imob);
            E.fertMax[c] = Math.max(E.fertMax[c], E.fert.N[c] + ctx.par.solo.fertMaxFolga);
            for (const n of NUTRIENTES) if (n !== 'N') E.fert[n][c] = A.fert[n][c] * 0.5 + E.fert[n][c] * 0.5;

            for (let k = 0; k < L; k++) {
                const ck = base + k;
                let comp = A.comp[ck];
                if (A.raizDens[ck] > Es.densRaizMin) comp *= 1 - R.descompacta * biom;
                if (k < Es.rastroCamadas) comp += Es.compactacaoRastro * A.trafego[c];
                E.comp[ck] = clamp(comp);
                E.acid[ck] = A.acid[ck];
                E.gley[ck] = A.gley[ck];
                const prof = (k + 0.5) * CAMADA_M;
                E.mo[ck] = clamp(A.mo[ck] + Es.moResiduo * palhada * Math.exp(-prof / 0.2));
                E.bio[ck] = clamp(A.bio[ck] * (1 - Es.bioDecaimento) + Es.bioPalhada * palhada * Math.exp(-prof / 0.4));
                // Água: o lençol do cenário manda; fora dele, a entressafra longa seca o perfil.
                if (E.W[ck] < ctx.agua.SAT) {
                    const w = A.W[ck];
                    E.W[ck] = diasEntressafra > 60 ? WP + Es.aguaSecaEntressafra * Math.max(0, w - WP) : w;
                }
            }
        }
    };
}
