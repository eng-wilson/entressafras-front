// Saturação prolongada: conta dias seguidos saturado por camada e acumula gleização (cinza-azulado no perfil).
// Lê: W. Escreve: satDias, gley.

export function gleizacao(E, ctx) {
    const { NC, L, W, satDias, gley } = E;
    const lim = ctx.par.agua.quaseSaturado * ctx.agua.SAT;
    const ganho = ctx.par.gleizacao.ganhoDia;
    for (let ck = 0; ck < NC * L; ck++) {
        if (W[ck] >= lim) { satDias[ck]++; gley[ck] = Math.min(1, gley[ck] + ganho); }
        else satDias[ck] = 0;
    }
}
