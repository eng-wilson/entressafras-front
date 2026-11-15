// Raízes desenhadas nas faces de corte do diorama (atlas em canvas: uma faixa de 1024 x 512 por parede,
// paredes 0 +X, 1 -X, 2 +Z, 3 -Z). As quatro paredes são pintadas para permitir girar a vista.
//
// Desenho mínimo e legível: só as plantas da linha de borda, poucos eixos grossos por planta, cada planta
// dentro da sua faixa (sem invadir a vizinha). O objetivo é ler o efeito do estresse, não a anatomia.
//   fasciculada (milho) -> poucas nodais em guarda-chuva estreito
//   pivotante (soja)    -> pivô grosso e poucas laterais curtas no alto
//
// Sinais de solo:
//   proporção         -> o alcance da raiz é a altura do sprite no dia × proporção raiz:parte aérea
//                        da cultura (domain/crops/proporcao-raiz.js); milho 1 : 1. A raiz cresce junto com a planta.
//   profundidade      -> pontas param na frente simulada (barreiras na profundidade real do solo);
//                        se a raiz está restrita, um traço tracejado
//                        marca até onde ela deveria ter chegado (alcance proporcional)
//   compactação       -> eixos entortam em "L" sobre a camada densa, ponta inchada
//   acidez / Al       -> eixos curtos, ponta marrom e grossa
//   encharcamento     -> trecho em camada com raiz morta fica marrom-escuro
//   leguminosas       -> nódulos rosados (fixando N) ou brancos (inativos)
import { mulberry32, clamp, lerp, smoothstep } from '../../utils/math.js';
import { P } from '../../domain/channels.js';
import { perfilCelula, CAMADA_M } from '../../simulation/season.js';
import { proporcaoRaiz } from '../../domain/crops/proporcao-raiz.js';

const LARG = 1024, ALT_PAREDE = 512;
const PASSO = 0.006;   // passo do traçado (m)

const COR = {
    base: [200, 176, 132], ponta: [244, 236, 214],
    morta: [84, 58, 38], acida: [146, 104, 62],
    nodAtivo: [210, 104, 116], nodInativo: [226, 220, 198]
};
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixCor = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function createRootAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = LARG;
    canvas.height = ALT_PAREDE * 4;
    return { canvas };
}

// Paredes visíveis onde a planta da linha de borda aparece.
function paredesDaPlanta(p, nLinhas, nCols) {
    const out = [];
    if (p.col === nCols - 1) out.push(0);
    if (p.col === 0) out.push(1);
    if (p.row === nLinhas - 1) out.push(2);
    if (p.row === 0) out.push(3);
    return out;
}

// Primeira linha com pixel opaco do sprite (topo da planta), guardada no próprio sprite.
// Lê a imagem de cor (o que aparece na tela): a máscara de dados da arte em PNG pode cobrir o quadro todo.
function topoOpaco(spr) {
    if (spr._topoOpaco !== undefined) return spr._topoOpaco;
    const L = spr.larg, A = spr.alt;
    let topo = spr.ancora[1];
    try {
        const c = document.createElement('canvas');
        c.width = L; c.height = A;
        const cx = c.getContext('2d');
        cx.drawImage(spr.cor, 0, 0);
        const px = cx.getImageData(0, 0, L, A).data;
        busca: for (let y = 0; y < A; y++) {
            for (let x = 0; x < L; x++) if (px[(y * L + x) * 4 + 3] > 60) { topo = y; break busca; }
        }
    } catch { /* imagem ainda não carregada: usa a âncora (altura 0) e tenta de novo depois */ return topo; }
    return (spr._topoOpaco = topo);
}

function primeiraProf(cam, teste) {
    for (let i = 0; i < cam.length; i++) if (teste(cam[i])) return i * CAMADA_M;
    return Infinity;
}

export function drawRoots(atlas, { plants, reg, crop, sim, dia, width, depth, totalH, profTotalM }) {
    const ctx = atlas.canvas.getContext('2d');
    ctx.clearRect(0, 0, LARG, ALT_PAREDE * 4);
    const nLinhas = Math.max(...plants.map(p => p.row)) + 1;
    const nCols = Math.max(...plants.map(p => p.col)) + 1;
    const pxV = ALT_PAREDE / profTotalM;                    // px por metro, vertical
    const pxH = LARG / (width * profTotalM / totalH);       // px por metro, horizontal (mesma escala métrica)
    const larguraM = LARG / pxH;                            // metros de solo ao longo da parede
    const M = crop.morfologia;
    // Alcance visual da raiz: altura do sprite no dia (mesma conta de render/field/lavoura.js) × proporção
    // raiz : parte aérea, convertida para metros de solo pela escala vertical do bloco.
    const uPorM = totalH / profTotalM;
    const proporcao = proporcaoRaiz(crop);
    const t = sim.termica?.progresso[dia] ?? dia / crop.cicloDias;
    const [h0, h1] = crop.janelas.altura;
    const emerg = smoothstep(crop.sprites.fases[0].t, crop.sprites.fases[0].t + 0.03, t);
    // Altura visível de verdade: do pé (âncora) até o primeiro pixel opaco do sprite desenhado, × escala do dia.
    // Sem sprite ainda (primeiro quadro), cai na estimativa pela altura simulada.
    const alturaSprite = (p, cresc) => {
        const v = p.vis;
        if (v && v.spr) return (v.spr.ancora[1] - topoOpaco(v.spr)) / v.spr.res * v.sy;
        return (p.plantHeightMax * smoothstep(h0, h1, t) * cresc * p.scaleJitter + 0.12) * lerp(0.35, 1, emerg);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    plants.forEach((p, pi) => {
        const paredes = paredesDaPlanta(p, nLinhas, nCols);
        if (!paredes.length) return;
        const o = pi * P.STRIDE;
        const frente = reg[o + P.RAIZ_M];
        if (frente <= 0.001) return;
        const cam = perfilCelula(sim, dia, reg[o + P.CELULA]);
        const pl = {
            frente, profVisivel: profTotalM,
            potencial: reg[o + P.RAIZ_POT_M],
            alvo: proporcao * alturaSprite(p, reg[o + P.CRESC]) / uPorM,
            cam,
            camada: z => cam[Math.max(0, Math.min(cam.length - 1, Math.floor(z / CAMADA_M)))],
            cresc: clamp(reg[o + P.CRESC]),
            barreira: reg[o + P.BARREIRA],
            zComp: Math.max(0.04, primeiraProf(cam, c => c.compactacao > 0.6)),   // camada densa já na superfície (rodado): dobra rente
            zAcid: primeiraProf(cam, c => c.acidez > 0.55),
            nodulosAtivos: reg[o + P.CRONICO + 4] < 0.4 && reg[o + P.AGUDO + 1] < 0.3
        };
        for (const w of paredes) {
            const n = w < 2 ? nLinhas : nCols;
            pl.meiaFaixa = 0.42 * larguraM / n;               // cada planta fica na sua faixa
            const s = w < 2 ? p.pz / depth + 0.5 : p.px / width + 0.5;
            const x0 = s * LARG, y0 = w * ALT_PAREDE;
            const T = { X: v => x0 + v * pxH, Y: v => y0 + v * pxV };
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, y0, LARG, ALT_PAREDE);
            ctx.clip();
            const rng = mulberry32(p.seed ^ (w * 0x9e3779b1));
            if (M.raiz === 'pivotante') pivotante(ctx, T, rng, pl, M);
            else fasciculada(ctx, T, rng, pl, M);
            marcaPotencial(ctx, T, pl);
            ctx.restore();
        }
    });
}

// ---------- traçado ----------

// Cresce um eixo a partir de (x, z) com ângulo `ang` (0 = para baixo, + = para +x).
// Fica dentro da faixa da planta; para na frente, no comprimento ou nas barreiras.
function tracar(rng, pl, { x, z, ang, comprMax, gravi, angAlvo = 0, limite, sinuoso = 1 }) {
    const pts = [[x, z]];
    let compr = 0, fim = 'normal', dobrado = false, horiz = 0;
    const lim = Math.min(limite ?? pl.frente, pl.frente);
    // Sinuosidade própria do eixo: curvas largas e irregulares (duas ondas), não só ruído por passo.
    const a1 = (0.04 + 0.08 * rng()) * sinuoso, f1 = 18 + 30 * rng(), p1 = rng() * 6.28;
    const a2 = (0.02 + 0.05 * rng()) * sinuoso, f2 = 60 + 60 * rng(), p2 = rng() * 6.28;
    for (let i = 0; i < 300 && compr < comprMax; i++) {
        ang += (rng() - 0.5) * 0.1 + a1 * Math.sin(compr * f1 + p1) + a2 * Math.sin(compr * f2 + p2);
        if (!dobrado) ang += (angAlvo - ang) * gravi;
        if (!dobrado && Math.abs(x) > pl.meiaFaixa * 0.55) ang *= 0.85;   // perto da borda da faixa, desce
        x += Math.sin(ang) * PASSO; z += Math.cos(ang) * PASSO; compr += PASSO;
        x = clamp(x, -pl.meiaFaixa, pl.meiaFaixa);
        pts.push([x, z]);
        if (pl.barreira === 1 && !dobrado && z >= pl.zComp - 0.004) {
            dobrado = true;
            ang = (x >= 0 ? 1 : -1) * 1.5;
            horiz = 0.025 + rng() * 0.03;
        }
        if (dobrado) {
            z = Math.min(z, pl.zComp - 0.002);
            pts[pts.length - 1][1] = z;
            horiz -= PASSO;
            if (horiz <= 0 || Math.abs(x) >= pl.meiaFaixa) { fim = 'inchada'; break; }
        }
        if (pl.barreira === 2 && z >= pl.zAcid + 0.01) { fim = 'acida'; break; }
        if (z >= lim) break;
    }
    return { pts, fim };
}

// Eixo afinando da base à ponta; trechos em camada com raiz morta ficam escuros.
function desenharEixo(ctx, T, pl, { pts, fim }, larg0, largFim) {
    const n = pts.length;
    if (n < 2) return;
    const CH = 5;
    for (let a = 0; a < n - 1; a += CH) {
        const b = Math.min(n - 1, a + CH);
        const t = (a + b) / 2 / (n - 1);
        const cam = pl.camada(pts[a][1]);
        const morta = cam.raizMorta > 0.12 && cam.raizMorta > cam.raiz;
        let cor = mixCor(COR.base, COR.ponta, t);
        if (fim === 'acida' && t > 0.5) cor = mixCor(cor, COR.acida, (t - 0.5) / 0.5);
        if (morta) cor = COR.morta;
        ctx.beginPath();
        ctx.moveTo(T.X(pts[a][0]), T.Y(pts[a][1]));
        for (let k = a + 1; k <= b; k++) ctx.lineTo(T.X(pts[k][0]), T.Y(pts[k][1]));
        ctx.lineWidth = lerp(larg0, largFim, t);
        ctx.strokeStyle = rgba(cor, 0.95);
        ctx.stroke();
    }
    if (fim === 'inchada' || fim === 'acida') {
        const [ex, ez] = pts[n - 1];
        ctx.beginPath();
        ctx.arc(T.X(ex), T.Y(ez), Math.max(2.5, larg0 * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = rgba(fim === 'acida' ? COR.acida : COR.base, 0.95);
        ctx.fill();
    }
}

// Poucas laterais curtas, espaçadas, só onde a camada tem raiz viva.
function laterais(ctx, T, rng, pl, eixo, { n, compr, larg, deZ = 0, ateZ = Infinity }) {
    const pts = eixo.pts;
    for (let j = 0; j < n; j++) {
        const i = Math.round((0.25 + 0.6 * (j + rng() * 0.5) / n) * (pts.length - 1));
        const [x, z] = pts[i];
        if (z < deZ || z > ateZ) continue;
        const cam = pl.camada(z);
        if (cam.raiz < 0.05) continue;
        const lado = j % 2 ? 1 : -1;
        const lat = tracar(rng, pl, {
            x, z, ang: lado * (1.1 + rng() * 0.3), comprMax: compr * (0.6 + 0.4 * rng()),
            gravi: 0.03, angAlvo: lado * 0.6, limite: pl.frente
        });
        desenharEixo(ctx, T, pl, { pts: lat.pts, fim: 'normal' }, larg, larg * 0.6);
    }
}

// Traço tracejado na profundidade potencial, quando a raiz está restrita: mostra o quanto ela perdeu.
function marcaPotencial(ctx, T, pl) {
    if (!pl.barreira || pl.alvo - pl.frente < 0.03) return;
    // Potencial abaixo da parte visível do perfil: nada a marcar. Com a fatia de 0,30 m isso acontece em
    // quase toda planta, e um tracejado por planta até a borda de baixo polui a face.
    if (pl.alvo > pl.profVisivel - 0.02) return;
    const y = T.Y(pl.alvo);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(T.X(0), T.Y(pl.frente) + 6);
    ctx.lineTo(T.X(0), y - 4);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(T.X(-pl.meiaFaixa * 0.5), y);
    ctx.lineTo(T.X(pl.meiaFaixa * 0.5), y);
    ctx.stroke();
    ctx.restore();
}

// ---------- arquiteturas ----------

function fasciculada(ctx, T, rng, pl, M) {
    // Quantidade varia por planta; só uma nodal (a pioneira) chega à frente, as outras ficam no alto,
    // onde está o grosso da raiz.
    const n = Math.max(2, Math.min(5, Math.round((2 + 3 * rng()) * (0.6 + 0.4 * pl.cresc))));
    const larg = 3 + 2 * pl.cresc;
    const pioneira = Math.floor(rng() * n);
    for (let r = 0; r < n; r++) {
        const lado = rng() < 0.5 ? -1 : 1;
        const abre = 0.15 + 1.05 * rng();
        const alcance = r === pioneira ? 0.85 + 0.15 * rng() : 0.35 + 0.3 * rng();
        const e = tracar(rng, pl, {
            x: (rng() - 0.5) * 0.016, z: 0.01 + 0.015 * rng(), ang: lado * abre,
            comprMax: pl.frente * 2, gravi: 0.015 + 0.04 * rng(), angAlvo: lado * 0.35 * rng(),
            limite: pl.alvo * alcance   // fração do alcance proporcional à planta; a frente real corta se estiver restrita
        });
        if (rng() < 0.7) laterais(ctx, T, rng, pl, e, { n: 1 + Math.floor(rng() * 2), compr: 0.025 + 0.03 * rng(), larg: 1.4 });
        desenharEixo(ctx, T, pl, e, larg * (0.7 + 0.5 * rng()), 1.2);
    }
    ctx.beginPath();
    ctx.ellipse(T.X(0), T.Y(0.015), 4 + 2 * pl.cresc, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COR.base, 0.95);
    ctx.fill();
}

function pivotante(ctx, T, rng, pl, M) {
    const larg = 6 + 4 * pl.cresc;
    // Pivô afina e some antes da frente na maioria das plantas: só as laterais do alto ficam evidentes.
    const pivo = tracar(rng, pl, { x: 0, z: 0.01, ang: (rng() - 0.5) * 0.3, comprMax: 2, gravi: 0.08, sinuoso: 0.35, limite: pl.alvo * (0.9 + 0.1 * rng()) });
    const n = 2 + Math.floor(rng() * 3);
    const eixos = [];
    for (let r = 0; r < n; r++) {
        const zl = 0.02 + Math.min(pl.frente * 0.4, 0.15) * rng();
        const i = Math.min(pivo.pts.length - 1, Math.round(zl / PASSO));
        const [x0, z0] = pivo.pts[i];
        const lado = rng() < 0.5 ? -1 : 1;
        eixos.push(tracar(rng, pl, {
            x: x0, z: z0, ang: lado * (0.9 + 0.6 * rng()), comprMax: (0.03 + 0.07 * rng()) * (0.5 + 0.5 * pl.cresc),
            gravi: 0.02 + 0.04 * rng(), angAlvo: lado * 0.5 * rng()
        }));
    }
    for (const e of eixos) desenharEixo(ctx, T, pl, e, larg * 0.35, 1.4);
    desenharEixo(ctx, T, pl, pivo, larg, 1.8);

    // Poucos nódulos grandes no alto do pivô e das laterais.
    if (M.fixaN) {
        const cor = pl.nodulosAtivos ? COR.nodAtivo : COR.nodInativo;
        for (const e of [pivo, ...eixos]) {
            const cand = e.pts.filter(([, z]) => z > 0.02 && z < 0.15);
            for (let k = 0; k < 2 && cand.length; k++) {
                const [x, z] = cand[Math.floor(rng() * cand.length)];
                ctx.beginPath();
                ctx.arc(T.X(x) + (rng() < 0.5 ? -3 : 3), T.Y(z), 3.2, 0, Math.PI * 2);
                ctx.fillStyle = rgba(cor, 0.95);
                ctx.fill();
                ctx.lineWidth = 0.8;
                ctx.strokeStyle = rgba(mixCor(cor, [70, 40, 40], 0.45), 0.9);
                ctx.stroke();
            }
        }
    }
}
