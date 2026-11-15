// Solo informado pelo produtor: quatro perguntas simples (compactação, acidez no subsolo, fertilidade e palhada)
// viram a função solo(u, v) que a simulação lê. Parte do solo de referência (plantio direto bem manejado) e
// piora só o que o produtor marcou. Os níveis usam os mesmos valores dos cenários de demonstração
// (domain/soil/scenarios.js: compactação, pobre e ácido), que estão calibrados contra a Embrapa (test/sim-faixas.mjs).
//
// Cada resposta carrega a origem: 'informado' (o produtor respondeu, de laudo ou de campo) ou 'padrão'.
import { soloReferencia, rastros } from './scenarios.js';

export const PERGUNTAS_SOLO = {
    compactacao: {
        rotulo: 'Compactação (pé-de-grade, rastros)',
        opcoes: { nenhuma: 'Não percebo', moderada: 'Moderada (raiz entorta)', forte: 'Forte (camada dura a 15–30 cm)' },
        padrao: 'nenhuma'
    },
    acidez: {
        rotulo: 'Alumínio / acidez abaixo de 20 cm',
        opcoes: { baixa: 'Corrigido (m % baixo)', media: 'Médio', alta: 'Alto (m % > 40, sem gesso)' },
        padrao: 'baixa'
    },
    fertilidade: {
        rotulo: 'Fertilidade (P, K)',
        opcoes: { alta: 'Adequada', media: 'Média', baixa: 'Baixa' },
        padrao: 'alta'
    },
    palhada: {
        rotulo: 'Palhada sobre o solo hoje',
        opcoes: { alta: 'Muita (plantio direto)', media: 'Média', baixa: 'Pouca ou nenhuma' },
        padrao: 'media'
    }
};

export function respostasSolo(r = {}) {
    const out = {};
    for (const [k, p] of Object.entries(PERGUNTAS_SOLO)) {
        const v = r[k] && p.opcoes[r[k]] ? r[k] : p.padrao;
        out[k] = { valor: v, origem: r[k] && p.opcoes[r[k]] ? 'informado' : 'padrão' };
    }
    return out;
}

export function soloLocal(r = {}) {
    const R = respostasSolo(r);
    const comp = R.compactacao.valor, ac = R.acidez.valor, fe = R.fertilidade.valor, pa = R.palhada.valor;
    return (u, v) => {
        const s = soloReferencia(u, v);
        if (comp !== 'nenhuma') {
            const forte = comp === 'forte';
            const tr = rastros(u, [0.28, 0.72], 0.06);
            s.trafego = forte ? tr : 0.5 * tr;
            const camada = forte ? 0.78 : 0.55, rastro = forte ? 0.95 : 0.6;
            s.compactacao = d => {
                let c = 0.2 + 0.05 * d;
                if (d >= 0.18 && d <= 0.3) c = Math.max(c, camada);
                if (d <= 0.32) c = Math.max(c, rastro * tr);
                return c;
            };
            s.crosta = Math.max(s.crosta, forte ? 0.35 : 0.2);
        }
        if (ac === 'media') s.acidez = d => (d < 0.2 ? 0.25 : 0.55);
        if (ac === 'alta') s.acidez = d => (d < 0.2 ? 0.45 : 0.85);
        if (fe === 'media') s.fert = { ...s.fert, P: 0.65, K: 0.7, Mg: 0.75, S: 0.75, Zn: 0.75 };
        if (fe === 'baixa') s.fert = { ...s.fert, N: 0.65, P: 0.4, K: 0.5, Mg: 0.65, S: 0.65, Zn: 0.6 };
        if (pa === 'media') { s.palhada = 0.4; s.crosta = Math.max(s.crosta, 0.12); s.biologia = 0.55; }
        if (pa === 'baixa') {
            s.palhada = 0.08; s.crosta = Math.max(s.crosta, 0.4); s.biologia = 0.3;
            s.mo = d => 0.08 + 0.4 * Math.exp(-d / 0.18);
        }
        return s;
    };
}
