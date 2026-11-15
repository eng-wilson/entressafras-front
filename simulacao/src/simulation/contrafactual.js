// Contrafactual: quanto cada problema de solo custa, medido pela intervenção que o corrige.
//
// A perda por canal (impacto.js) diz o sintoma: num solo compactado, a perda aparece como "déficit hídrico",
// porque a raiz rasa não alcança a água. O contrafactual diz a causa: roda a mesma safra, no mesmo clima,
// com o solo corrigido, e mede a diferença. "Descompactar recupera +18 % do potencial."
//
//   medirIntervencoes({ crop, classe, cenario, plants, width, depth })      um clima (o do cenário)
//   medirIntervencoesAnos({ ..., anos, plantio })                           N anos de clima regional: faixa p10–p90
//
// Duas medidas por intervenção:
//   ganhoPp: pontos percentuais do potencial (soma com a perda do resumo: −42 % → −24 %);
//   ganhoRelPct: % sobre a produtividade sem a intervenção (a forma dos ensaios da Embrapa: "gesso +27,9 %");
//   perdaEvitadaPct: 1 − Y_sem / Y_com (a forma "a compactação reduziu 30 %").
// As intervenções interagem (descompactar vale mais com a acidez corrigida), então também roda "todas juntas".
import { PARAMS } from './parametros.js';
import { simulateSeason } from './season.js';
import { climaDaSafraRegional } from '../climate/clima-regional.js';

// Valores de manejo bom: os mesmos do solo de referência (domain/soil/scenarios.js, plantio direto bem manejado).
const BOM = {
    compactacao: d => 0.15 + 0.08 * d,
    acidez: d => (d < 0.2 ? 0.1 : 0.25),
    fert: { N: 0.88, P: 0.9, K: 0.9, Mg: 0.9, S: 0.9, Zn: 0.9, FeMn: 0.95 },
    palhada: 0.65, crosta: 0.05, biologia: 0.75
};

// Cada intervenção recebe o solo de um ponto (cenario.solo(u, v)) e devolve o solo corrigido.
// Só melhora: nunca piora um ponto que já está melhor que o manejo bom.
export const INTERVENCOES = {
    calagem_gessagem: {
        nome: 'Calagem e gessagem',
        descricao: 'Corrige a acidez e o alumínio, inclusive no subsolo (gesso leva cálcio em profundidade).',
        solo: s => { const a = s.acidez; s.acidez = d => Math.min(a(d), BOM.acidez(d)); return s; }
    },
    descompactacao: {
        nome: 'Descompactação',
        descricao: 'Rompe o pé-de-grade e a compactação dos rastros (escarificação seguida de planta de raiz forte).',
        solo: s => { const c = s.compactacao; s.compactacao = d => Math.min(c(d), BOM.compactacao(d)); s.trafego = 0; return s; }
    },
    palhada: {
        nome: 'Palhada (plantio direto)',
        descricao: 'Cobertura permanente: menos crosta, menos evaporação, mais infiltração e biologia.',
        solo: s => {
            s.palhada = Math.max(s.palhada, BOM.palhada); s.crosta = Math.min(s.crosta, BOM.crosta);
            s.biologia = Math.max(s.biologia, BOM.biologia); return s;
        }
    },
    adubacao: {
        nome: 'Adubação de correção (P, K, micronutrientes)',
        descricao: 'Eleva P, K, Mg, S e Zn ao nível de manejo bom.',
        solo: s => { for (const n of ['P', 'K', 'Mg', 'S', 'Zn', 'FeMn']) s.fert[n] = Math.max(s.fert[n], BOM.fert[n]); return s; }
    },
    adubacao_N: {
        nome: 'Nitrogênio na dose certa',
        descricao: 'N de base e cobertura no nível de manejo bom.',
        solo: s => { s.fert.N = Math.max(s.fert.N, BOM.fert.N); return s; },
        manejo: { adubacaoN: PARAMS.manejo.adubacaoPadrao }
    },
    drenagem: {
        nome: 'Drenagem',
        descricao: 'Rebaixa o lençol raso da baixada (sem saturação no perfil).',
        solo: s => { s.lencol = null; s.gley = () => 0; return s; }
    }
};

function cenarioCom(cenario, ids) {
    const lista = ids.map(id => INTERVENCOES[id]);
    const out = { ...cenario, solo: (u, v) => lista.reduce((s, it) => it.solo(s), cenario.solo(u, v)) };
    for (const it of lista) if (it.manejo?.adubacaoN && (cenario.adubacaoN === undefined || cenario.adubacaoN.dose < it.manejo.adubacaoN.dose)) out.adubacaoN = it.manejo.adubacaoN;
    return out;
}

function rodar(base, cenario) {
    return simulateSeason({ ...base, cenario, retratos: false }).impacto.resumo;
}

function comparar(semR, comR) {
    return {
        produtividadePct: comR.produtividadePct,
        ganhoPp: comR.produtividadePct - semR.produtividadePct,
        ganhoRelPct: semR.produtividade > 0 ? 100 * (comR.produtividade / semR.produtividade - 1) : 0,
        perdaEvitadaPct: comR.produtividade > 0 ? 100 * (1 - semR.produtividade / comR.produtividade) : 0,
        ganho: comR.produtividade - semR.produtividade
    };
}

// Um clima. limiarPp: intervenção com ganho menor que isto é marcada sem efeito (o problema não existe aqui).
export function medirIntervencoes({ crop, classe, cenario, plants, width, depth, params = PARAMS, potencial, ids = Object.keys(INTERVENCOES), limiarPp = 0.5 }) {
    const base = { crop, classe, plants, width, depth, params, potencial };
    const semR = rodar(base, cenario);
    const intervencoes = ids.map(id => {
        const c = comparar(semR, rodar(base, cenarioCom(cenario, [id])));
        return { id, nome: INTERVENCOES[id].nome, descricao: INTERVENCOES[id].descricao, ...c, temEfeito: c.ganhoPp >= limiarPp };
    }).sort((a, b) => b.ganhoPp - a.ganhoPp);
    const uteis = intervencoes.filter(i => i.temEfeito).map(i => i.id);
    const todas = uteis.length ? comparar(semR, rodar(base, cenarioCom(cenario, uteis))) : comparar(semR, semR);
    const somaPartes = intervencoes.filter(i => i.temEfeito).reduce((a, i) => a + i.ganhoPp, 0);
    return {
        base: { produtividade: semR.produtividade, produtividadePct: semR.produtividadePct, perdaPct: semR.perdaPct, unidade: semR.unidade, potencial: semR.potencial },
        intervencoes,
        todas: { ids: uteis, ...todas, interacaoPp: todas.ganhoPp - somaPartes },
        frase: frase(semR, intervencoes, todas)
    };
}

// N anos de clima regional (mesmo plantio): a faixa diz quanto a correção vale em ano bom e em ano seco.
export function medirIntervencoesAnos({ crop, classe, cenario, plants, width, depth, params = PARAMS, potencial, plantio, anos = 8, sementeBase = 2000, ids = Object.keys(INTERVENCOES) }) {
    const porAno = [];
    for (let a = 0; a < anos; a++) {
        const semente = sementeBase + a;
        const comClima = { ...cenario, clima: dias => climaDaSafraRegional({ semente, plantio, dias }) };
        porAno.push({ semente, ...medirIntervencoes({ crop, classe, cenario: comClima, plants, width, depth, params, potencial, ids, limiarPp: -Infinity }) });
    }
    const faixa = sel => {
        const v = porAno.map(sel).sort((x, y) => x - y);
        const q = f => { const i = (v.length - 1) * f, lo = Math.floor(i); return v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo); };
        return { p10: q(0.1), p50: q(0.5), p90: q(0.9) };
    };
    return {
        anos: porAno,
        base: { produtividadePct: faixa(r => r.base.produtividadePct) },
        intervencoes: ids.map(id => ({
            id, nome: INTERVENCOES[id].nome,
            ganhoPp: faixa(r => r.intervencoes.find(i => i.id === id).ganhoPp),
            ganhoRelPct: faixa(r => r.intervencoes.find(i => i.id === id).ganhoRelPct),
            perdaEvitadaPct: faixa(r => r.intervencoes.find(i => i.id === id).perdaEvitadaPct)
        })).sort((a, b) => b.ganhoPp.p50 - a.ganhoPp.p50)
    };
}

function frase(semR, intervencoes, todas) {
    const f = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(0)} %`;
    const partes = intervencoes.filter(i => i.temEfeito).slice(0, 3).map(i => `${i.nome}: ${f(i.ganhoPp)}`);
    if (!partes.length) return `−${semR.perdaPct.toFixed(0)} % do potencial. Nenhuma correção de solo muda o resultado: a perda vem do clima.`;
    return `−${semR.perdaPct.toFixed(0)} % do potencial. ${partes.join('. ')}. Todas juntas: ${f(todas.ganhoPp)}.`;
}
