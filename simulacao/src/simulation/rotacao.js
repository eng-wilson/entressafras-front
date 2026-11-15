// Rotação: safras encadeadas no mesmo talhão. O solo do fim de uma safra (com palhada, crédito de N,
// descompactação, pragas) é o começo da próxima (solo/entressafra.js, pragas.js), e o clima segue o
// calendário do ano agrícola (climaRegional.js). Cada safra sai com produtividade, perda por causa
// e eventos críticos.
//
//   simulateRotacao({ rotacao, sementes, classe, solo, fonteClima })   sementes = um ano agrícola por ciclo
//     fonteClima (src/climate/fonte-clima.js): clima observado (NASA POWER) ou sintético. Sem ela, o gerador
//     regional com `normais` (comportamento original).
//     retratos: true, false ou (ciclo, posicao) => bool, para guardar os retratos diários só da safra que a tela mostra.
//   ROTACOES                                                rotações de exemplo (as quatro do protótipo)
//
// Uma safra da rotação: { cultura, plantio: 'MM-DD', nome?, potencial?, companheira?, adubacaoN? }
// companheira: cultura em consórcio (milho + braquiária, milheto + crotalária). Entra no resíduo e nas
// pragas; a simulação diária roda a cultura principal.
import { PARAMS } from './parametros.js';
import { simulateSeason } from './season.js';
import { climaDaSafraRegional, diaAgricola, NORMAIS } from '../climate/clima-regional.js';
import { criarHeranca, residuoCombinado } from './solo/entressafra.js';
import { pressaoInicial, hospedeiroCombinado, perdaPorPragas, proximaPressao } from './pragas.js';
import { comPercentuais } from './impacto.js';
import { CULTURAS } from '../domain/crops/catalogo.js';
import { agronomiaDe } from '../domain/crops/agronomia.js';
import { gerarPlantas } from '../domain/plantio.js';

export const ROTACOES = {
    soja_milho: {
        nome: 'Soja depois milho safrinha',
        safras: [
            { cultura: 'soja', plantio: '10-15' },
            { cultura: 'milho', plantio: '02-15', nome: 'Milho safrinha', potencial: 130 }
        ]
    },
    soja_crotalaria_milheto: {
        nome: 'Soja depois crotalária + milheto',
        safras: [
            { cultura: 'soja', plantio: '10-15' },
            { cultura: 'milheto', plantio: '02-15', companheira: 'crotalaria_spectabilis', nome: 'Crotalária + milheto' }
        ]
    },
    soja_milho_braquiaria: {
        nome: 'Soja depois milho + braquiária',
        safras: [
            { cultura: 'soja', plantio: '10-15' },
            { cultura: 'milho', plantio: '02-15', companheira: 'brizantha_marandu', nome: 'Milho safrinha + braquiária', potencial: 130 }
        ]
    },
    soja_sorgo: {
        nome: 'Soja depois sorgo',
        safras: [
            { cultura: 'soja', plantio: '10-15' },
            { cultura: 'sorgo', plantio: '02-25', nome: 'Sorgo safrinha' }
        ]
    }
};

const PENALIDADE_CONSORCIO = 0.03;   // companheira compete um pouco com a cultura de grão
const PERDA_PRAGAS_MAX = 0.6;

// Fração dos dias da entressafra com umidade para decompor palhada: dia úmido = ≥ 10 mm de chuva nos 10 dias
// anteriores. chuvaAno: ano agrícola (dia 0 = 1º de julho); o intervalo que passa de junho volta ao começo do ano.
function fracaoUmida(chuvaAno, inicio, dias) {
    if (dias <= 0) return 1;
    const n = chuvaAno.length;
    let umidos = 0;
    for (let d = 0; d < dias; d++) {
        let s = 0;
        for (let k = 0; k < 10; k++) s += chuvaAno[(((inicio + d - k) % n) + n) % n];
        if (s >= 10) umidos++;
    }
    return umidos / dias;
}

function intervalo(safraA, cropA, safraB) {
    const fimA = diaAgricola(safraA.plantio) + cropA.cicloDias;
    let iniB = diaAgricola(safraB.plantio);
    while (iniB < fimA) iniB += 365;
    return iniB - fimA;
}

export function simulateRotacao({
    rotacao, sementes, classe, solo, normais = NORMAIS.cerrado_go, params = PARAMS,
    width = 4.2, depth = 4.2, retratos = false, fonteClima = null
}) {
    const safras = [];
    const seq = [];
    for (let ci = 0; ci < sementes.length; ci++) for (let si = 0; si < rotacao.safras.length; si++) seq.push({ ci, si });

    let anterior = null, pressao = pressaoInicial(params), diasAntes = 0, umidaAntes = 1;
    const chuvaDoAno = semente => (fonteClima
        ? fonteClima.safra({ ano: semente, plantio: '07-01', dias: 364 })
        : climaDaSafraRegional({ semente, plantio: '07-01', dias: 364, normais })).chuva;
    for (let i = 0; i < seq.length; i++) {
        const { ci, si } = seq[i];
        const s = rotacao.safras[si];
        const crop = CULTURAS[s.cultura];
        if (!crop) throw new Error(`cultura desconhecida na rotação: ${s.cultura}`);
        const comp = s.companheira ? CULTURAS[s.companheira] : null;
        const agro = agronomiaDe(crop), agroComp = comp ? agronomiaDe(comp) : null;
        const cobertura = agro.produto.tipo === 'cobertura';
        const semente = sementes[ci];

        const cenario = {
            clima: fonteClima
                ? dias => fonteClima.safra({ ano: semente, plantio: s.plantio, dias })
                : dias => climaDaSafraRegional({ semente, plantio: s.plantio, dias, normais }),
            solo,
            adubacaoN: s.adubacaoN !== undefined ? s.adubacaoN : (cobertura ? null : undefined)
        };
        let potencial = s.potencial ?? agro.produto.potencial;
        if (comp && !cobertura) potencial *= 1 - PENALIDADE_CONSORCIO;

        const comRetratos = typeof retratos === 'function' ? !!retratos(ci, si) : retratos;
        const heranca = anterior ? criarHeranca({ anterior, diasEntressafra: diasAntes, fracaoUmida: umidaAntes }) : null;
        let soloInicial = null;
        const sim = simulateSeason({
            crop, classe, cenario, width, depth, params, retratos: comRetratos, potencial,
            plants: gerarPlantas(crop, { width, depth }),
            herdar: (E, ctx) => { if (heranca) heranca(E, ctx); soloInicial = retratoSoloMedio(E); }
        });

        // Pragas: perda sobre a produtividade da simulação, somada às perdas por causa.
        const resumo = { ...sim.impacto.resumo, perdas: { ...sim.impacto.resumo.perdas } };
        const hosp = hospedeiroCombinado(agro, agroComp);
        const fr = perdaPorPragas(pressao, agro, hosp, params);
        // Intensidade visual derivada das mesmas frações de perda, sem somar nova penalidade.
        sim.pragasVisuais = Object.fromEntries(Object.entries(fr).map(([k, v]) => [k, Math.min(1, v * 5)]));
        const somaFr = Object.values(fr).reduce((a, b) => a + b, 0);
        const escala = somaFr > PERDA_PRAGAS_MAX ? PERDA_PRAGAS_MAX / somaFr : 1;
        const Y0 = resumo.produtividade;
        for (const [k, f] of Object.entries(fr)) {
            const v = Y0 * f * escala;
            if (v > 0) { resumo.perdas[k] = v; resumo.produtividade -= v; }
        }
        comPercentuais(resumo);

        safras.push({
            ciclo: ci, posicao: si, semente,
            nome: s.nome ?? (comp ? `${crop.nome} + ${comp.nome}` : crop.nome),
            cultura: crop.id, companheira: comp?.id ?? null, plantio: s.plantio, cicloDias: crop.cicloDias,
            diasEntressafraAntes: anterior ? diasAntes : null,
            fracaoUmidaEntressafra: anterior ? umidaAntes : null,
            pressaoPragas: pressao,
            soloInicial,
            resumo,
            eventos: sim.impacto.eventos,
            serie: sim.impacto.serie,
            clima: sim.clima,
            sim: comRetratos ? sim : undefined
        });

        const prox = seq[i + 1];
        diasAntes = prox ? intervalo(s, crop, rotacao.safras[prox.si]) : 0;
        umidaAntes = prox ? fracaoUmida(chuvaDoAno(semente), diaAgricola(s.plantio) + crop.cicloDias, diasAntes) : 1;
        anterior = {
            E: sim.estadoFinal,
            residuo: residuoCombinado(agro, agroComp),
            biomassa: sim.impacto.resumo.fatores.biomassa,
            cicloDias: crop.cicloDias,
            graminea: crop.archetype.startsWith('graminea')
        };
        pressao = proximaPressao(pressao, hosp, diasAntes, params);
    }
    return { rotacao, safras };
}

// Médias do talhão nas camadas de cima (0–30 cm): para mostrar o que a safra anterior deixou.
// Só lê o estado; chamado logo depois da herança, no começo da safra.
function retratoSoloMedio(E) {
    const { NC, L } = E;
    let palhada = 0, N = 0, comp = 0, bio = 0, mo = 0;
    for (let c = 0; c < NC; c++) {
        palhada += E.palhada[c]; N += E.fert.N[c];
        for (let k = 0; k < 3; k++) { comp += E.comp[c * L + k]; bio += E.bio[c * L + k]; mo += E.mo[c * L + k]; }
    }
    return { palhada: palhada / NC, N: N / NC, compactacao: comp / (NC * 3), biologia: bio / (NC * 3), mo: mo / (NC * 3) };
}
