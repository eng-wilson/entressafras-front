// Pintor compartilhado pelos arquétipos C, D e E. A morfologia vem dos dados
// da cultura: folha simples/trifoliolada/palmada, flores e fruto.
import { clamp, smoothstep, mix, mulberry32 } from '../../../utils/math.js';
import { ORGAO, corDados, criarTelas, preencher, tracar, finalizarSprite } from '../mask.js';

const rgb = c => `rgb(${c.map(v => clamp(v, 0, 255) | 0).join(',')})`;
const PADRAO = {
    folhaEsc: [38, 92, 34], folha: [86, 154, 55], folhaClara: [154, 193, 72], folhaSeca: [205, 174, 88],
    haste: [71, 112, 46], hasteClara: [130, 157, 67], hasteSeca: [176, 143, 78], flor: [190, 150, 210],
    fruto: [84, 137, 48], frutoSeco: [166, 121, 64], fibra: [244, 239, 218], contorno: [26, 57, 21]
};

function folha(T, cx, cy, ang, comp, larg, idade, mat, pal, lobos = 0) {
    const ux = Math.sin(ang), uy = -Math.cos(ang), vx = Math.cos(ang), vy = Math.sin(ang);
    const perfil = u => Math.pow(Math.sin(Math.PI * u), .68) * (lobos ? .78 + .22 * Math.cos(u * Math.PI * 6) : 1);
    const ponto = (u, v) => [cx + ux * comp * u + vx * larg * v * perfil(u), cy + uy * comp * u + vy * larg * v * perfil(u)];
    const N = 14;
    for (const lado of [-1, 1]) {
        for (let i = 0; i < N; i++) {
            const u0 = i / N, u1 = (i + 1) / N, um = (i + .5) / N;
            const caminho = ctx => { ctx.moveTo(...ponto(u0, 0)); ctx.lineTo(...ponto(u0, lado)); ctx.lineTo(...ponto(u1, lado)); ctx.lineTo(...ponto(u1, 0)); ctx.closePath(); };
            const base = mix(pal.folha, pal.folhaSeca, mat * (.55 + idade * .45));
            const grad = T.c.createLinearGradient(...ponto(um, 0), ...ponto(um, lado));
            grad.addColorStop(0, rgb(pal.folhaClara)); grad.addColorStop(1, rgb(mix(pal.folhaEsc, base, .55)));
            const gd = T.d.createLinearGradient(...ponto(um, 0), ...ponto(um, lado));
            gd.addColorStop(0, corDados(um, 0, ORGAO.FOLHA, idade)); gd.addColorStop(1, corDados(um, 1, ORGAO.FOLHA, idade));
            preencher(T, caminho, grad, gd);
        }
    }
    T.c.beginPath(); T.c.moveTo(cx, cy); T.c.lineTo(...ponto(.94, 0)); T.c.lineWidth = Math.max(.7, larg * .07); T.c.strokeStyle = 'rgba(235,244,180,.48)'; T.c.stroke();
}

function fruto(T, x, y, ang, tam, pal, mat, tipo, aberto, nivel) {
    const cor = mix(pal.fruto, pal.frutoSeco, mat);
    if (tipo === 'capulho' && aberto) {
        for (let k = 0; k < 4; k++) {
            const a = k * Math.PI / 2;
            preencher(T, c => c.ellipse(x + Math.cos(a) * tam * .25, y + Math.sin(a) * tam * .18, tam * .38, tam * .28, a, 0, Math.PI * 2), rgb(pal.fibra), corDados(.7, 0, ORGAO.FRUTO));
        }
        return;
    }
    const l = tam * (nivel === 2 ? .45 : nivel === 1 ? .72 : 1), w = tam * (tipo === 'vagem_inflada' ? .36 : .22);
    T.c.save(); T.d.save(); T.c.translate(x, y); T.d.translate(x, y); T.c.rotate(ang); T.d.rotate(ang);
    preencher(T, c => c.ellipse(0, 0, l, w, 0, 0, Math.PI * 2), rgb(cor), corDados(.6, .5, ORGAO.FRUTO));
    T.c.restore(); T.d.restore();
}

export function pintarLeguminosa(crop, faseIdx, { postura = 0, espiga = 0, variante = 0 } = {}) {
    const SP = crop.sprites, F = SP.fases[faseIdx], RES = SP.resolucao, M = crop.morfologia, J = crop.janelas;
    const pal = { ...PADRAO, ...(SP.paleta || {}) }, rng = mulberry32(4103 + variante * 7919);
    const hMed = (M.alturaMax[0] + M.alturaMax[1]) / 2, h = Math.max(.025, hMed * smoothstep(J.altura[0], J.altura[1], F.t));
    const alcance = Math.max(.18, SP.comprFolha * (M.ramosMax > 6 ? 2.2 : 1.75)), topo = h + .18;
    const T = criarTelas(Math.ceil(alcance * 2 * RES), Math.ceil((topo + .06) * RES));
    const ax = T.larg / 2, ay = T.alt - .035 * RES, P = (x, y) => [ax + x * RES, ay - y * RES];
    const mat = F.maturacao || 0, murcha = postura === 2 ? .22 : postura === 1 ? .09 : 0;
    const ramos = Math.max(1, F.ramos || 1), folhas = F.folhas || 0;
    const pontosRamo = [];
    for (let r = 0; r < ramos; r++) {
        const lado = r % 2 ? 1 : -1, y0 = h * (.18 + .62 * r / Math.max(1, ramos));
        const x1 = lado * alcance * (.22 + .22 * rng()), y1 = Math.min(h * .92, y0 + h * (.18 + .12 * rng()));
        pontosRamo.push([lado, y0, x1, y1]);
        if (r > 0) tracar(T, c => { c.moveTo(...P(0, y0)); c.quadraticCurveTo(...P(x1 * .45, y1), ...P(x1, y1)); }, Math.max(1, .012 * RES), rgb(mix(pal.haste, pal.hasteSeca, mat)), corDados(.5, 0, ORGAO.COLMO));
    }
    const caule = T.c.createLinearGradient(...P(-.02, 0), ...P(.02, 0)); caule.addColorStop(0, rgb(pal.haste)); caule.addColorStop(1, rgb(mix(pal.hasteClara, pal.hasteSeca, mat)));
    tracar(T, c => { c.moveTo(...P(0, 0)); c.quadraticCurveTo(...P(.015, h * .55), ...P(0, h)); }, Math.max(2, .024 * RES), caule, corDados(.5, 0, ORGAO.COLMO));
    const tipo = SP.tipoFolha || 'trifoliolada', folPorNo = tipo === 'trifoliolada' ? 3 : tipo === 'palmada' ? 5 : 1;
    for (let i = 0; i < folhas; i++) {
        const rel = folhas > 1 ? i / (folhas - 1) : 1, idade = 1 - rel, ramo = pontosRamo[i % pontosRamo.length];
        const baseX = ramo[2] * (.35 + .58 * rel), baseY = ramo[1] + (ramo[3] - ramo[1]) * (.35 + .55 * rel);
        for (let f = 0; f < folPorNo; f++) {
            const leque = folPorNo === 1 ? 0 : (f - (folPorNo - 1) / 2) * .48;
            const ang = (ramo[0] > 0 ? .9 : -.9) + leque + murcha * ramo[0];
            const comp = SP.comprFolha * RES * (.7 + .3 * Math.sin(Math.PI * (rel * .85 + .1)));
            folha(T, ...P(baseX, baseY - murcha * rel), ang, comp, comp * (tipo === 'palmada' ? .23 : .31), idade, mat, pal, tipo === 'palmada' ? 3 : 0);
        }
    }
    if (F.cotiledone) for (const s of [-1, 1]) folha(T, ...P(s * .025, h * .18), s * .95, .11 * RES, .045 * RES, 1, mat, pal);
    const nFlor = F.flores ? Math.max(3, Math.round((M.ramosMax || 4) * 1.2)) : 0;
    for (let i = 0; i < nFlor; i++) {
        const a = pontosRamo[i % pontosRamo.length], [x, y] = P(a[2] * (.65 + .25 * rng()), a[3] * (.8 + .15 * rng()));
        const rr = .018 * RES * (F.flores || 1); preencher(T, c => c.ellipse(x, y, rr, rr * .75, 0, 0, Math.PI * 2), rgb(pal.flor), corDados(.5, 0, ORGAO.FRUTO));
    }
    if (F.vagem || F.fruto || F.capulho) {
        const n = Math.max(4, Math.round((M.vagensMax || M.frutosMax || 10) * .45));
        for (let i = 0; i < n; i++) {
            const a = pontosRamo[i % pontosRamo.length], [x, y] = P(a[2] * (.55 + .4 * rng()), a[1] + (a[3] - a[1]) * (.5 + .5 * rng()));
            fruto(T, x, y, a[0] * .75, (SP.tamFruto || .055) * RES * (F.vagem || F.fruto || F.capulho), pal, mat, SP.tipoFruto || 'vagem', !!F.capulhoAberto, espiga);
        }
    }
    return finalizarSprite(T, { ancora: [ax, ay], res: RES, maturacao: mat, alturaColmo: h });
}
