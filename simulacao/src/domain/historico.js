// Histórico de safras do talhão: o que foi plantado em cada ano agrícola (1ª safra de verão, 2ª safra),
// produtividade e pragas. A safra registrada mais recente vira a "rotação atual", ponto de partida das
// comparações. Puro (sem DOM).
//
// Registro de um ano: { c1, c2, sc1?, sc2?, pragas?: bool, quais?: [nome] }
//   c1, c2: id de cultura do catálogo, NAO_PLANTEI (só na 2ª safra) ou "outra:<nome>" (fora do catálogo:
//   fica no histórico, mas não entra na simulação).
// historico: { 'AAAA/AA': registro }
import { CULTURAS } from './crops/catalogo.js';

export const NAO_PLANTEI = 'nao_plantei';
export const GRUPOS_CULTURA = [
    ['Grãos', ['soja', 'milho', 'feijao', 'arroz', 'sorgo', 'trigo', 'algodao']],
    ['Cobertura do solo', ['milheto', 'brizantha_marandu', 'brizantha_piata', 'brizantha_paiaguas', 'ruziziensis', 'crotalaria_spectabilis', 'crotalaria_juncea', 'crotalaria_ochroleuca']]
];
// Mais comuns no Cerrado, na ordem do protótipo.
export const SUGESTOES = { c1: ['soja', 'milho', 'algodao'], c2: ['milho', 'sorgo', 'milheto', NAO_PLANTEI] };
export const PRAGAS = ['Lagarta', 'Percevejo', 'Cigarrinha', 'Mosca-branca', 'Nematoide', 'Outra'];

// Datas de plantio usadas para simular o que o agricultor registrou (o registro não pede a data).
const PLANTIO_VERAO = { algodao: '12-05', arroz: '11-05', feijao: '11-05' };
const PLANTIO_PADRAO = { c1: '10-15', c2: '02-15' };

export const rotuloSafra = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
export const anoDaSafra = rotulo => parseInt(rotulo.slice(0, 4), 10);
// Ano agrícola de julho a junho: de julho em diante, a safra que começa neste ano é a que se planeja agora.
export const safraPlanejada = (hoje = new Date()) => (hoje.getMonth() >= 6 ? hoje.getFullYear() : hoje.getFullYear() - 1);
export const ultimaSafra = (hoje = new Date()) => safraPlanejada(hoje) - 1;

export const ehOutra = v => typeof v === 'string' && v.startsWith('outra:');
export function nomeCultura(v) {
    if (!v) return '';
    if (v === NAO_PLANTEI) return 'Não plantei';
    if (ehOutra(v)) return v.slice(6);
    return CULTURAS[v]?.nome ?? v;
}
export const completo = r => !!(r && r.c1 && r.c2);

// Registro → rotação para a simulação: uma existente (mesmas culturas, sem consórcio) ou uma nova.
// Devolve { rotacao, nova, simulavel, motivo }.
export function rotacaoDoRegistro(r, rotacoes) {
    if (!r?.c1) return { rotacao: null, simulavel: false, motivo: 'Sem a 1ª safra registrada.' };
    if (ehOutra(r.c1) || ehOutra(r.c2)) return { rotacao: null, simulavel: false, motivo: `${nomeCultura(ehOutra(r.c1) ? r.c1 : r.c2)} ainda não é simulada.` };
    const safras = [r.c1, r.c2].filter(c => c && c !== NAO_PLANTEI);
    const existente = Object.values(rotacoes).find(x => x.safras.length === safras.length && x.safras.every((s, i) => s.cultura === safras[i] && !s.companheira));
    if (existente) return { rotacao: existente, nova: false, simulavel: true };
    const id = `hist_${safras.join('_')}`;
    const s1 = { cultura: r.c1, plantio: PLANTIO_VERAO[r.c1] ?? PLANTIO_PADRAO.c1 };
    const lista = [s1];
    if (safras.length > 1) {
        const s2 = { cultura: r.c2, plantio: PLANTIO_PADRAO.c2 };
        if (r.c2 === 'milho') { s2.nome = 'Milho safrinha'; s2.potencial = 130; }   // teto da safrinha, como em simulation/rotacao.js
        lista.push(s2);
    }
    const nome = safras.length > 1 ? `${nomeCultura(r.c1)} depois ${(lista[1].nome ?? nomeCultura(r.c2)).replace(/^./, c => c.toLowerCase())}` : `${nomeCultura(r.c1)} sem safrinha`;
    return { rotacao: { id, nome, safras: lista }, nova: true, simulavel: true };
}

// Registro mais recente com a 1ª safra: a rotação que o agricultor faz hoje.
export function registroMaisRecente(historico) {
    const anos = Object.keys(historico ?? {}).filter(k => historico[k]?.c1).sort();
    return anos.length ? { safra: anos.at(-1), registro: historico[anos.at(-1)] } : null;
}
