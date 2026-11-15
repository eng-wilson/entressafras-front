// Pintor procedural do arquétipo C, especializado na soja.
// Mantém o acabamento do milho (luz de cima à direita, gradientes, nervura,
// contorno da própria paleta) e gera a máscara u/v/órgão/idade em paralelo.
import { clamp, smoothstep, mix, lerp, mulberry32 } from '../../../utils/math.js';
import { ORGAO, corDados, criarTelas, preencher, tracar, finalizarSprite } from '../mask.js';

export const PALETA_SOJA = {
    folhaBase: [42, 96, 34], folhaMeio: [88, 153, 51], folhaClara: [158, 194, 72],
    folhaLuz: [211, 216, 91], folhaInferior: [126, 151, 105], folhaAmarela: [220, 191, 61], folhaSeca: [190, 143, 66],
    hasteEsc: [52, 91, 38], haste: [89, 133, 54], hasteLuz: [154, 174, 78], hasteSeca: [165, 124, 67],
    cotiledone: [147, 181, 72], flor: [184, 137, 211], florLuz: [235, 211, 244], florCentro: [113, 70, 143],
    vagemVerde: [91, 145, 54], vagemLuz: [161, 183, 81], vagemSeca: [171, 126, 66], vagemEsc: [91, 67, 39],
    contorno: [28, 58, 19]
};

const rgb = c => `rgb(${c.map(v => clamp(v, 0, 255) | 0).join(',')})`;
const rgba = (c, a) => `rgba(${c.map(v => clamp(v, 0, 255) | 0).join(',')},${a})`;
const esc = (c, k, add = 0) => c.map(v => v * k + add);

// Folíolo oval com ponta aguda. A lâmina é dividida longitudinalmente e em
// segmentos para u crescer da base à ponta e v da nervura à margem.
function foliolo(T, { x, y, ang, comp, larg, idade, mat, pal, inferior = false, queda = 0 }) {
    const N = 18;
    const centro = [], normal = [], meia = [];
    const dx = Math.sin(ang), dy = -Math.cos(ang);
    const nx = Math.cos(ang), ny = Math.sin(ang);
    for (let i = 0; i <= N; i++) {
        const u = i / N;
        const curva = queda * comp * u * u;
        centro.push([x + dx * comp * u + nx * curva * .12, y + dy * comp * u + curva]);
        normal.push([nx, ny]);
        meia.push(larg * Math.pow(Math.sin(Math.PI * u), .68) * (1 - .18 * u));
    }
    const corAoLongo = u => {
        let c = u < .35 ? mix(pal.folhaBase, pal.folhaMeio, u / .35) : mix(pal.folhaMeio, pal.folhaClara, (u - .35) / .65);
        const amarelo = clamp(mat * 1.35 - (1 - idade) * .55 + u * mat * .12);
        c = mix(c, pal.folhaAmarela, amarelo * .86);
        c = mix(c, pal.folhaSeca, clamp((mat - .68) * 2.6) * (.45 + .55 * idade));
        return inferior ? mix(c, pal.folhaInferior, .72) : c;
    };
    for (const lado of [-1, 1]) for (let i = 0; i < N; i++) {
        const u = (i + .5) / N, a = centro[i], b = centro[i + 1];
        const e0 = [a[0] + normal[i][0] * meia[i] * lado, a[1] + normal[i][1] * meia[i] * lado];
        const e1 = [b[0] + normal[i + 1][0] * meia[i + 1] * lado, b[1] + normal[i + 1][1] * meia[i + 1] * lado];
        const caminho = c => { c.moveTo(...a); c.lineTo(...e0); c.lineTo(...e1); c.lineTo(...b); c.closePath(); };
        const base = corAoLongo(u), grad = T.c.createLinearGradient(...a, ...e1);
        grad.addColorStop(0, rgb(inferior ? esc(base, 1.04, 5) : mix(base, pal.folhaLuz, .28)));
        grad.addColorStop(1, rgb(esc(base, lado > 0 ? .78 : .88, lado < 0 ? 3 : 0)));
        const gd = T.d.createLinearGradient(...a, ...e1);
        gd.addColorStop(0, corDados(u, 0, ORGAO.FOLHA, idade));
        gd.addColorStop(1, corDados(u, 1, ORGAO.FOLHA, idade));
        preencher(T, caminho, grad, gd);
    }
    // Contorno, nervura e brilho pertencem apenas à arte de cor.
    const c = T.c;
    c.beginPath();
    for (let i = 0; i <= N; i++) c.lineTo(centro[i][0] + normal[i][0] * meia[i], centro[i][1] + normal[i][1] * meia[i]);
    for (let i = N; i >= 0; i--) c.lineTo(centro[i][0] - normal[i][0] * meia[i], centro[i][1] - normal[i][1] * meia[i]);
    c.closePath(); c.strokeStyle = rgba(pal.contorno, .52); c.lineWidth = Math.max(.75, larg * .065); c.stroke();
    c.beginPath(); for (let i = 1; i < N - 1; i++) c.lineTo(...centro[i]);
    c.strokeStyle = inferior ? 'rgba(225,234,206,.38)' : 'rgba(235,242,176,.52)'; c.lineWidth = Math.max(.6, larg * .055); c.stroke();
    if (!inferior) {
        c.beginPath();
        for (let i = 3; i < N - 4; i++) c.lineTo(centro[i][0] + normal[i][0] * meia[i] * -.48, centro[i][1] + normal[i][1] * meia[i] * -.48);
        c.strokeStyle = 'rgba(255,255,214,.25)'; c.lineWidth = Math.max(.7, larg * .1); c.stroke();
    }
}

function peciolo(T, a, b, idade, pal, mat, larg = 1.1) {
    const cor = mix(pal.haste, pal.hasteSeca, mat);
    tracar(T, c => { c.moveTo(...a); c.lineTo(...b); }, larg, rgb(cor), corDados(.2, 0, ORGAO.FOLHA, idade));
}

function trifolio(T, base, dir, tam, idade, mat, pal, postura, variacao) {
    const pet = tam * .34;
    const j = [Math.sin(dir) * pet, -Math.cos(dir) * pet];
    const centro = [base[0] + j[0], base[1] + j[1]];
    peciolo(T, base, centro, idade, pal, mat, Math.max(.8, tam * .035));
    const abertura = postura === 1 ? .76 : .9;
    const queda = postura === 2 ? .42 : postura === 1 ? .16 : .06;
    const flipped = postura > 0;
    const itens = [
        { a: dir + variacao * .08, k: 1.02, inf: flipped },
        { a: dir - abertura + variacao * .12, k: .86, inf: flipped && variacao > -.35 },
        { a: dir + abertura + variacao * .12, k: .86, inf: flipped && variacao < .35 }
    ];
    for (const it of itens) foliolo(T, {
        x: centro[0], y: centro[1], ang: it.a, comp: tam * it.k, larg: tam * .32,
        idade, mat, pal, inferior: it.inf, queda
    });
}

function folhaOposta(T, base, lado, tam, idade, mat, pal, postura, cotiledone = false) {
    const ang = lado * (cotiledone ? 1.18 : 1.02) + (postura === 2 ? lado * .28 : 0);
    foliolo(T, {
        x: base[0], y: base[1], ang, comp: tam, larg: tam * (cotiledone ? .42 : .36), idade, mat, pal,
        inferior: postura > 0 && !cotiledone, queda: postura === 2 ? .38 : postura === 1 ? .12 : .02
    });
}

function florSoja(T, x, y, escala, pal, nivel) {
    const rr = escala * (nivel === 2 ? .62 : nivel === 1 ? .82 : 1);
    for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5 - .6;
        const px = x + Math.cos(a) * rr * .45, py = y + Math.sin(a) * rr * .34;
        preencher(T, c => c.ellipse(px, py, rr * .46, rr * .3, a, 0, Math.PI * 2), rgb(k < 2 ? pal.florLuz : pal.flor), corDados(.5, 0, ORGAO.FRUTO));
    }
    preencher(T, c => c.arc(x, y, rr * .2, 0, Math.PI * 2), rgb(pal.florCentro), corDados(.5, 0, ORGAO.FRUTO));
}

function vagemSoja(T, x, y, ang, tam, mat, pal, nivel, sementes, variante) {
    const fator = nivel === 2 ? .44 : nivel === 1 ? .72 : 1;
    const L = tam * fator, W = tam * (nivel === 2 ? .12 : .22);
    const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    const p = (s, w) => [x + ux * L * (s - .5) + vx * W * w, y + uy * L * (s - .5) + vy * W * w];
    const caminho = c => {
        c.moveTo(...p(0, 0));
        c.bezierCurveTo(...p(.18, -1), ...p(.78, -1), ...p(1, 0));
        c.bezierCurveTo(...p(.78, 1), ...p(.18, 1), ...p(0, 0)); c.closePath();
    };
    const base = mix(pal.vagemVerde, pal.vagemSeca, mat), grad = T.c.createLinearGradient(...p(.5, -1), ...p(.5, 1));
    grad.addColorStop(0, rgb(esc(base, .7))); grad.addColorStop(.6, rgb(mix(base, pal.vagemLuz, .35))); grad.addColorStop(1, rgb(esc(base, .86)));
    preencher(T, caminho, grad, corDados(.65, .45, ORGAO.FRUTO));
    T.c.beginPath(); caminho(T.c); T.c.strokeStyle = rgba(mix(pal.contorno, pal.vagemEsc, .45), .55); T.c.lineWidth = .8; T.c.stroke();
    if (nivel < 2) for (let k = 0; k < sementes; k++) {
        const s = (k + 1) / (sementes + 1), [px, py] = p(s, .05);
        T.c.beginPath(); T.c.arc(px - 1, py - 1, Math.max(1, W * .34), 0, Math.PI * 2);
        T.c.fillStyle = rgba(esc(base, 1.08, 8), .45 + .12 * (variante % 2)); T.c.fill();
    }
    // Pubescência sugerida por pequenos realces, sem alterar a máscara.
    T.c.strokeStyle = rgba(pal.vagemLuz, .35); T.c.lineWidth = .45;
    for (let k = 1; k < 6; k++) { const [px, py] = p(k / 6, 1); T.c.beginPath(); T.c.moveTo(px, py); T.c.lineTo(px + vx * 1.5, py + vy * 1.5); T.c.stroke(); }
}

export function pintarLeguminosaBaixa(crop, faseIdx, { postura = 0, espiga = 0, variante = 0 } = {}) {
    const SP = crop.sprites, F = SP.fases[faseIdx], RES = SP.resolucao;
    const M = crop.morfologia, J = crop.janelas, pal = { ...PALETA_SOJA, ...(SP.paleta || {}) };
    const semente = 20240 + variante * 7919;
    const rngRamo = mulberry32(semente + 17), rngFolha = mulberry32(semente + 53), rngRepro = mulberry32(semente + 101);
    const hMed = (M.alturaMax[0] + M.alturaMax[1]) / 2;
    const h = Math.max(.025, hMed * smoothstep(J.altura[0], J.altura[1], F.t));
    const hasteVis = Math.max(.055, h), mat = F.maturacao || 0;
    const alcance = Math.max(.24, SP.comprFolha * 1.82), topo = Math.max(hasteVis + .12, .16);
    const T = criarTelas(Math.ceil((alcance * 2 + .08) * RES), Math.ceil((topo + .075) * RES));
    const ax = T.larg / 2, ay = T.alt - .035 * RES;
    const P = (x, y) => [ax + x * RES, ay - y * RES];

    const nRamos = Math.max(1, F.ramos || 1), nTrifolios = F.unifoliolada || F.cotiledone ? Math.max(0, (F.folhas || 2) - 2) : Math.max(0, F.folhas || 0);
    const ramos = [];
    for (let r = 0; r < nRamos; r++) {
        const lado = r % 2 ? 1 : -1, y0 = hasteVis * (.22 + .58 * r / Math.max(1, nRamos));
        const len = alcance * (.19 + .11 * rngRamo()) * smoothstep(.1, .5, F.t);
        ramos.push({ lado, y0, x1: lado * len, y1: Math.min(hasteVis * .93, y0 + hasteVis * (.13 + .1 * rngRamo())), fase: rngRamo() });
    }

    const folhas = [];
    for (let i = 0; i < nTrifolios; i++) {
        const rel = nTrifolios > 1 ? i / (nTrifolios - 1) : 1, idade = 1 - rel;
        const ramo = ramos[i % ramos.length], s = .35 + .58 * ((i / ramos.length) % 1);
        const x = ramo.x1 * s, y = ramo.y0 + (ramo.y1 - ramo.y0) * s;
        const dir = ramo.lado * (1.03 + (rngFolha() - .5) * .28);
        const tam = SP.comprFolha * RES * (.34 + .14 * Math.sin(Math.PI * (rel * .82 + .08)));
        folhas.push({ base: P(x, y), dir, tam, idade, variacao: (rngFolha() - .5) * 2, tras: ramo.fase < .48 });
    }

    const desenharTrifolio = fo => trifolio(T, fo.base, fo.dir, fo.tam, fo.idade, mat, pal, postura, fo.variacao);
    for (const fo of folhas) if (fo.tras) desenharTrifolio(fo);

    // Ramos e haste são desenhados entre a folhagem de trás e a da frente.
    const corHaste = mix(pal.haste, pal.hasteSeca, mat);
    for (let r = 1; r < ramos.length; r++) {
        const a = ramos[r];
        tracar(T, c => { c.moveTo(...P(0, a.y0)); c.quadraticCurveTo(...P(a.x1 * .45, a.y1), ...P(a.x1, a.y1)); }, Math.max(1, .011 * RES), rgb(corHaste), corDados(.5, 0, ORGAO.COLMO));
    }
    const gH = T.c.createLinearGradient(...P(-.018, 0), ...P(.018, 0));
    gH.addColorStop(0, rgb(esc(corHaste, .72))); gH.addColorStop(.68, rgb(mix(corHaste, pal.hasteLuz, .45))); gH.addColorStop(1, rgb(corHaste));
    tracar(T, c => { c.moveTo(...P(0, 0)); c.quadraticCurveTo(...P(.012, hasteVis * .55), ...P(0, hasteVis)); }, Math.max(2, .022 * RES), gH, corDados(.5, 0, ORGAO.COLMO));
    for (let k = 1; k <= Math.max(2, Math.round(hasteVis / .1)); k++) {
        const [x, y] = P(0, hasteVis * k / (Math.max(2, Math.round(hasteVis / .1)) + 1));
        T.c.beginPath(); T.c.ellipse(x, y, Math.max(1, .012 * RES), .65, 0, 0, Math.PI * 2); T.c.fillStyle = rgba(pal.contorno, .3); T.c.fill();
    }

    // Cotilédones carnosos e o primeiro par de folhas simples opostas.
    const yCot = Math.max(.032, hasteVis * .28), baseCot = P(0, yCot);
    if (F.cotiledone) {
        const palCot = {
            ...pal, folhaBase: esc(pal.cotiledone, .72), folhaMeio: pal.cotiledone,
            folhaClara: esc(pal.cotiledone, 1.06, 3), folhaLuz: esc(pal.cotiledone, 1.12, 8)
        };
        for (const lado of [-1, 1]) folhaOposta(T, baseCot, lado, .09 * RES, 1, mat, palCot, postura, true);
    }
    if (F.unifoliolada) {
        const baseUni = P(0, Math.max(.065, hasteVis * .62));
        for (const lado of [-1, 1]) folhaOposta(T, baseUni, lado, .125 * RES, .82, mat, pal, postura, false);
    }
    for (const fo of folhas) if (!fo.tras) desenharTrifolio(fo);

    // Flores axilares: pequenas, mas em grupos legíveis no zoom padrão.
    if (F.flores) {
        const n = Math.max(3, Math.round(nRamos * 1.4 * F.flores));
        for (let i = 0; i < n; i++) {
            const a = ramos[i % ramos.length], s = .64 + .22 * rngRepro();
            const [x, y] = P(a.x1 * s, a.y0 + (a.y1 - a.y0) * s);
            florSoja(T, x, y, .014 * RES * (.8 + .25 * rngRepro()), pal, espiga);
        }
    }

    // Vagens em grupos axilares; cheia/parcial/abortada alteram quantidade e volume.
    if (F.vagem) {
        const nivelF = [1, .64, .32][espiga], n = Math.max(2, Math.round(M.vagensMax * .46 * F.vagem * nivelF));
        for (let i = 0; i < n; i++) {
            const a = ramos[i % ramos.length], s = .48 + .48 * rngRepro();
            const [x, y] = P(a.x1 * s + a.lado * .012 * (i % 3), a.y0 + (a.y1 - a.y0) * s - .012 * (i % 2));
            const ang = (a.lado > 0 ? .75 : 2.4) + (rngRepro() - .5) * .38 + mat * .28;
            vagemSoja(T, x, y, ang, SP.tamFruto * RES * F.vagem * (.88 + .18 * rngRepro()), mat, pal, espiga, 2 + (i + variante) % 2, variante);
        }
    }

    return finalizarSprite(T, { ancora: [ax, ay], res: RES, maturacao: mat, alturaColmo: h, dicotiledonea: true });
}
