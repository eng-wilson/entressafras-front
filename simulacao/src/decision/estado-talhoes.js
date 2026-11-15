// Estado de cada talhão no mapa de entrada ("Seus talhões"). Para cada talhão: a cultura atual (a que ocupa o
// talhão hoje ou, na entressafra, a próxima a ser plantada) e o risco dela com o clima do local nas datas de
// plantio da rotação atual. Puro (sem DOM): roda no Web Worker (workers/talhoes.worker.js) e no Node (testes).
//
//   culturaAtual(rotacao, hoje)          { posicao, cultura, nome, plantio, cicloDias, emCampo, t }
//   estadoClimaTalhao(entradas)          { estado, rotulo, posicao, cultura, nome, plantio, emCampo, t, motivo, anos, origem }
//     entradas: { serie, rotacao, solo, classe, anos, cenario, hoje }
//   classeSafra(s), fraseSafra(s)        leitura de uma safra dos indicadores (a mesma do quadro de rotações)
//   ordenarPorAtencao(lista, estadoDe)   piores primeiro: desfavorável, arriscado, favorável, sem avaliação
import { fontePower, comCenario, diaDoAnoAgricola } from '../climate/fonte-clima.js';
import { avaliarRotacao } from '../simulation/comparar.js';
import { indicadoresRotacao } from './indicadores.js';
import { CLASSES_SOLO } from '../domain/soil/presets.js';
import { soloLocal } from '../domain/soil/solo-local.js';
import { CULTURAS } from '../domain/crops/catalogo.js';

export const ROTULO_ESTADO = {
    good: 'Clima favorável', warn: 'Clima arriscado', risk: 'Clima desfavorável', neu: 'Sem avaliação'
};
export const ORDEM_ATENCAO = ['risk', 'warn', 'good', 'neu'];

const pct = v => `${Math.round(100 * v)} %`;
const cenarioAtivo = c => !!c && !!(c.dT || c.dChuvaPct || c.atrasoInicio || c.anteciparFim);

// Classe de uma safra dos indicadores: risco hídrico do ZARC, anos de quebra e anos com geada.
export function classeSafra(s) {
    if (s.riscoHidrico.id === 'inapto' || s.anosQuebra > 0.5) return 'risk';
    if (['alto', 'medio'].includes(s.riscoHidrico.id) || s.anosQuebra > 0.25 || s.anosGeada > 0.1) return 'warn';
    return 'good';
}

export function fraseSafra(s) {
    if (s.fracAnosSeca >= 0.2) return `Falta água na fase crítica em ${pct(s.fracAnosSeca)} dos anos.`;
    if (s.anosQuebra > 0.25) return `Perde mais de 30 % do potencial em ${pct(s.anosQuebra)} dos anos.`;
    if (s.plantioAntesDasChuvas > 0.3) return `Em ${pct(s.plantioAntesDasChuvas)} dos anos o plantio cai antes das chuvas.`;
    if (!s.grao) return 'Cobre o solo e deixa palhada para a próxima safra.';
    return 'Água suficiente na fase crítica na maioria dos anos.';
}

// Dia do ano agrícola (0 = 1º de julho) de uma data.
function diaAgricolaDe(hoje) {
    const d = hoje instanceof Date ? hoje : new Date(`${hoje}T12:00:00Z`);
    const mmdd = `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    return diaDoAnoAgricola(mmdd === '02-29' ? '02-28' : mmdd);
}

// Safra da rotação que ocupa o talhão em `hoje` (do plantio ao fim do ciclo). Sem nenhuma, a próxima a ser
// plantada (emCampo false, t null). t = fração do ciclo já cumprida.
export function culturaAtual(rotacao, hoje = new Date()) {
    const d = diaAgricolaDe(hoje);
    const safras = rotacao.safras.map((s, posicao) => {
        const ciclo = CULTURAS[s.cultura]?.cicloDias ?? 120;
        const desde = (d - diaDoAnoAgricola(s.plantio) + 365) % 365;
        return { posicao, s, ciclo, desde };
    });
    const emCampo = safras.filter(x => x.desde < x.ciclo).sort((a, b) => a.desde - b.desde)[0];
    const x = emCampo ?? safras.sort((a, b) => (365 - a.desde) % 365 - (365 - b.desde) % 365)[0];
    return {
        posicao: x.posicao, cultura: x.s.cultura, nome: x.s.nome ?? CULTURAS[x.s.cultura]?.nome ?? x.s.cultura,
        plantio: x.s.plantio, cicloDias: x.ciclo, emCampo: !!emCampo, t: emCampo ? x.desde / x.ciclo : null
    };
}

// Roda só a rotação atual do talhão nos anos de clima do local e lê a safra da cultura atual.
export function estadoClimaTalhao({ serie, rotacao, solo = {}, classe = 'latossolo_vermelho', anos = 12, cenario = null, hoje = new Date() }) {
    const atual = culturaAtual(rotacao, hoje);
    const fonte = fontePower(cenarioAtivo(cenario) ? comCenario(serie, cenario) : serie);
    const nAnos = Math.min(anos, fonte.anos.length - 1);
    const av = avaliarRotacao(rotacao, {
        anos: nAnos, classe: CLASSES_SOLO[classe] ?? CLASSES_SOLO.latossolo_vermelho, solo: soloLocal(solo), fonteClima: fonte
    });
    const ind = indicadoresRotacao({ av, trajetoria: { safras: [] }, fonte });
    const s = ind.safras[atual.posicao];
    const estado = classeSafra(s);
    return {
        ...atual, estado, rotulo: ROTULO_ESTADO[estado], motivo: fraseSafra(s),
        anos: ind.anos.length, origem: fonte.origem
    };
}

export function ordenarPorAtencao(lista, estadoDe) {
    const k = x => { const e = estadoDe(x); const i = ORDEM_ATENCAO.indexOf(e); return i < 0 ? ORDEM_ATENCAO.length : i; };
    return lista.map((x, i) => ({ x, i })).sort((a, b) => k(a.x) - k(b.x) || a.i - b.i).map(o => o.x);
}
