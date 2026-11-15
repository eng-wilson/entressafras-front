// Faces de corte do diorama em 2D (+X e +Z, as duas visíveis na vista isométrica).
// Cada face é um canvas: eixo horizontal ao longo da borda, vertical = profundidade representada
// (profTotalM, menor ou igual à profundidade simulada; o que passa disso fica fora do bloco).
// O pixel lê a célula da borda e a camada do solo, e pinta horizonte (A, B, C com transição irregular),
// umidade, camada compactada, gleização, bioporos e sal. As raízes do atlas vão por cima.
// No alto da face, a cor da beira do topo desce e se dissolve no perfil (sem bordadura de grama).
import { clamp, smoothstep } from '../../utils/math.js';
import { fbm, vnoise, ihash } from '../../utils/noise.js';
import { rampa } from '../../utils/ramp.js';
import { GRID, CAMADAS, CAMADA_M, idx2D, idx3D, fonteMapa } from './maps.js';

const hexRGB = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const ALT_PAREDE_ATLAS = 512, LARG_ATLAS = 1024;
const RAIZ_OPACIDADE = 0.5;

// Fração do horizonte de baixo numa transição de largura t centrada em "limite".
function pesoTransicao(prof, limite, t, jit) {
    t = Math.max(t, 0.001);
    return smoothstep(-0.5 * t, 0.5 * t, prof - limite + jit * t * 0.8);
}

export function createProfile2D({ width, depth, totalH, profTotalM, res = 1024 }) {
    const FW = res, FH = Math.round(res * totalH / width);
    const N = FW * FH;
    const uPorM = totalH / profTotalM;   // escala vertical: unidades do diorama por metro de solo

    const H_TRANS = Math.max(8, FH * 0.1);            // altura média da transição (px)
    const LINHAS_TRANS = Math.min(FH, Math.ceil(H_TRANS * 2.6));

    // Texturas estáticas por face: ruído grosso, fino, pedriscos e torrões.
    function estaticos(semente) {
        const grosso = new Float32Array(N), fino = new Float32Array(N), relevo = new Float32Array(N);
        const pedra = new Float32Array(N), jitA = new Float32Array(FW), jitB = new Float32Array(FW);
        const mosq = new Float32Array(N), lam = new Float32Array(N), poro = new Uint8Array(N), salR = new Float32Array(N);
        for (let a = 0; a < FW; a++) {
            const s = a / FW;
            jitA[a] = vnoise(s * 14 + semente, 3.1) - 0.5;
            jitB[a] = vnoise(s * 9 + semente, 7.7) - 0.5;
        }
        for (let b = 0; b < FH; b++) {
            const prof = (b + 0.5) / FH * profTotalM;
            for (let a = 0; a < FW; a++) {
                const p = b * FW + a;
                const s = (a + 0.5) / FW;
                const X = s * width * 40 + semente, Y = prof * uPorM * 40;
                grosso[p] = fbm(X * 0.12, Y * 0.12, 3);
                fino[p] = vnoise(X * 1.6, Y * 1.6);
                // Torrões: relevo por diferença de ruído (luz vindo de cima à direita).
                relevo[p] = (fbm(X * 0.5 + 0.12, Y * 0.5 - 0.12, 2) - fbm(X * 0.5, Y * 0.5, 2)) * 6;
                const pd = vnoise(X * 0.9 + 50, Y * 0.9);
                pedra[p] = smoothstep(0.8, 0.86, pd) * (vnoise(X * 0.9 + 50.2, Y * 0.9 - 0.2) > pd ? 1.25 : 0.9);
                mosq[p] = smoothstep(0.48, 0.62, fbm(s * 70 + semente, prof * 60, 3));
                lam[p] = 0.5 + 0.5 * Math.sin(prof * uPorM * 240 + vnoise(s * 40, prof * 12) * 5);
                // Bioporos: pontos escuros em células aleatórias.
                const qx = s * 60, qy = prof * uPorM * 34;
                const cx = Math.floor(qx), cy = Math.floor(qy);
                const dx = qx - cx - 0.5 - (ihash(cx, cy) - 0.5) * 0.5, dy = qy - cy - 0.5 - (ihash(cx + 3, cy - 5) - 0.5) * 0.5;
                poro[p] = Math.hypot(dx, dy) < 0.16 ? Math.round(ihash(cx * 3 + semente, cy) * 255) : 0;
                salR[p] = vnoise(qx * 0.7, qy * 0.7);
            }
        }
        // Transição topo -> face: a cor da superfície desce alguns pixels pela face e se dissolve no perfil,
        // com borda irregular (torrões que esfarelam) e uma sombra leve logo abaixo.
        const trans = new Float32Array(N), sombraTopo = new Float32Array(N);
        for (let a = 0; a < FW; a++) {
            const s = (a + 0.5) / FW;
            const hLoc = H_TRANS * (0.5 + 0.9 * vnoise(s * 46 + semente, 2.7) + 0.35 * vnoise(s * 160 + semente, 9.1));
            for (let b = 0; b < LINHAS_TRANS; b++) {
                const p = b * FW + a;
                const yb = b + (fino[p] - 0.5) * H_TRANS * 0.6;
                trans[p] = 1 - smoothstep(hLoc * 0.15, hLoc * 1.1, yb);
                const d = (yb - hLoc) / (H_TRANS * 0.35);
                sombraTopo[p] = 0.07 * Math.exp(-d * d);
            }
        }
        return { grosso, fino, relevo, pedra, jitA, jitB, mosq, lam, poro, salR, trans, sombraTopo };
    }

    const faces = [
        { parede: 0, canvas: document.createElement('canvas'), est: estaticos(11.3) },   // +X: ao longo de z
        { parede: 2, canvas: document.createElement('canvas'), est: estaticos(37.9) }    // +Z: ao longo de x
    ];
    for (const f of faces) {
        f.canvas.width = FW; f.canvas.height = FH;
        f.ctx = f.canvas.getContext('2d');
        f.img = f.ctx.createImageData(FW, FH);
    }

    // Células da borda: (i, j) da célula c0 e da vizinha ao longo da face.
    const bordaCel = (parede, c0) => parede === 0 ? [GRID - 1, c0, GRID - 1, c0 + 1] : [c0, GRID - 1, c0 + 1, GRID - 1];

    // Estado do dia por face, pré-amostrado: AMS colunas ao longo da borda x AMK linhas em profundidade.
    // As linhas cobrem só a profundidade representada (profTotalM), não a simulada inteira.
    const AMS = GRID * 4, AMK = Math.ceil(profTotalM / CAMADA_M) * 6;
    const colAm = new Int16Array(FW), linAm = new Int16Array(FH);
    for (let a = 0; a < FW; a++) colAm[a] = Math.min(AMS - 1, Math.floor((a + 0.5) / FW * AMS));
    for (let b = 0; b < FH; b++) linAm[b] = Math.min(AMK - 1, Math.floor((b + 0.5) / FH * AMK));
    const campos = Array.from({ length: 7 }, () => new Float32Array(AMS * AMK));
    // Termos derivados por amostra (Float64 para dar exatamente o mesmo valor da conta por pixel).
    const claroMoAm = new Float64Array(AMS * AMK), compAm = new Float64Array(AMS * AMK);

    function amostrarFace(parede, arr, c, dst) {
        for (let k = 0; k < AMK; k++) {
            const gk = clamp((k + 0.5) / AMK * profTotalM / CAMADA_M - 0.5, 0, CAMADAS - 1.001), k0 = Math.floor(gk), kw = gk - k0;
            for (let sI = 0; sI < AMS; sI++) {
                const g = clamp((sI + 0.5) / AMS * GRID - 0.5, 0, GRID - 1.001), c0 = Math.floor(g), w = g - c0;
                const [iA, jA, iB, jB] = bordaCel(parede, c0);
                const qa = idx3D(iA, jA, k0) + c, qb = idx3D(iB, jB, k0) + c;
                const qc = idx3D(iA, jA, k0 + 1) + c, qd = idx3D(iB, jB, k0 + 1) + c;
                const v0 = arr[qa] + (arr[qb] - arr[qa]) * w, v1 = arr[qc] + (arr[qd] - arr[qc]) * w;
                dst[k * AMS + sI] = (v0 + (v1 - v0) * kw) / 255;
            }
        }
    }

    // Cor base dos horizontes com textura. Só muda com a classe de solo e a espessura do A,
    // então fica em cache entre os dias.
    function corBase(f, classe, S1) {
        const espA = new Float32Array(FW);
        let assinatura = classe.nome;
        for (let a = 0; a < FW; a++) {
            const g = clamp((a + 0.5) / FW * GRID - 0.5, 0, GRID - 1.001), c0 = Math.floor(g), w = g - c0;
            const [iA, jA, iB, jB] = bordaCel(f.parede, c0);
            espA[a] = ((S1[idx2D(iA, jA) + 3] * (1 - w) + S1[idx2D(iB, jB) + 3] * w) / 255) * 0.4 + f.est.jitA[a] * 0.03;
            if (a % 32 === 0) assinatura += ',' + espA[a].toFixed(3);
        }
        if (f.base && f.base.assinatura === assinatura) return f.base;
        const E = f.est, H = classe.horizontes;
        const corA = hexRGB(H.A), corB = hexRGB(H.B ?? H.C), corC = hexRGB(H.C);
        const { temB, baseB, transA, transB } = classe.perfil;
        const rgb = new Float32Array(N * 3), pesoMO = new Float32Array(N);
        for (let b = 0; b < FH; b++) {
            const prof = (b + 0.5) / FH * profTotalM;
            for (let a = 0; a < FW; a++) {
                const p = b * FW + a;
                const topoC = temB ? baseB + E.jitB[a] * 0.03 : espA[a];
                const jit = E.grosso[p] - 0.5;
                const wA = pesoTransicao(prof, espA[a], transA, jit);
                const wC = temB ? pesoTransicao(prof, topoC, transB, jit * 1.3) : 0;
                let r, g, bl;
                if (temB) {
                    const rAB = corA[0] + (corB[0] - corA[0]) * wA, gAB = corA[1] + (corB[1] - corA[1]) * wA, bAB = corA[2] + (corB[2] - corA[2]) * wA;
                    r = rAB + (corC[0] - rAB) * wC; g = gAB + (corC[1] - gAB) * wC; bl = bAB + (corC[2] - bAB) * wC;
                } else {
                    r = corA[0] + (corC[0] - corA[0]) * wA; g = corA[1] + (corC[1] - corA[1]) * wA; bl = corA[2] + (corC[2] - corA[2]) * wA;
                }
                const pesoC = temB ? wC : wA;
                // Textura: variação grossa, grão fino, torrões com luz e pedriscos no C.
                const m = 0.86 + 0.28 * E.grosso[p] + (E.fino[p] - 0.5) * 0.16 + E.relevo[p] * 0.5;
                r *= m; g *= m; bl *= m;
                const pd = E.pedra[p] * (0.25 + 0.75 * pesoC);
                if (pd > 0) {
                    const lp = pd > 1 ? 1.35 : 1.15, fp = Math.min(1, pd) * 0.7;
                    r += (Math.min(255, corC[0] * lp + 30) - r) * fp;
                    g += (Math.min(255, corC[1] * lp + 26) - g) * fp;
                    bl += (Math.min(255, corC[2] * lp + 20) - bl) * fp;
                }
                rgb[p * 3] = r; rgb[p * 3 + 1] = g; rgb[p * 3 + 2] = bl;
                pesoMO[p] = 1 - wA;
            }
        }
        f.base = { assinatura, rgb, pesoMO };
        return f.base;
    }

    const bordaTopo = new Float32Array(FW * 3);
    function amostrarBordaTopo(topo, parede) {
        const TR = topo.width, fx = topo.getContext('2d');
        const FAIXA = Math.max(4, Math.round(TR * 0.012));
        // Topo: x do canvas = x do mundo, y = z. Face 0 (+X) corre em z na coluna da direita; face 2 (+Z) em x na linha de baixo.
        const im = parede === 0 ? fx.getImageData(TR - FAIXA - 1, 0, FAIXA, TR) : fx.getImageData(0, TR - FAIXA - 1, TR, FAIXA);
        const px = im.data, col = new Float32Array(TR * 3);
        for (let i = 0; i < TR; i++) {
            let r = 0, g = 0, b = 0;
            for (let k = 0; k < FAIXA; k++) {
                const o = (parede === 0 ? i * FAIXA + k : k * TR + i) * 4;
                r += px[o]; g += px[o + 1]; b += px[o + 2];
            }
            col[i * 3] = r / FAIXA; col[i * 3 + 1] = g / FAIXA; col[i * 3 + 2] = b / FAIXA;
        }
        const R = 3;   // suaviza ao longo da borda
        for (let a = 0; a < FW; a++) {
            const c = Math.floor((a + 0.5) / FW * TR);
            let r = 0, g = 0, b = 0, n = 0;
            for (let k = Math.max(0, c - R); k <= Math.min(TR - 1, c + R); k++) { r += col[k * 3]; g += col[k * 3 + 1]; b += col[k * 3 + 2]; n++; }
            bordaTopo[a * 3] = r / n; bordaTopo[a * 3 + 1] = g / n; bordaTopo[a * 3 + 2] = b / n;
        }
    }

    function pintar(sim, dia, classe, modo, atlasRaizes, topoCanvas) {
        const s = sim.superficie[dia], pr = sim.perfil[dia];
        const P0 = pr.P0, P1 = pr.P1;
        const mapa = modo.tipo === 'mapaSolo' ? fonteMapa(sim, dia, modo.mapa) : null;
        const [cUmid, cComp, cMo, cBio, cGley, cSal, cMapa] = campos;

        for (const f of faces) {
            const out = f.img.data, E = f.est;
            if (mapa) {
                if (mapa.porCamada) amostrarFace(f.parede, mapa.arr, mapa.comp, cMapa);
                for (let b = 0; b < FH; b++) {
                    for (let a = 0; a < FW; a++) {
                        const p = b * FW + a, o = p * 4;
                        let r = 107, g = 107, bl = 107;
                        if (mapa.porCamada) [r, g, bl] = rampa(cMapa[linAm[b] * AMS + colAm[a]]);
                        const sh = 0.92 + 0.08 * E.fino[p];
                        out[o] = r * sh; out[o + 1] = g * sh; out[o + 2] = bl * sh; out[o + 3] = 255;
                    }
                }
                f.ctx.putImageData(f.img, 0, 0);
                continue;
            }
            amostrarFace(f.parede, P0, 0, cUmid); amostrarFace(f.parede, P0, 1, cComp); amostrarFace(f.parede, P0, 2, cMo);
            amostrarFace(f.parede, P1, 0, cBio); amostrarFace(f.parede, P1, 1, cGley); amostrarFace(f.parede, P1, 2, cSal);
            const base = corBase(f, classe, s.S1);
            if (topoCanvas) amostrarBordaTopo(topoCanvas, f.parede);
            for (let q = 0; q < AMS * AMK; q++) {
                claroMoAm[q] = 1 - smoothstep(0.1, 0.45, cMo[q]);
                compAm[q] = cComp[q] > 0.35 ? smoothstep(0.35, 0.8, cComp[q]) : 0;
            }
            for (let b = 0; b < FH; b++) {
                const prof = (b + 0.5) / FH * profTotalM;
                const ao = 1 - 0.22 * Math.pow(prof / profTotalM, 3);
                const linha = linAm[b] * AMS;
                for (let a = 0; a < FW; a++) {
                    const p = b * FW + a, o = p * 4, q = linha + colAm[a];
                    let r = base.rgb[p * 3], g = base.rgb[p * 3 + 1], bl = base.rgb[p * 3 + 2];
                    // Pouca matéria orgânica: horizonte A claro.
                    const fMo = base.pesoMO[p] * claroMoAm[q] * 0.55;
                    if (fMo > 0) { r += (r * 0.7 + 12) * fMo; g += (g * 0.7 + 8) * fMo; bl += bl * 0.7 * fMo; }
                    // Umidade: escurece; a transição seco/úmido é a frente de molhamento.
                    const m = (1.35 + (0.5 - 1.35) * cUmid[q]) * ao;
                    r *= m; g *= m; bl *= m;
                    // Camada compactada: estrutura laminar densa e acinzentada.
                    if (cComp[q] > 0.35) {
                        const cp = compAm[q];
                        const fl = cp * smoothstep(0.6, 0.9, E.lam[p]) * 0.48;
                        r *= 1 - fl; g *= 1 - fl; bl *= 1 - fl;
                        const l = (r + g + bl) / 3 * 1.1, fc = cp * 0.55;
                        r += (l - r) * fc; g += (l - g) * fc; bl += (l - bl) * fc;
                    }
                    // Gleização: mosqueados cinza-azulados.
                    const gley = cGley[q];
                    if (gley > 0.01) {
                        const fg = gley * (0.35 + 0.55 * E.mosq[p]);
                        r += (77 - r) * fg; g += (87 - g) * fg; bl += (92 - bl) * fg;
                    }
                    // Bioporos e galerias.
                    if (E.poro[p] && E.poro[p] / 255 > 1 - cBio[q] * 0.8) { r *= 0.35; g *= 0.35; bl *= 0.35; }
                    // Sal.
                    const sal = cSal[q];
                    if (sal > 0.01) {
                        const fs = sal * smoothstep(0.6, 0.75, E.salR[p]);
                        r += (230 - r) * fs; g += (230 - g) * fs; bl += (230 - bl) * fs;
                    }
                    if (b < LINHAS_TRANS && topoCanvas) {
                        const w = E.trans[p];
                        if (w > 0) { const t = a * 3; r += (bordaTopo[t] - r) * w; g += (bordaTopo[t + 1] - g) * w; bl += (bordaTopo[t + 2] - bl) * w; }
                        const sb = 1 - E.sombraTopo[p];
                        r *= sb; g *= sb; bl *= sb;
                    }
                    out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = 255;
                }
            }
            f.ctx.putImageData(f.img, 0, 0);
            if (atlasRaizes) {
                // Raízes esmaecidas: leem-se como parte do solo, sem competir com a lavoura.
                f.ctx.globalAlpha = RAIZ_OPACIDADE;
                f.ctx.drawImage(atlasRaizes, 0, f.parede * ALT_PAREDE_ATLAS, LARG_ATLAS, ALT_PAREDE_ATLAS, 0, 0, FW, FH);
                f.ctx.globalAlpha = 1;
            }
        }
    }

    return { faces, FW, FH, pintar };
}
