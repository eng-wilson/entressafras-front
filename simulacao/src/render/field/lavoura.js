// Lavoura: posição de cada planta, escolha do sprite (fase, postura, espiga, variante),
// sintomas compostos e desenho isométrico com balanço de vento e acamamento.
import { clamp, smoothstep, lerp } from '../../utils/math.js';
import { P, NCANAIS, IDX } from '../../domain/channels.js';
import { createSpriteSet, VARIANTES } from '../sprites/manifest.js';
import { createCompositor } from '../sprites/symptoms.js';
import { gerarPlantas, margemPlantio } from '../../domain/plantio.js';

export { margemPlantio };

export function createLavoura(crop, { width, depth }) {
    const M = crop.morfologia, J = crop.janelas, SF = crop.sprites.fases;
    const hMed = (M.alturaMax[0] + M.alturaMax[1]) / 2;
    const hf = t => smoothstep(J.altura[0], J.altura[1], t);

    const plants = gerarPlantas(crop, { width, depth, variantes: VARIANTES });
    // Ordem do pintor: de trás (menor x + z) para a frente.
    const ordem = plants.map((_, i) => i).sort((a, b) => (plants[a].px + plants[a].pz) - (plants[b].px + plants[b].pz));

    const sprites = createSpriteSet(crop);
    const compositor = createCompositor();
    const ag = new Float32Array(NCANAIS), cr = new Float32Array(NCANAIS);
    let translucido = false;

    function faseDe(t) {
        if (t < SF[0].t) return -1;
        let k = 0;
        for (let i = 0; i < SF.length; i++) if (SF[i].t <= t) k = i;
        return k;
    }

    // Fila de imagens com sintomas a calcular, processada aos poucos a cada quadro.
    const fila = new Map();

    // Sprites ainda não gerados (nome -> argumentos do pintor).
    const filaSprites = new Map();
    let ultimo = null;   // argumentos do último atualizar, para refazer quando chegam sprites novos

    function processarFila(orcamentoMs = 10) {
        const t0 = performance.now();
        if (filaSprites.size) {
            for (const [nome, args] of filaSprites) {
                sprites.obter(...args);
                filaSprites.delete(nome);
                if (performance.now() - t0 > orcamentoMs) break;
            }
            if (!filaSprites.size && ultimo) atualizar(...ultimo);
            return filaSprites.size + fila.size;
        }
        for (const [chave, item] of fila) {
            const img = compositor.compor(item.spr, item.est);
            for (const pi of item.plantas) {
                const v = plants[pi].vis;
                if (v && v.chave === chave) v.img = img;
            }
            fila.delete(chave);
            if (performance.now() - t0 > orcamentoMs) break;
        }
        return fila.size;
    }

    // modo: 'real' | 'mapa' (estresse da planta em falsa-cor) | 'cinza' (mapa do solo: plantas neutras).
    function atualizar(t, reg, opcoes = {}) {
        const { ganho = 1, modo = 'real', canalMapa = -1, clima = null } = opcoes;
        ultimo = [t, reg, opcoes];
        const k = faseDe(t);
        fila.clear();
        filaSprites.clear();
        translucido = modo === 'cinza';
        const emerg = smoothstep(SF[0].t, SF[0].t + 0.03, t);
        const vivo = 1 - smoothstep(0.85, 1, t);
        plants.forEach((p, pi) => {
            if (k < 0) { p.vis = null; return; }
            const o = pi * P.STRIDE;
            for (let c = 0; c < NCANAIS; c++) { ag[c] = reg[o + P.AGUDO + c]; cr[c] = reg[o + P.CRONICO + c]; }
            const cresc = reg[o + P.CRESC], esp = reg[o + P.ESPIGA];
            // Postura: estresse hídrico ou calor de hoje enrolam e murcham a planta viva.
            const r = Math.max(ag[IDX.agua_deficit], ag[IDX.calor] * 0.8, ag[IDX.agua_excesso] * 0.75) * (modo === 'real' ? ganho : 1) * vivo;
            const postura = r < 0.2 ? 0 : r < 0.5 ? 1 : 2;
            const nivelEsp = esp > 0.8 ? 0 : esp > 0.4 ? 1 : 2;
            // Sprite exato se já existe; senão pede a geração e usa o mais próximo disponível.
            let spr = sprites.existente(k, postura, nivelEsp, p.variante);
            if (!spr) {
                filaSprites.set([k, postura, nivelEsp, p.variante].join('|'), [k, postura, nivelEsp, p.variante]);
                spr = sprites.existente(k, 0, 0, p.variante) || sprites.existente(k, 0, 0, 0) || sprites.obter(k, 0, 0, 0);
            }
            const est = {
                modo, ag, cr, ganho,
                senesc: reg[o + P.SENESC],
                valorMapa: canalMapa >= 0 ? Math.max(ag[canalMapa], cr[canalMapa]) : 0
            };
            // Imagem com sintomas: do cache, ou entra na fila e a planta mostra a imagem anterior
            // (mesmo sprite) ou o sprite base até ficar pronta.
            const chave = compositor.chaveDe(spr, est);
            let img = compositor.emCache(chave);
            if (!img) {
                img = p.vis && p.vis.spr === spr ? p.vis.img : spr.cor;
                let item = fila.get(chave);
                if (!item) fila.set(chave, item = { spr, est: { ...est, ag: Float32Array.from(ag), cr: Float32Array.from(cr) }, plantas: [] });
                item.plantas.push(pi);
            }
            // Altura: o sprite da fase é escalado pela altura simulada (crescimento contínuo dentro da fase).
            const hNow = p.plantHeightMax * hf(t) * cresc * p.scaleJitter + 0.12;
            const hRef = hMed * hf(SF[k].t) + 0.12;
            const e = lerp(0.35, 1, emerg);
            const sy = clamp(hNow / hRef, 0.25, 1.7) * e * (1 - clamp(r) * 0.16);
            const sx = p.scaleJitter * (0.85 + 0.15 * cresc) * clamp(Math.sqrt(sy), 0.7, 1.2) * e;
            // Planta acamada fica escura, apagada e amarronzada: reforça que caiu por causa do solo
            // (K baixo, raiz rasa, encharcamento). Só nos modos realista e exagerado; o mapa é falsa-cor.
            const acama = reg[o + P.ACAMA];
            const escuro = modo === 'real' ? clamp(smoothstep(0.08, 0.9, acama) * Math.max(1, ganho * 0.6)) : 0;
            p.vis = {
                img, spr, chave, sx, sy, rot: acama * p.lado * 0.9, balanco: 1 - smoothstep(0.85, 1, t) * 0.7,
                filtro: escuro > 0.02
                    ? `brightness(${(1 - 0.45 * escuro).toFixed(3)}) saturate(${(1 - 0.55 * escuro).toFixed(3)}) sepia(${(0.4 * escuro).toFixed(3)})`
                    : modo === 'real' && clima?.molhado > 0.05
                        ? `brightness(${(1 - clima.molhado * 0.18).toFixed(3)}) saturate(${(1 + clima.molhado * 0.25).toFixed(3)})`
                        : null
            };
        });
    }

    function desenhar(ctx, cam, tempo, destaque = -1) {
        // A mesma ordem é invertida pelo hit-test; sprites continuam voltados à tela.
        ordem.sort((a, b) => cam.proj(plants[a].px, 0, plants[a].pz)[1] - cam.proj(plants[b].px, 0, plants[b].pz)[1] || a - b);
        const S = cam.escala, d = cam.dpr;
        ctx.save();
        // Sombras no topo (luz vindo da direita), recortadas no topo do bloco: a sombra da planta da
        // borda não vaza para fora do solo, por maior que seja a planta na fase.
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(...cam.proj(-width / 2, 0, -depth / 2));
        ctx.lineTo(...cam.proj(width / 2, 0, -depth / 2));
        ctx.lineTo(...cam.proj(width / 2, 0, depth / 2));
        ctx.lineTo(...cam.proj(-width / 2, 0, depth / 2));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = 'rgba(28, 20, 10, 0.2)';
        for (const i of ordem) {
            const p = plants[i];
            if (!p.vis) continue;
            const [x, y] = cam.proj(p.px, 0, p.pz);
            const rx = p.vis.spr.larg / p.vis.spr.res * 0.26 * S * p.vis.sx;
            ctx.beginPath();
            ctx.ellipse(x - rx * 0.3, y + rx * 0.06, rx, rx * 0.42, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        if (destaque >= 0 && plants[destaque].vis) {
            const p = plants[destaque];
            const [x, y] = cam.proj(p.px, 0, p.pz);
            ctx.strokeStyle = 'rgba(255, 240, 120, 0.95)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y, 0.13 * S, 0.065 * S, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = translucido ? 0.45 : 1;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';   // sprites reduzidos ~5x: filtro bom evita serrilhado e brilho na borda
        for (const i of ordem) {
            const p = plants[i], v = p.vis;
            if (!v) continue;
            const [x, y] = cam.proj(p.px, 0, p.pz);
            const sw = (Math.sin(tempo * 1.7 + p.faseVento) * 0.03 + Math.sin(tempo * 0.53 + p.px * 1.3) * 0.02) * v.balanco;
            const k = S / v.spr.res;
            ctx.setTransform(d, 0, 0, d, 0, 0);
            ctx.translate(x, y);
            if (v.rot) ctx.rotate(v.rot);
            ctx.transform(1, 0, sw, 1, 0, 0);
            ctx.scale(k * v.sx, k * v.sy);
            if (v.filtro) ctx.filter = v.filtro;
            ctx.drawImage(v.img, -v.spr.ancora[0], -v.spr.ancora[1]);
            if (v.filtro) ctx.filter = 'none';
            v.m = ctx.getTransform();
        }
        ctx.restore();
    }

    // Planta sob o ponto da tela (pixels CSS), da frente para trás, testando a silhueta do sprite.
    function tocar(sx, sy, dpr) {
        for (let n = ordem.length - 1; n >= 0; n--) {
            const p = plants[ordem[n]], v = p.vis;
            if (!v || !v.m) continue;
            const pt = v.m.inverse().transformPoint(new DOMPoint(sx * dpr, sy * dpr));
            const lx = Math.floor(pt.x + v.spr.ancora[0]), ly = Math.floor(pt.y + v.spr.ancora[1]);
            if (lx < 0 || ly < 0 || lx >= v.spr.larg || ly >= v.spr.alt) continue;
            if (v.spr.dadosPx[(ly * v.spr.larg + lx) * 4 + 3] > 60) return ordem[n];
        }
        return -1;
    }

    return { plants, atualizar, processarFila, desenhar, tocar, sprites, compositor, faseDe, get pendentes() { return fila.size + filaSprites.size; } };
}
