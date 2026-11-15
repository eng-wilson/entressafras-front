// Avaliação de rotações em vários anos de clima.
//
//   avaliarRotacao(rotacao, opcoes)   roda a rotação em N anos; cada ano tem um ciclo de aquecimento antes
//                                     (o solo e as pragas já chegam no estado da própria rotação)
//
// Todas as rotações de uma comparação usam os mesmos anos: a diferença de cada ano isola a decisão (a
// rotação) do acaso (o clima). A comparação pareada fica em decision/indicadores.js (compararProdutividade).
import { simulateRotacao } from './rotacao.js';
import { ROTULO_CANAL } from '../domain/channels.js';

export const ROTULO_CAUSA = {
    ...ROTULO_CANAL,
    nematoide: 'Nematoide (Pratylenchus)',
    percevejo: 'Percevejo',
    outros: 'Outras causas'
};

export function sementesDosAnos(anos, base = 2000) {
    return Array.from({ length: anos }, (_, i) => base + i);
}

// fonteClima (src/climate/fonte-clima.js): com ela, os anos são os `anos` mais recentes da fonte e o aquecimento
// usa o ano agrícola anterior; sem ela, sementes do gerador regional (comportamento original).
// aoAno(semente): chamado depois de cada ano (barra de progresso).
export function avaliarRotacao(rotacao, { anos = 8, sementeBase = 2000, aquecimento = 1, classe, solo, normais, params, fonteClima = null, aoAno } = {}) {
    const resultadoAnos = [];
    const lista = fonteClima ? fonteClima.anos.slice(-anos) : sementesDosAnos(anos, sementeBase);
    for (const semente of lista) {
        const sementes = [];
        for (let a = aquecimento; a >= 1; a--) sementes.push(fonteClima ? fonteClima.aquecimento(semente, a) : semente - 1000 - a);   // anos de aquecimento: outra faixa de sementes
        sementes.push(semente);
        const r = simulateRotacao({ rotacao, sementes, classe, solo, normais, params, fonteClima });
        aoAno?.(semente);
        resultadoAnos.push({ semente, safras: r.safras.filter(s => s.ciclo === aquecimento) });
    }
    return {
        rotacao, anos: resultadoAnos,
        porSafra: rotacao.safras.map((_, i) => {
            const y = resultadoAnos.map(a => a.safras[i].resumo.produtividade);
            const s0 = resultadoAnos[0].safras[i];
            return { nome: s0.nome, unidade: s0.resumo.unidade, potencial: s0.resumo.potencial, p10: quantil(y, 0.1), p50: quantil(y, 0.5), p90: quantil(y, 0.9) };
        })
    };
}

function quantil(a, q) {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
