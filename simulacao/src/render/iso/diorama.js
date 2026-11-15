// Diorama isométrico 2D: sombra do bloco, faces de corte (+X e +Z), topo e lavoura.
// Topo e faces são canvases repintados por dia; aqui só são projetados com transformações afins.
import { createSurface2D } from '../soil/surface2d.js';
import { createProfile2D } from '../soil/profile2d.js';
import { createRootAtlas, drawRoots } from '../soil/roots.js';
import { celulaDe } from '../../simulation/season.js';
import { createCamera } from './camera.js';

export function createDiorama({ width, depth, totalH, profTotalM, crop, resolucao = 1024 }) {
    const topo = createSurface2D({ width, depth, res: resolucao, crop });
    const perfil = createProfile2D({ width, depth, totalH, profTotalM, res: resolucao });
    const raizes = createRootAtlas();
    let celulaDestaque = -1;
    const vista = createCamera();
    const espelhadas = new Map();
    function faceVista(parede, inverter) {
        const face = perfil.faces.find(f => f.parede === parede);
        if (!inverter) return face;
        if (espelhadas.has(parede)) return { canvas: espelhadas.get(parede) };
        espelhadas.set(parede, document.createElement('canvas'));
        const canvas = espelhadas.get(parede);
        canvas.width = perfil.FW; canvas.height = perfil.FH;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(face.canvas, 0, 0);
        return { canvas };
    }

    function atualizar({ sim, dia, classe, modo, lavoura, reg }) {
        espelhadas.clear();
        drawRoots(raizes, { plants: lavoura.plants, reg, crop, sim, dia, width, depth, totalH, profTotalM });
        topo.pintar(sim, dia, classe, modo);
        perfil.pintar(sim, dia, classe, modo, raizes.canvas, topo.canvas);   // topo antes: a face lê a cor da beira
    }

    function desenharFundo(ctx, cam, larg, alt) {
        const d = cam.dpr;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, alt);
        g.addColorStop(0, '#f4f7f9');
        g.addColorStop(1, '#dde5ea');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, larg, alt);
        // Sombra difusa do bloco no chão (luz vinda da direita).
        const [cx, cy] = cam.proj(-0.35, -totalH, 0.35);
        const S = cam.escala;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.5);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, (width + depth) * 0.62 * S);
        rg.addColorStop(0, 'rgba(40, 46, 52, 0.32)');
        rg.addColorStop(0.6, 'rgba(40, 46, 52, 0.14)');
        rg.addColorStop(1, 'rgba(40, 46, 52, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, (width + depth) * 0.62 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Contorno do bloco na tela: hexágono com os 6 cantos da silhueta (fundo do topo, laterais em cima
    // e embaixo, quina de baixo da frente) arredondados. Serve de recorte e de sombra de borda.
    function contornoArredondado(ctx, cam, width, depth) {
        const W = width / 2, D = depth / 2, H = -totalH;
        const pts = [[-W, 0, -D], [W, 0, -D], [W, H, -D], [W, H, D], [-W, H, D], [-W, 0, D]].map(q => cam.proj(...q));
        const raio = RAIO_ARESTA * cam.escala * 1.3;
        ctx.beginPath();
        const n = pts.length;
        const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        ctx.moveTo(...meio(pts[n - 1], pts[0]));
        for (let i = 0; i < n; i++) ctx.arcTo(...pts[i], ...pts[(i + 1) % n], raio);
        ctx.closePath();
        return raio;
    }

    function desenharBloco(ctx, original) {
        const q = original.quarto ?? 0;
        const W = q % 2 ? depth : width, D = q % 2 ? width : depth;
        Object.assign(vista, { escala: original.escala, ox: original.ox, oy: original.oy, dpr: original.dpr });
        const cam = vista;
        // Faces em coordenadas da vista: direita e esquerda; atlas permanece no mundo.
        const escolhas = [[[0, false], [2, false]], [[3, false], [0, true]],
            [[1, true], [3, true]], [[2, true], [1, false]]][q];
        const faces = escolhas.map(([parede, inverter]) => faceVista(parede, inverter));
        const FW = perfil.FW, FH = perfil.FH, TR = topo.res;
        const ex = cam.eixoX(), ez = cam.eixoZ();
        const colB = [0, cam.escala * totalH / FH];
        ctx.save();
        ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
        contornoArredondado(ctx, cam, W, D);
        ctx.clip();
        // Face +X (frente direita): ao longo de z.
        cam.aplicarPlano(ctx, [W / 2, 0, -D / 2], [ez[0] * D / FW, ez[1] * D / FW], colB);
        ctx.drawImage(faces[0].canvas, 0, 0);
        ctx.fillStyle = 'rgba(255, 244, 228, 0.05)';
        ctx.fillRect(0, 0, FW, FH);
        // Face +Z (frente esquerda): ao longo de x, mais escura.
        cam.aplicarPlano(ctx, [-W / 2, 0, D / 2], [ex[0] * W / FW, ex[1] * W / FW], colB);
        ctx.drawImage(faces[1].canvas, 0, 0);
        ctx.fillStyle = 'rgba(28, 16, 6, 0.22)';
        ctx.fillRect(0, 0, FW, FH);
        // Topo.
        const ax = original.eixoX(), az = original.eixoZ();
        original.aplicarPlano(ctx, [-width / 2, 0, -depth / 2], [ax[0] * width / TR, ax[1] * width / TR], [az[0] * depth / TR, az[1] * depth / TR]);
        ctx.drawImage(topo.canvas, 0, 0);

        // Arestas arredondadas: sem traço de contorno; a curva liga topo, faces e quina.
        desenharArredondado(ctx, cam, faces, W, D);
        const d = cam.dpr;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        // Bordas da silhueta: sombra suave por dentro do recorte (a superfície "vira" para longe da vista).
        const raio = contornoArredondado(ctx, cam, W, D);
        ctx.lineWidth = raio * 1.1;
        ctx.strokeStyle = 'rgba(30, 18, 8, 0.16)';
        ctx.stroke();
        ctx.lineWidth = raio * 0.45;
        ctx.strokeStyle = 'rgba(30, 18, 8, 0.14)';
        ctx.stroke();
        ctx.restore();
        ctx.setTransform(d, 0, 0, d, 0, 0);
        const p = (x, y, z) => original.proj(x, y, z);

        if (celulaDestaque >= 0) {
            const G = 32, i = celulaDestaque % G, j = (celulaDestaque / G) | 0;
            const x0 = -width / 2 + i * width / G, z0 = -depth / 2 + j * depth / G;
            ctx.strokeStyle = 'rgba(255, 240, 120, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(...p(x0, 0, z0)); ctx.lineTo(...p(x0 + width / G, 0, z0));
            ctx.lineTo(...p(x0 + width / G, 0, z0 + depth / G)); ctx.lineTo(...p(x0, 0, z0 + depth / G));
            ctx.closePath();
            ctx.stroke();
        }
    }

    // Arredondamento das arestas visíveis (beira do topo nas duas faces e quina vertical da frente).
    // Cada aresta vira um quarto de cilindro de raio RAIO_ARESTA, desenhado em N faixas finas: a faixa
    // recebe uma fatia da textura da face (que no alto já tem a cor do topo) e uma luz que gira do topo
    // para a face, com um brilho suave no meio da curva. Como as duas superfícies da aresta estão
    // visíveis, a curva cai dentro da área que a quina viva ocupava: não é preciso recortar o bloco.
    const RAIO_ARESTA = 0.07, N_FAIXAS = 18;
    // Luz por face (mesmas sobreposições de desenharBloco): +X levemente clara, +Z escurecida.
    const LUZ = {
        x: { cor: [255, 244, 228], alfa: 0.05, brilho: 0.08 },
        z: { cor: [28, 16, 6], alfa: 0.22, brilho: 0.04 }
    };
    const mixLuz = (a, b, t) => {
        const c = [0, 1, 2].map(i => a.cor[i] + (b.cor[i] - a.cor[i]) * t);
        return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.alfa + (b.alfa - a.alfa) * t})`;
    };
    const SEM_LUZ = { cor: [255, 255, 255], alfa: 0 };

    function desenharArredondado(ctx, cam, faces, width, depth) {
        const FW = perfil.FW, FH = perfil.FH, r = RAIO_ARESTA;
        const rowsR = r / totalH * FH;                     // linhas da face cobertas pelo raio
        const colsR = r / width * FW;                      // colunas da face cobertas pelo raio
        const sub = (a, b) => [b[0] - a[0], b[1] - a[1]];
        const P = (x, y, z) => cam.proj(x, y, z);
        const d = cam.dpr;
        const brilho = (luz, th) => `rgba(255, 246, 230, ${luz.brilho * Math.sin(2 * th)})`;

        // Quina vertical da frente (x = W/2, z = D/2): de +Z (θ = 0) para +X (θ = 90°).
        const colB = [0, cam.escala * totalH / FH];
        for (let i = 0; i < N_FAIXAS; i++) {
            const ta = i / N_FAIXAS * Math.PI / 2, tb = (i + 1) / N_FAIXAS * Math.PI / 2, tm = (ta + tb) / 2;
            const ponto = th => [width / 2 - r + r * Math.sin(th), depth / 2 - r + r * Math.cos(th)];
            const [xa, za] = ponto(ta), [xb, zb] = ponto(tb);
            const metade = i < N_FAIXAS / 2;
            // Primeira metade lê o fim da face +Z; segunda, o fim da face +X (colunas de trás para a frente).
            const src = metade ? faces[1].canvas : faces[0].canvas;
            const u0 = metade ? i / (N_FAIXAS / 2) : (N_FAIXAS - i - 1) / (N_FAIXAS / 2);
            const u1 = metade ? (i + 1) / (N_FAIXAS / 2) : (N_FAIXAS - i) / (N_FAIXAS / 2);
            const c0 = FW - colsR + colsR * Math.min(u0, u1), w = Math.max(0.5, colsR * Math.abs(u1 - u0));
            const [o0, o1] = metade ? [[xa, za], [xb, zb]] : [[xb, zb], [xa, za]];
            const v = sub(P(o0[0], 0, o0[1]), P(o1[0], 0, o1[1]));
            cam.aplicarPlano(ctx, [o0[0], 0, o0[1]], [v[0] / w, v[1] / w], colB);
            ctx.drawImage(src, c0, 0, w, FH, 0, 0, w * 1.08, FH);
            ctx.fillStyle = mixLuz(LUZ.z, LUZ.x, Math.sin(tm) ** 2);
            ctx.fillRect(0, 0, w * 1.08, FH);
            ctx.fillStyle = brilho(LUZ.x, tm);
            ctx.fillRect(0, 0, w * 1.08, FH);
        }

        // Beira do topo sobre cada face: do topo (θ = 0) para a face (θ = 90°).
        const ex = cam.eixoX(), ez = cam.eixoZ();
        const bordas = [
            { face: faces[0], luz: LUZ.x, colA: [ez[0] * depth / FW, ez[1] * depth / FW],
              ponto: th => [width / 2 - r + r * Math.sin(th), -r + r * Math.cos(th), -depth / 2] },
            { face: faces[1], luz: LUZ.z, colA: [ex[0] * width / FW, ex[1] * width / FW],
              ponto: th => [-width / 2, -r + r * Math.cos(th), depth / 2 - r + r * Math.sin(th)] }
        ];
        for (const b of bordas) {
            for (let i = 0; i < N_FAIXAS; i++) {
                const ta = i / N_FAIXAS * Math.PI / 2, tb = (i + 1) / N_FAIXAS * Math.PI / 2, tm = (ta + tb) / 2;
                const pa = b.ponto(ta), pb = b.ponto(tb);
                const h = rowsR / N_FAIXAS, r0 = i * h;
                const v = sub(P(...pa), P(...pb));
                cam.aplicarPlano(ctx, pa, b.colA, [v[0] / h, v[1] / h]);
                ctx.drawImage(b.face.canvas, 0, r0, FW, h, 0, 0, FW, h * 1.15);
                ctx.fillStyle = mixLuz(SEM_LUZ, b.luz, Math.sin(tm) ** 2);
                ctx.fillRect(0, 0, FW, h * 1.15);
                ctx.fillStyle = brilho(b.luz, tm);
                ctx.fillRect(0, 0, FW, h * 1.15);
            }
        }
        ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    // Célula de solo sob o ponto da tela: topo, face +X ou face +Z.
    function tocarSolo(sx, sy, cam) {
        const t = cam.noPlanoY(sx, sy, 0);
        if (Math.abs(t.x) <= width / 2 && Math.abs(t.z) <= depth / 2) return { celula: celulaDe(t.x, t.z, width, depth), onde: 'topo' };
        const sxFace = cam.eixoX()[1] > 0 ? 1 : -1, szFace = cam.eixoZ()[1] > 0 ? 1 : -1;
        const fx = cam.noPlanoX(sx, sy, sxFace * width / 2);
        if (Math.abs(fx.z) <= depth / 2 && fx.y <= 0 && fx.y >= -totalH) return { celula: celulaDe(sxFace * (width / 2 - 1e-3), fx.z, width, depth), onde: 'face', prof: -fx.y };
        const fz = cam.noPlanoZ(sx, sy, szFace * depth / 2);
        if (Math.abs(fz.x) <= width / 2 && fz.y <= 0 && fz.y >= -totalH) return { celula: celulaDe(fz.x, szFace * (depth / 2 - 1e-3), width, depth), onde: 'face', prof: -fz.y };
        return null;
    }

    return {
        atualizar, desenharFundo, desenharBloco, tocarSolo,
        set destaque(c) { celulaDestaque = c; },
        topo, perfil, raizes
    };
}
