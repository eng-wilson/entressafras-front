// Pintor do arquétipo B: uma instância representa uma touceira com perfilhos.
import { clamp, smoothstep, mix, mulberry32 } from '../../../utils/math.js';
import { ORGAO, corDados, criarTelas, tracar, preencher, finalizarSprite } from '../mask.js';
const rgb = c => `rgb(${c.map(v => clamp(v, 0, 255) | 0).join(',')})`;
const PADRAO = { folha: [70, 145, 48], folhaClara: [148, 190, 62], seco: [218, 176, 66], colmo: [84, 128, 48], grao: [221, 169, 53], contorno: [28, 62, 20] };

function folhaFita(T, x0, y0, x1, y1, arco, largura, idade, cor) {
    const N = 12, centro = [];
    for (let i = 0; i <= N; i++) {
        const u = i / N, m = 1 - u;
        centro.push([m * m * x0 + 2 * m * u * ((x0 + x1) / 2) + u * u * x1, m * m * y0 + 2 * m * u * arco + u * u * y1]);
    }
    for (const lado of [-1, 1]) for (let i = 0; i < N; i++) {
        const u = (i + .5) / N, a = centro[i], b = centro[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
        const w0 = largura * Math.sin(Math.PI * i / N), w1 = largura * Math.sin(Math.PI * (i + 1) / N);
        const e0 = [a[0] - dy / dl * w0 * lado, a[1] + dx / dl * w0 * lado], e1 = [b[0] - dy / dl * w1 * lado, b[1] + dx / dl * w1 * lado];
        const caminho = c => { c.moveTo(...a); c.lineTo(...e0); c.lineTo(...e1); c.lineTo(...b); c.closePath(); };
        const gc = T.c.createLinearGradient(...a, ...e1); gc.addColorStop(0, rgb(mix(cor, [235, 242, 170], .28))); gc.addColorStop(1, rgb(cor));
        const gd = T.d.createLinearGradient(...a, ...e1); gd.addColorStop(0, corDados(u, 0, ORGAO.FOLHA, idade)); gd.addColorStop(1, corDados(u, 1, ORGAO.FOLHA, idade));
        preencher(T, caminho, gc, gd);
    }
}

export function pintarGramineaTouceira(crop, faseIdx, { postura = 0, espiga = 0, variante = 0 } = {}) {
    const SP = crop.sprites, F = SP.fases[faseIdx], RES = SP.resolucao, M = crop.morfologia, J = crop.janelas;
    const pal = { ...PADRAO, ...(SP.paleta || {}) }, rng = mulberry32(8191 + variante * 1237), mat = F.maturacao || 0;
    const hMed = (M.alturaMax[0] + M.alturaMax[1]) / 2, h = Math.max(.03, hMed * smoothstep(J.altura[0], J.altura[1], F.t));
    const perfilhos = Math.max(2, F.perfilhos || 3), alcance = Math.max(.16, perfilhos * .022 + SP.comprFolha * .55);
    const T = criarTelas(Math.ceil(alcance * 2 * RES), Math.ceil((h + .36) * RES)), ax = T.larg / 2, ay = T.alt - .03 * RES, P = (x, y) => [ax + x * RES, ay - y * RES];
    for (let n = 0; n < perfilhos; n++) {
        const rel = perfilhos > 1 ? n / (perfilhos - 1) : .5, lado = rel * 2 - 1, hh = h * (.82 + .18 * rng());
        const incl = (M.decumbente ? .34 : .1) * lado + (rng() - .5) * .08, topo = [Math.sin(incl) * hh, Math.cos(incl) * hh];
        tracar(T, c => { c.moveTo(...P(lado * .018, 0)); c.quadraticCurveTo(...P(topo[0] * .35, hh * .5), ...P(...topo)); }, Math.max(1, .009 * RES), rgb(mix(pal.colmo, pal.seco, mat)), corDados(.5, 0, ORGAO.COLMO));
        const nf = Math.max(2, F.folhas || 3);
        for (let l = 0; l < nf; l++) {
            const idade = 1 - l / Math.max(1, nf - 1), y0 = hh * (.12 + .62 * l / nf), s = (l + n) % 2 ? 1 : -1;
            const L = SP.comprFolha * (.65 + .3 * rng()), queda = postura === 2 ? .28 : postura === 1 ? .08 : .14;
            const [x0, ypx] = P(topo[0] * y0 / hh, y0), [x1, y1] = P(topo[0] * y0 / hh + s * L * .55, y0 + L * (.55 - queda));
            const cor = mix(pal.folha, pal.seco, mat * (.5 + idade * .5));
            folhaFita(T, x0, ypx, x1, y1, Math.min(ypx, y1) - L * RES * .18, Math.max(1.2, SP.largFolha * RES * (postura ? .65 : 1)), idade, cor);
        }
        if (F.inflorescencia) {
            const [tx, ty] = P(...topo), tipo = SP.inflorescencia || 'espiga', fator = [1, .75, .42][espiga];
            if (tipo === 'espiga') {
                const len = .18 * RES * F.inflorescencia * fator;
                tracar(T, c => { c.moveTo(tx, ty); c.lineTo(tx + incl * len, ty - len); }, Math.max(2, .025 * RES), rgb(mix(pal.folhaClara, pal.grao, mat)), corDados(.7, 0, ORGAO.GRAO));
                for (let k = 1; k < 8; k++) for (const s of [-1, 1]) tracar(T, c => { const yy = ty - len * k / 8; c.moveTo(tx, yy); c.lineTo(tx + s * .055 * RES, yy - .08 * RES); }, .8, rgb(pal.grao), corDados(k / 8, 0, ORGAO.GRAO));
            } else {
                const len = .2 * RES * F.inflorescencia * fator;
                for (let k = 0; k < 7; k++) { const yy = ty - len * k / 7, s = k % 2 ? 1 : -1, dx = (tipo === 'panicula' ? .1 : .07) * RES * s * (1 - k / 9); tracar(T, c => { c.moveTo(tx, yy); c.quadraticCurveTo(tx + dx * .6, yy + len * .1, tx + dx, yy + len * .22); }, 1, rgb(pal.grao), corDados(k / 7, 0, ORGAO.GRAO)); }
            }
        }
    }
    return finalizarSprite(T, { ancora: [ax, ay], res: RES, maturacao: mat, alturaColmo: h });
}
