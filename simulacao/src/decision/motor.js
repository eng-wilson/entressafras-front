// Motor da ferramenta de decisão: roda as rotações escolhidas no clima do local e devolve indicadores
// prontos para a tela. Puro (sem DOM): roda no Web Worker (worker.js) e no Node (testes).
import { fontePower, comCenario, climaVsAnos } from '../climate/fonte-clima.js';
import { simulateRotacao } from '../simulation/rotacao.js';
import { avaliarRotacao } from '../simulation/comparar.js';
import { indicadoresRotacao, compararProdutividade, tendenciasClima, MERCADO_PADRAO } from './indicadores.js';
import { sobreposicaoRisco } from '../climate/clima-regional.js';
import { soloLocal, respostasSolo } from '../domain/soil/solo-local.js';
import { CLASSES_SOLO } from '../domain/soil/presets.js';
import { CULTURAS } from '../domain/crops/catalogo.js';

export const cenarioAtivo = c => !!c && (c.dT || c.dChuvaPct || c.atrasoInicio || c.anteciparFim);

// Calendário da tela: 36 decêndios de 1º de setembro a 31 de agosto (dia 1–10, 11–20, 21–fim).
export function decendioCal(iso) {
    const m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10));
    return ((m - 9 + 12) % 12) * 3 + (d <= 10 ? 0 : d <= 20 ? 1 : 2);
}
const mediana = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) / 2; return (s[Math.floor(i)] + s[Math.ceil(i)]) / 2; };

// Por decêndio do calendário, nos anos simulados: que safra ocupa o talhão, em que fase, a mediana do ISNA
// (ETa/ETc) e da Tmax média do decêndio. Decêndio sem cultura fica com safra null.
function calendarioRotacao(av) {
    const dec = Array.from({ length: 36 }, () => ({ porAno: new Map(), tmax: [], fases: new Map(), safra: null, nome: null }));
    for (const a of av.anos) a.safras.forEach((s, i) => {
        s.serie.forEach((x, d) => {
            if (x.t < 0.03) return;   // antes da emergência
            const k = decendioCal(s.clima.datas[d]);
            const D = dec[k];
            const ac = D.porAno.get(a.semente) ?? { eta: 0, etc: 0, tx: 0, n: 0 };
            ac.eta += x.eta; ac.etc += x.etc; ac.tx += x.tmax; ac.n++;
            D.porAno.set(a.semente, ac);
            D.fases.set(x.faseNome, (D.fases.get(x.faseNome) ?? 0) + 1);
            D.safra = i; D.nome = s.nome;
        });
    });
    return dec.map(D => {
        const anos = [...D.porAno.values()];
        const fase = [...D.fases.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
        return {
            safra: D.safra, nome: D.nome, fase,
            isna: mediana(anos.filter(v => v.etc > 0).map(v => v.eta / v.etc)),
            isnaP20: anos.length ? [...anos.filter(v => v.etc > 0).map(v => v.eta / v.etc)].sort((x, y) => x - y)[Math.floor(0.2 * (anos.length - 1))] ?? null : null,
            tmax: mediana(anos.map(v => v.tx / v.n))
        };
    });
}

// Chuva média de cada decêndio do calendário nos anos simulados (cabeçalho do calendário).
function chuvaPorDecendio(fonte, anos) {
    const soma = new Array(36).fill(0);
    for (const a of anos) {
        const c = fonte.safra({ ano: a, plantio: '09-01', dias: 364 });
        c.datas.forEach((iso, d) => { soma[decendioCal(iso)] += c.chuva[d]; });
    }
    return soma.map(v => v / anos.length);
}

// pedido: { serie, rotacoes: [{ id, nome, safras }], atualId, cenario, solo, classe, anos, anosTrajetoria, mercado }
export function avaliarPedido(pedido, aoProgresso = () => {}) {
    const { serie: base, rotacoes, atualId, cenario, solo = {}, classe = 'latossolo_vermelho', anos = 12, anosTrajetoria = 6 } = pedido;
    const mercado = { ...MERCADO_PADRAO, ...(pedido.mercado ?? {}) };
    const serie = cenarioAtivo(cenario) ? comCenario(base, cenario) : base;
    const fonte = fontePower(serie);
    const cls = CLASSES_SOLO[classe] ?? CLASSES_SOLO.latossolo_vermelho;
    const fsolo = soloLocal(solo);
    const nAnos = Math.min(anos, fonte.anos.length - 1);
    const total = rotacoes.length * (nAnos + 1);
    let feito = 0;

    const avs = {}, inds = [];
    for (const rot of rotacoes) {
        const av = avaliarRotacao(rot, { anos: nAnos, classe: cls, solo: fsolo, fonteClima: fonte, aoAno: () => aoProgresso(++feito, total, rot.nome) });
        const traj = simulateRotacao({ rotacao: rot, sementes: fonte.anos.slice(-anosTrajetoria), classe: cls, solo: fsolo, fonteClima: fonte });
        aoProgresso(++feito, total, rot.nome);
        avs[rot.id] = av;
        inds.push(indicadoresRotacao({ av, trajetoria: traj, fonte, mercadoLocal: mercado }));
    }
    const idAtual = avs[atualId] ? atualId : rotacoes[0].id;
    for (const ind of inds) ind.comparacao = ind.id === idAtual ? [] : compararProdutividade(avs[idAtual], avs[ind.id]);

    // Clima da última safra da cultura principal contra os outros anos, e sobreposição seca × fase sensível.
    const s0 = rotacoes[0].safras[0];
    const crop0 = CULTURAS[s0.cultura];
    const anoUlt = inds[0].anos.at(-1);
    const decendios = climaVsAnos(fonte, { ano: anoUlt, plantio: s0.plantio, dias: crop0.cicloDias });
    const janela = {
        cultura: crop0.nome, ano: anoUlt, plantio: s0.plantio, cicloDias: crop0.cicloDias, decendios,
        fases: crop0.fases.map(f => ({ codigo: f.codigo, nome: f.nome, ate: f.ate })),
        riscos: sobreposicaoRisco({ crop: crop0, decendios })
    };

    for (const ind of inds) ind.calendario = calendarioRotacao(avs[ind.id]);

    // Validação: NDVI simulado da cultura principal da rotação atual, safra a safra (o MODIS confere na tela).
    const ndviSim = avs[idAtual].anos.map(a => {
        const s = a.safras[0];
        return { ano: a.semente, nome: s.nome, datas: s.clima.datas, ndvi: s.serie.map(x => x.ndvi), ks: s.serie.map(x => x.ks) };
    });

    return {
        inds, atualId: idAtual, janela, ndviSim, chuvaDecendio: chuvaPorDecendio(fonte, inds[0].anos),
        tendencias: tendenciasClima(fonte),
        fonte: { origem: fonte.origem, anos: inds[0].anos, local: fonte.local, todosAnos: fonte.anos },
        cenario: serie.cenario ?? null,
        solo: respostasSolo(solo), classe
    };
}
