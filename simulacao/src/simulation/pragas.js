// Pressão de pragas entre safras: índice simplificado (0..1), não calibrado. Serve para a rotação mostrar
// o efeito de quebrar o ciclo de hospedeiros, que é a principal razão agronômica de rotacionar.
//   nematoide (Pratylenchus): vive no solo, multiplica em hospedeira boa e cai em não hospedeira
//     (crotalária spectabilis) e no pousio seco;
//   percevejo (barriga-verde): móvel, sai da cultura anterior e ataca a seguinte (soja → milho safrinha).
// Lê: hospedeiro e sensPragas (domain/crops/agronomia.js). Não toca no estado da simulação.
import { clamp } from '../utils/math.js';

export function pressaoInicial(par) {
    return { ...par.pragas.inicial };
}

export function hospedeiroCombinado(agro, agroCompanheira) {
    if (!agroCompanheira) return { ...agro.hospedeiro };
    const h = {};
    for (const k in agro.hospedeiro) h[k] = (agro.hospedeiro[k] + agroCompanheira.hospedeiro[k]) / 2;
    return h;
}

// Perda de produtividade (fração) da safra que começa com esta pressão.
export function perdaPorPragas(pressao, agro, hospedeiro, par) {
    const w = par.pragas.pesoHospedeiroAtual;
    const out = {};
    for (const k in pressao) out[k] = (agro.sensPragas[k] ?? 0) * pressao[k] * (1 - w + w * (hospedeiro[k] ?? 0));
    return out;
}

// Pressão no plantio da próxima safra, depois desta safra (hospedeiro) e do intervalo.
export function proximaPressao(pressao, hospedeiro, diasEntressafra, par) {
    const Pn = par.pragas.nematoide, Pp = par.pragas.percevejo;
    let nem = clamp(pressao.nematoide * (Pn.base + Pn.ganhoHospedeiro * hospedeiro.nematoide) + Pn.entrada * hospedeiro.nematoide);
    if (diasEntressafra > 60) nem *= Pn.pousio;
    const perc = clamp(Pp.memoria * pressao.percevejo + Pp.ganhoHospedeiro * hospedeiro.percevejo * (diasEntressafra > 60 ? 0.3 : 1));
    return { nematoide: nem, percevejo: perc };
}
