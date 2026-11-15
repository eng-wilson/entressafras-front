// Retrato de uma cultura: o sprite da fase pedida desenhado num canvas pequeno, para fichas e
// trilhas da interface (estilo carta de jogo). Usa o mesmo conjunto de sprites do talhão.
//
//   desenharRetrato(canvas, crop, t)   t = fração do ciclo (0 a 1); escolhe a fase de sprite desse ponto
import { createSpriteSet } from '../render/sprites/manifest.js';

const conjuntos = new Map();   // crop.id → { sprites, pronto: Promise }

function conjuntoDe(crop) {
    if (!conjuntos.has(crop.id)) {
        const sprites = createSpriteSet(crop);
        const pronto = crop.sprites.arte ? sprites.carregarArte().catch(() => 0) : Promise.resolve(0);
        conjuntos.set(crop.id, { sprites, pronto });
    }
    return conjuntos.get(crop.id);
}

function faseDoSprite(crop, t) {
    const SF = crop.sprites.fases;
    let k = 0;
    for (let i = 0; i < SF.length; i++) if (SF[i].t <= t) k = i;
    return k;
}

function pintar(canvas, spr) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const img = spr.cor, w = img.width, h = img.height;
    const k = Math.min(W * 0.92 / w, H * 0.92 / h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (W - w * k) / 2, H - h * k - H * 0.04, w * k, h * k);
}

export function desenharRetrato(canvas, crop, t) {
    if (!canvas || !crop) return;
    const { sprites, pronto } = conjuntoDe(crop);
    const k = faseDoSprite(crop, t);
    const marca = `${crop.id}|${k}`;
    canvas.dataset.retrato = marca;
    pintar(canvas, sprites.existente(k, 0, 0, 0) || sprites.obter(k, 0, 0, 0));
    // A arte pintada chega depois do procedural: redesenha se o canvas ainda mostra a mesma coisa.
    pronto.then(n => { if (n && canvas.dataset.retrato === marca) pintar(canvas, sprites.obter(k, 0, 0, 0)); });
}
