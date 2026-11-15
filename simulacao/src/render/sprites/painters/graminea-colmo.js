// Pintor procedural do arquétipo A (gramínea de colmo): milho. Sorgo e milheto usam o mesmo pintor
// com outros dados (folhas, paleta, inflorescência).
// Gera o sprite de uma fase notável (crop.sprites.fases) numa postura e variante, com a máscara de dados.
// Coordenadas internas em unidades do diorama, y para cima; P() converte para pixels do sprite.
import { clamp, smoothstep, mix, lerp, mulberry32 } from '../../../utils/math.js';
import { ORGAO, corDados, criarTelas, preencher, tracar, finalizarSprite } from '../mask.js';

export const PALETA_PADRAO = {
    folhaBase: [44, 96, 36], folhaMeio: [92, 156, 46], folhaClara: [165, 198, 52], folhaPonta: [204, 208, 68],
    folhaSeca: [192, 160, 72], folhaPalha: [216, 194, 130],
    colmoEsc: [60, 104, 38], colmoClaro: [168, 178, 48], colmoSeco: [198, 168, 98],
    pendaoJovem: [204, 198, 96], pendao: [226, 172, 38], pendaoSeco: [178, 140, 76],
    palhaVerde: [102, 150, 56], palhaSeca: [228, 208, 148],
    graoLeitoso: [244, 228, 156], grao: [248, 165, 20], graoMaduro: [238, 140, 32],
    sabugo: [226, 206, 162],
    estigmaNovo: [248, 190, 80], estigmaSeco: [210, 125, 30],
    contorno: [36, 58, 16]
};

const rgb = c => `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`;
const rgba = (c, a) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;
const esc = (c, k, add = 0) => [c[0] * k + add, c[1] * k + add, c[2] * k + add];

function bez(P, t) {
    const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
}
function dbez(P, t) {
    const m = 1 - t, a = 3 * m * m, b = 6 * m * t, c = 3 * t * t;
    return [
        a * (P[1][0] - P[0][0]) + b * (P[2][0] - P[1][0]) + c * (P[3][0] - P[2][0]),
        a * (P[1][1] - P[0][1]) + b * (P[2][1] - P[1][1]) + c * (P[3][1] - P[2][1])
    ];
}

// Largura relativa da folha em fita ao longo do comprimento: bainha estreita, máximo no terço, ponta fina.
const perfilFita = u => Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.93 + 0.07)), 0.62) * (1 - 0.32 * u);

// Folha em fita: tira de quadriláteros em duas metades (face de cima clara, face de baixo escura).
// Na máscara, cada quadrilátero recebe gradiente da nervura (v = 0) até a margem (v = 1).
function folhaFita(T, P, largPx, idade, corDe, pal) {
    const N = 30, C = [], Nn = [], W = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N, c = bez(P, t), d = dbez(P, t), l = Math.hypot(d[0], d[1]) || 1;
        C.push(c); Nn.push([-d[1] / l, d[0] / l]); W.push(Math.max(0.6, largPx / 2 * perfilFita(t)));
    }
    const sup = Nn[N >> 1][1] < 0 ? 1 : -1;   // metade cuja normal aponta para cima na tela = face superior
    for (const lado of [-sup, sup]) {
        for (let i = 0; i < N; i++) {
            const u = (i + 0.5) / N;
            const a0 = C[i], a1 = C[i + 1];
            const e0 = [a0[0] + Nn[i][0] * W[i] * lado, a0[1] + Nn[i][1] * W[i] * lado];
            const e1 = [a1[0] + Nn[i + 1][0] * W[i + 1] * lado, a1[1] + Nn[i + 1][1] * W[i + 1] * lado];
            const caminho = ctx => { ctx.moveTo(a0[0], a0[1]); ctx.lineTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(a1[0], a1[1]); ctx.closePath(); };
            const cor = rgb(corDe(u, lado === sup));
            const g = T.d.createLinearGradient((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, (e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2);
            g.addColorStop(0, corDados(u, 0, ORGAO.FOLHA, idade));
            g.addColorStop(1, corDados(u, 1, ORGAO.FOLHA, idade));
            T.c.beginPath(); caminho(T.c); T.c.fillStyle = cor; T.c.fill();
            T.c.lineWidth = 0.7; T.c.strokeStyle = cor; T.c.stroke();
            T.d.beginPath(); caminho(T.d); T.d.fillStyle = g; T.d.fill();
            T.d.lineWidth = 0.7; T.d.strokeStyle = g; T.d.stroke();
        }
    }
    // Acabamento pintado (só na cor): contorno escuro, nervura clara, brilho na face de cima.
    const c = T.c;
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= N; i++) c.lineTo(C[i][0] + Nn[i][0] * W[i], C[i][1] + Nn[i][1] * W[i]);
    for (let i = N; i >= 0; i--) c.lineTo(C[i][0] - Nn[i][0] * W[i], C[i][1] - Nn[i][1] * W[i]);
    c.closePath();
    c.strokeStyle = rgba(pal.contorno, 0.55);
    c.lineWidth = Math.max(0.8, largPx * 0.07);
    c.stroke();
    c.beginPath();
    for (let i = 1; i <= N - 3; i++) c.lineTo(C[i][0], C[i][1]);
    c.strokeStyle = 'rgba(232, 242, 176, 0.5)';
    c.lineWidth = Math.max(0.6, largPx * 0.07);
    c.stroke();
    c.beginPath();
    for (let i = 3; i <= N - 6; i++) c.lineTo(C[i][0] + Nn[i][0] * W[i] * sup * 0.55, C[i][1] + Nn[i][1] * W[i] * sup * 0.55);
    c.strokeStyle = 'rgba(255, 255, 214, 0.26)';
    c.lineWidth = Math.max(0.8, largPx * 0.12);
    c.stroke();
}

// Espigueta: grão pequeno elíptico com brilho (pendão, panícula).
function espigueta(T, x, y, ang, rx, ry, cor, u, orgao) {
    const caminho = ctx => ctx.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2);
    preencher(T, caminho, rgb(cor), corDados(u, 0, orgao));
    T.c.beginPath();
    T.c.ellipse(x - rx * 0.25, y - ry * 0.35, rx * 0.5, ry * 0.45, ang, 0, Math.PI * 2);
    T.c.fillStyle = rgba(esc(cor, 1.12, 22), 0.75);
    T.c.fill();
}

// fase: índice em crop.sprites.fases. postura: 0 normal, 1 enrolada, 2 murcha.
// espiga: 0 cheia, 1 parcial, 2 abortada. variante: 0..2.
export function pintarGramineaColmo(crop, faseIdx, { postura = 0, espiga = 0, variante = 0 } = {}) {
    const SP = crop.sprites, F = SP.fases[faseIdx], RES = SP.resolucao;
    const pal = { ...PALETA_PADRAO, ...(SP.paleta || {}) };
    const M = crop.morfologia, J = crop.janelas;
    const hMed = (M.alturaMax[0] + M.alturaMax[1]) / 2;
    const h = Math.max(0.02, hMed * smoothstep(J.altura[0], J.altura[1], F.t));
    const n = F.folhas, nFinal = SP.folhasFinal;
    const comprMax = SP.comprFolha;
    const mat = F.maturacao ?? 0;
    const rng = mulberry32(9001 + variante * 7919);

    // Sorteio por variante (o mesmo para todas as fases: a folha i mantém a direção ao crescer).
    const fp = Array.from({ length: 20 }, (_, i) => ({
        az: (i % 2 ? Math.PI : 0) + (rng() - 0.5) * 0.9,
        el: (rng() - 0.5) * 0.22,
        comp: 0.9 + rng() * 0.2,
        droop: (rng() - 0.5) * 0.12
    }));
    const ladoEspiga = rng() < 0.5 ? -1 : 1;
    const segunda = rng() < M.probSegundaEspiga;
    const hEsp = 0.42 + rng() * 0.08;
    const rngP = mulberry32(4242 + variante * 131);

    const roll = postura === 1 ? 1 : postura === 2 ? 0.8 : 0;
    const murcha = postura === 2 ? 1 : 0;

    // Geometria de cada folha.
    const folhas = [];
    let alcance = 0.1, topoFolhas = 0;
    for (let i = 0; i < n; i++) {
        const f = fp[i];
        const rel = n > 1 ? i / (n - 1) : 1;
        const idade = n > 1 ? 1 - rel : 0;
        const expande = n < nFinal ? (i === n - 1 ? 0.55 : i === n - 2 ? 0.85 : 1) : 1;
        const L = comprMax * f.comp * (0.18 + 0.82 * Math.pow(Math.sin(Math.PI * (i + 1) / (nFinal + 1)), 1.2)) * expande;
        const yA = h * (0.03 + 0.85 * Math.pow(rel, 1.1));
        const e = lerp(0.62, 1.22, rel) + f.el + (n <= 4 ? 0.25 : 0) + roll * 0.28 - murcha * 0.15;
        const lado = Math.cos(f.az) >= 0 ? 1 : -1;
        const fr = 0.42 + 0.58 * Math.abs(Math.cos(f.az));
        let droop = 0.12 + 0.32 * (1 - rel) + f.droop + murcha * 0.38 - roll * 0.12;
        if (n <= 4) droop *= 0.5;
        const ce = Math.cos(e), se = Math.sin(e);
        const pts = [
            [0, 0],
            [lado * fr * ce * 0.22, se * 0.3 + 0.1],   // começo quase vertical: bainha junto ao colmo
            [lado * fr * (0.75 * ce + 0.3) * 0.74, 0.72 * se * 0.74],
            [lado * fr * (0.55 * ce + 0.5), 0.52 * se - droop]
        ].map(([x, y]) => [x * L, yA + y * L]);
        folhas.push({ i, idade, L, pts, tras: Math.sin(f.az) < 0, larg: L * 0.13 * (postura === 1 ? 0.62 : postura === 2 ? 0.5 : 1) });
        for (const [x, y] of pts) { alcance = Math.max(alcance, Math.abs(x) + 0.04); topoFolhas = Math.max(topoFolhas, y); }
    }
    const tassel = F.pendao ? 0.26 * F.pendao : 0;
    const topo = Math.max(h + tassel, topoFolhas, 0.05) + 0.05;
    alcance = Math.max(alcance, F.espiga ? 0.2 : 0, F.pendao ? 0.22 : 0);
    const larg = Math.ceil(alcance * 2 * RES), alt = Math.ceil((topo + 0.05) * RES);
    const T = criarTelas(larg, alt);
    const ax = larg / 2, ay = alt - 0.035 * RES;
    const P = (x, y) => [ax + x * RES, ay - y * RES];

    const sw0 = 0.02 * clamp(h / 0.5, 0.35, 1), sw1 = sw0 * 0.62;
    const corFolha = (idade) => (u, sup) => {
        let c = u < 0.3 ? mix(pal.folhaBase, pal.folhaMeio, u / 0.3)
            : u < 0.78 ? mix(pal.folhaMeio, pal.folhaClara, (u - 0.3) / 0.48)
                : mix(pal.folhaClara, pal.folhaPonta, (u - 0.78) / 0.22);
        c = mix(c, esc(c, 0.82), idade * 0.25);
        const seca = clamp(mat * 1.35 - (1 - idade) * 0.55 + (u - 0.5) * 0.25 * mat);
        if (seca > 0) c = mix(c, mix(pal.folhaSeca, pal.folhaPalha, u), seca);
        return sup ? [c[0] * 1.03 + 4, c[1] * 1.03 + 4, c[2]] : [c[0] * 0.72, c[1] * 0.76, c[2] * 0.8 + 6];
    };
    const pintarFolha = fo => {
        const base = [fo.pts[0][0] + (fo.pts[3][0] >= 0 ? 1 : -1) * sw0 * 0.6, 0];
        const pts = fo.pts.map(([x, y]) => P(x + base[0], y));
        folhaFita(T, pts, Math.max(2, fo.larg * RES), fo.idade, corFolha(fo.idade), pal);
    };

    // ---------- desenho ----------
    for (const fo of folhas) if (fo.tras) pintarFolha(fo);

    // Colmo com sombreamento cilíndrico e nós.
    const hColmo = h + (F.pendao ? 0.025 : 0);
    const corColmo = [mix(pal.colmoEsc, pal.colmoSeco, mat * 0.8), mix(pal.colmoClaro, pal.colmoSeco, mat)];
    const caminhoColmo = ctx => {
        const [x0, y0] = P(-sw0, 0), [x1, y1] = P(-sw1, hColmo), [x2, y2] = P(sw1, hColmo), [x3, y3] = P(sw0, 0);
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2, y1 - sw1 * RES * 0.6, x2, y2);
        ctx.lineTo(x3, y3); ctx.closePath();
    };
    const gC = T.c.createLinearGradient(ax - sw0 * RES, 0, ax + sw0 * RES, 0);
    gC.addColorStop(0, rgb(esc(corColmo[0], 0.8)));
    gC.addColorStop(0.45, rgb(corColmo[1]));
    gC.addColorStop(1, rgb(corColmo[0]));
    preencher(T, caminhoColmo, gC, corDados(0.5, 0, ORGAO.COLMO));
    T.c.strokeStyle = rgba(pal.contorno, 0.45); T.c.lineWidth = 0.8;
    T.c.beginPath(); caminhoColmo(T.c); T.c.stroke();
    for (const fo of folhas) {
        const y = fo.pts[0][1], r = sw0 + (sw1 - sw0) * clamp(y / hColmo);
        const [x, yy] = P(0, y);
        T.c.beginPath(); T.c.ellipse(x, yy, r * RES * 1.05, Math.max(0.6, 0.004 * RES), 0, 0, Math.PI * 2);
        T.c.fillStyle = rgba(esc(corColmo[0], 0.8), 0.45); T.c.fill();
    }
    // Raízes de escora no colo da planta adulta.
    if (h > hMed * 0.6) {
        for (const s of [-1, -0.4, 0.4, 1]) {
            tracar(T, ctx => {
                const [x0, y0] = P(s * sw0 * 0.7, 0.05), [x1, y1] = P(s * (sw0 + 0.035), -0.01);
                ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y0, x1, y1);
            }, Math.max(1, 0.008 * RES), rgb(esc(corColmo[0], 0.9, 10)), corDados(0.1, 0, ORGAO.COLMO));
        }
    }

    for (const fo of folhas) if (!fo.tras) pintarFolha(fo);

    // Pendão: eixo central + ramos arqueados com espiguetas.
    if (F.pendao) {
        const cor = mat < 0.3 ? mix(pal.pendaoJovem, pal.pendao, mat / 0.3) : mix(pal.pendao, pal.pendaoSeco, (mat - 0.3) / 0.7);
        const comp = tassel;
        const rx = 0.0085 * RES, ry = 0.005 * RES;
        // Sorgo e milheto reutilizam o corpo do arquétipo A, mas têm
        // inflorescências de massa diferente do pendão ramificado do milho.
        if (SP.inflorescencia === 'panicula_compacta' || SP.inflorescencia === 'vela') {
            const vela = SP.inflorescencia === 'vela';
            const nGraos = vela ? 72 : 54;
            for (let k = 0; k < nGraos; k++) {
                const u = k / Math.max(1, nGraos - 1), faixa = k % (vela ? 8 : 7);
                const y = h + 0.025 + comp * (0.08 + 0.86 * u);
                const envelope = vela ? 0.043 : 0.09 * Math.pow(Math.sin(Math.PI * u), 0.65);
                const x = (faixa / (vela ? 7 : 6) - 0.5) * envelope * 2 + (rngP() - 0.5) * 0.009;
                const [px, py] = P(x, y);
                espigueta(T, px, py, (rngP() - .5) * .45, rx * (vela ? .82 : 1.15), ry * (vela ? 1.1 : 1.35), cor, u, ORGAO.PENDAO);
            }
        }
        const curva = (pts, nEsp, u0) => {
            tracar(T, ctx => { ctx.moveTo(...pts[0]); ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); },
                Math.max(0.8, 0.004 * RES), rgb(esc(cor, 0.75)), corDados(u0, 0, ORGAO.PENDAO));
            for (let k = 1; k <= nEsp; k++) {
                const t = 0.12 + 0.88 * k / nEsp;
                const [x, y] = bez(pts, t), d = dbez(pts, t);
                const ang = Math.atan2(d[1], d[0]);
                const off = (k % 2 ? 1 : -1) * ry * 0.9;
                espigueta(T, x - Math.sin(ang) * off, y + Math.cos(ang) * off, ang, rx, ry, mix(cor, esc(cor, 0.85), rngP() * 0.6), t, ORGAO.PENDAO);
            }
        };
        const nr = SP.inflorescencia ? 0 : M.ramosPendao;
        for (let k = 0; k < nr; k++) {
            const lado = k % 2 ? 1 : -1;
            const yb = h + 0.035 + (k / nr) * comp * 0.38;
            const len = comp * (0.55 + 0.3 * rngP()) * (1 - k / nr * 0.35);
            const pts = [P(0, yb), P(lado * len * 0.35, yb + len * 0.5), P(lado * len * 0.8, yb + len * 0.35), P(lado * len * 0.98, yb - len * 0.08)];
            curva(pts, Math.max(4, Math.round(len * RES / (rx * 1.6))), 0.5);
        }
        const pts = [P(0, h + 0.02), P(0.004, h + comp * 0.4), P(-0.004, h + comp * 0.75), P(0.01, h + comp)];
        curva(pts, Math.max(6, Math.round(comp * RES / (rx * 1.3))), 1);
    }

    // Espiga(s) na axila, com palha, grãos e estigmas.
    const desenharEspiga = (lado, yRel, tam, nivel, mostrarGraos) => {
        const fator = [1, 0.8, 0.42][nivel] * F.espiga * tam;
        const Le = 0.27 * fator, We = 0.088 * (0.55 + 0.45 * F.espiga) * (nivel === 2 ? 0.7 : 1) * tam;
        const ang = lerp(0.42, 1.8, smoothstep(0.78, 1, mat));
        const a = [lado * Math.sin(ang), Math.cos(ang)], pp = [-a[1], a[0]];
        const B = [lado * sw0 * 0.9 + a[0] * 0.02, h * yRel + a[1] * 0.02];
        const ponto = (s, w) => P(B[0] + a[0] * s * Le + pp[0] * w, B[1] + a[1] * s * Le + pp[1] * w);
        const corPalha = mix(pal.palhaVerde, pal.palhaSeca, smoothstep(0.35, 0.95, mat));
        const aberta = F.palhaAberta && nivel < 2;
        const meia = s => We / 2 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * Math.min(1, s / 1.12))), 0.55) * (1 - 0.35 * s * s * s);
        // Pedúnculo curto.
        tracar(T, ctx => { const [x0, y0] = P(lado * sw0 * 0.6, h * yRel - 0.01); const [x1, y1] = ponto(0, 0); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); },
            Math.max(1, 0.012 * RES * tam), rgb(corPalha), corDados(0, 0, ORGAO.PALHA));
        // Palha: envolve a espiga; aberta na maturação (só a metade de trás).
        const caminhoPalha = (lados) => ctx => {
            const NS = 20;
            const [x0, y0] = ponto(0, 0); ctx.moveTo(x0, y0);
            for (let i = 0; i <= NS; i++) { const s = 1.12 * i / NS; const [x, y] = ponto(s, meia(s) * lados[0]); ctx.lineTo(x, y); }
            for (let i = NS; i >= 0; i--) { const s = 1.12 * i / NS; const [x, y] = ponto(s, meia(s) * lados[1]); ctx.lineTo(x, y); }
            ctx.closePath();
        };
        const [gx0, gy0] = ponto(0.5, -We / 2), [gx1, gy1] = ponto(0.5, We / 2);
        const gP = T.c.createLinearGradient(gx0, gy0, gx1, gy1);
        gP.addColorStop(0, rgb(esc(corPalha, 0.78))); gP.addColorStop(0.5, rgb(esc(corPalha, 1.08, 6))); gP.addColorStop(1, rgb(esc(corPalha, 0.85)));
        preencher(T, caminhoPalha(aberta ? [1.25, 0.2] : [1, -1]), gP, corDados(0.5, 0.5, ORGAO.PALHA));
        T.c.strokeStyle = rgba(pal.contorno, 0.4); T.c.lineWidth = 0.8;
        T.c.beginPath(); caminhoPalha(aberta ? [1.25, 0.2] : [1, -1])(T.c); T.c.stroke();

        // Grãos: janela na palha (R3+) ou espiga exposta (palha aberta).
        const exp = aberta ? 1 : mostrarGraos ? 0.45 : 0;
        if (exp > 0 && nivel < 2) {
            const corG = mat < 0.35 ? mix(pal.graoLeitoso, pal.grao, mat / 0.35) : mix(pal.grao, pal.graoMaduro, (mat - 0.35) / 0.65);
            const sMax = nivel === 1 ? 0.62 : 0.92;
            const passo = 0.016 / Math.max(Le, 0.01);
            const rk = 0.0068 * RES * tam;
            for (let s = 0.08; s <= sMax; s += passo) {
                const wMax = meia(s) * 0.82 * exp;
                for (let k = -3; k <= 3; k++) {
                    const w = (k + (Math.round(s / passo) % 2 ? 0.5 : 0)) * 0.0135 * tam;
                    if (Math.abs(w) > wMax) continue;
                    const [x, y] = ponto(s, w + (aberta ? We * 0.12 : 0));
                    const sombra = 1 - Math.abs(w) / (We / 2) * 0.35;
                    preencher(T, ctx => ctx.ellipse(x, y, rk, rk * 0.88, 0, 0, Math.PI * 2), rgb(esc(corG, sombra)), corDados(s, Math.abs(w) / (We / 2), ORGAO.GRAO));
                    T.c.beginPath(); T.c.arc(x - rk * 0.3, y - rk * 0.3, rk * 0.38, 0, Math.PI * 2);
                    T.c.fillStyle = 'rgba(255, 246, 200, 0.6)'; T.c.fill();
                }
            }
            if (nivel === 1) {
                const [x0, y0] = ponto(sMax, 0), [x1, y1] = ponto(0.98, 0);
                tracar(T, ctx => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }, Math.max(1.2, We * 0.35 * RES * exp), rgb(pal.sabugo), corDados(0.9, 0, ORGAO.GRAO));
            }
        }
        // Estigmas ("cabelo") saindo da ponta.
        const corE = mix(pal.estigmaNovo, pal.estigmaSeco, nivel === 2 ? 1 : (F.estigma ?? 0));
        const [tx, ty] = ponto(1.1, 0);
        const nE = 8;
        for (let k = 0; k < nE; k++) {
            const ab = (k / (nE - 1) - 0.5) * 1.3;
            const comp = (0.05 + rngP() * 0.03) * (nivel === 2 ? 1.4 : 1) * tam * RES;
            const dirx = a[0] * Math.cos(ab) - a[1] * Math.sin(ab) * lado, diry = a[1] * Math.cos(ab) + a[0] * Math.sin(ab) * lado;
            tracar(T, ctx => {
                ctx.moveTo(tx, ty);
                ctx.quadraticCurveTo(tx + dirx * comp * 0.6, ty - diry * comp * 0.6, tx + dirx * comp * 0.9 + lado * comp * 0.2, ty - diry * comp * 0.5 + comp * 0.35);
            }, Math.max(0.7, 0.0035 * RES), rgba(corE, 0.9), corDados(k / nE, 0, ORGAO.ESTIGMA));
        }
    };
    if (F.espiga) {
        const visGraos = (F.espiga >= 0.8);
        if (segunda && espiga === 0) desenharEspiga(-ladoEspiga, hEsp - 0.1, 0.72, 0, false);
        desenharEspiga(ladoEspiga, hEsp, 1, espiga, visGraos);
    }

    return finalizarSprite(T, { ancora: [ax, ay], res: RES, maturacao: mat, alturaColmo: h });
}
