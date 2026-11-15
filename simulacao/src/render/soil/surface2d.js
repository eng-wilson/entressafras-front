// Topo do diorama em 2D: textura em canvas recalculada a cada dia a partir do estado do solo.
// Camadas estáticas (ruído, canteiros, torrões, Voronoi das rachaduras, fios de palha)
// são calculadas uma vez. A cada dia, cada pixel combina essas camadas com a célula do solo (bilinear).
import { clamp, smoothstep } from '../../utils/math.js';
import { fbm, vnoise, voronoiBorda, ihash } from '../../utils/noise.js';
import { rampa } from '../../utils/ramp.js';
import { GRID, idx2D, fonteMapa } from './maps.js';
import { margemPlantio } from '../field/lavoura.js';
import { climaVisual } from '../clima.js';

const PALHA = [204, 169, 94];
const AGUA = [44, 72, 88];
const CEU = [196, 210, 224];
const SAL = [236, 236, 228];

export function createSurface2D({ width, depth, res = 1024, crop }) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = res;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(res, res);
    const N = res * res;

    // ---------- camadas estáticas ----------
    const ruidoFino = new Float32Array(N), ruidoMedio = new Float32Array(N);
    const canteiro = new Float32Array(N), luzCanteiro = new Float32Array(N);
    const torrao = new Float32Array(N);
    const fenda1 = new Float32Array(N), fenda2 = new Float32Array(N);
    const garra = new Uint8Array(N), ruidoPoca = new Float32Array(N), ruidoSal = new Float32Array(N);
    // Grade intermediária do estado do dia (suave o bastante: cada célula do solo vira 4 x 4 amostras).
    const AMOSTRA = GRID * 4;
    const campos = Array.from({ length: 9 }, () => new Float32Array(AMOSTRA * AMOSTRA));
    const celAmostra = new Int16Array(res);
    for (let a = 0; a < res; a++) celAmostra[a] = Math.min(AMOSTRA - 1, Math.floor((a + 0.5) / res * AMOSTRA));

    const { plantasPorLinha } = crop.plantio;
    const margem = margemPlantio(crop);
    const passoX = (width - margem * 2) / (plantasPorLinha - 1);
    // Canteiros correm de ponta a ponta: o recorte corta a lavoura, sem bordadura.
    const zIni = -depth / 2 - 1, zFim = depth / 2 + 1;

    for (let b = 0; b < res; b++) {
        const z = -depth / 2 + (b + 0.5) / res * depth;
        for (let a = 0; a < res; a++) {
            const p = b * res + a;
            const x = -width / 2 + (a + 0.5) / res * width;
            ruidoFino[p] = fbm(x * 70, z * 70, 2);
            ruidoMedio[p] = fbm(x * 6 + 3, z * 6 - 2, 3);
            // Canteiro (camalhão) ao longo de cada linha de plantio (linhas correm em z).
            const c = Math.round((x + width / 2 - margem) / passoX);
            const xc = -width / 2 + margem + clamp(c, 0, plantasPorLinha - 1) * passoX;
            const dx = x - xc;
            const fimZ = Math.min(z - zIni, zFim - z);
            const meia = 0.115 + (vnoise(x * 9, z * 9) - 0.5) * 0.03;
            const hz = smoothstep(-0.02, 0.06, fimZ);
            const h = (1 - smoothstep(meia * 0.45, meia, Math.abs(dx))) * hz;
            canteiro[p] = h;
            // Inclinação ao longo de x: lado voltado para +x (direita da tela) fica iluminado.
            luzCanteiro[p] = -Math.sign(dx) * (smoothstep(meia * 0.45, meia, Math.abs(dx)) * (1 - smoothstep(meia * 0.45, meia, Math.abs(dx))) * 4) * hz;
            // Torrões: manchas arredondadas, mais frequentes na borda do canteiro.
            const tN = vnoise(x * 55 + 11, z * 55 - 7);
            const limiar = 0.8 - 0.12 * smoothstep(0.3, 0.9, (1 - Math.abs(h - 0.5) * 2));
            torrao[p] = smoothstep(limiar, limiar + 0.06, tN) * (vnoise(x * 55 + 11.25, z * 55 - 7.25) - tN > 0 ? 1.18 : 0.8);
            fenda1[p] = voronoiBorda(x * 5, z * 5);
            fenda2[p] = voronoiBorda(x * 13 + 7, z * 13 + 7);
            // Marca das garras do pneu (chevron ao longo de z).
            const fr = x * 4 - Math.floor(x * 4);
            const g = z * 9 + Math.abs(fr - 0.5) * 2;
            garra[p] = g - Math.floor(g) > 0.5 ? 1 : 0;
            ruidoPoca[p] = vnoise(x * 6, z * 6);
            ruidoSal[p] = vnoise(x * 28, z * 28);
        }
    }

    // Fios de palha: R = limiar de aparecimento, G = brilho. Visível se R < palhada.
    const palhaCv = document.createElement('canvas');
    palhaCv.width = palhaCv.height = res;
    const pc = palhaCv.getContext('2d');
    pc.lineCap = 'round';
    const k = res / 1024;
    for (let s = 0; s < 52000; s++) {
        const r1 = ihash(s, 1), r2 = ihash(s, 2), r3 = ihash(s, 3), r4 = ihash(s, 4), r5 = ihash(s, 5);
        const x = r1 * res, y = r2 * res, ang = r3 * Math.PI * 2, len = (7 + r4 * 15) * k;
        pc.strokeStyle = `rgb(${(r5 * 255) | 0}, ${(ihash(s, 6) * 255) | 0}, 255)`;
        pc.lineWidth = (1.3 + ihash(s, 7) * 1.4) * k;
        pc.beginPath();
        pc.moveTo(x, y);
        pc.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len * 0.8);
        pc.stroke();
    }
    const palhaPx = pc.getImageData(0, 0, res, res).data;

    // ---------- pintura do dia ----------
    function pintar(sim, dia, classe, modo) {
        const clima = climaVisual(sim, dia);
        const s = sim.superficie[dia];
        const S0 = s.S0, S1 = s.S1, S2 = s.S2;
        const out = img.data;
        const [t0, t1] = classe.topo;
        const claro = classe.claro, crostaC = classe.crosta;
        const argila = classe.argila;
        const mapa = modo.tipo === 'mapaSolo' ? fonteMapa(sim, modo.dia ?? dia, modo.mapa) : null;
        const cinza = modo.tipo === 'mapaPlanta';

        // Estado do dia pré-amostrado (bilinear) numa grade de AMOSTRA x AMOSTRA; o pixel lê a amostra mais próxima.
        const amostrar = (arr, c, dst) => {
            for (let j = 0; j < AMOSTRA; j++) {
                const gz = clamp((j + 0.5) / AMOSTRA * GRID - 0.5, 0, GRID - 1.001), j0 = Math.floor(gz), fz = gz - j0;
                for (let i = 0; i < AMOSTRA; i++) {
                    const gx = clamp((i + 0.5) / AMOSTRA * GRID - 0.5, 0, GRID - 1.001), ii = Math.floor(gx), wx = gx - ii;
                    const q00 = idx2D(ii, j0) + c, q01 = idx2D(ii, j0 + 1) + c;
                    const v0 = arr[q00] + (arr[q00 + 4] - arr[q00]) * wx, v1 = arr[q01] + (arr[q01 + 4] - arr[q01]) * wx;
                    dst[j * AMOSTRA + i] = (v0 + (v1 - v0) * fz) / 255;
                }
            }
            return dst;
        };
        const [aUmid, aCrosta, aTraf, aMo, aPalha, aSal, aPoca, aRach, aMapa] = campos;
        if (mapa) amostrar(mapa.arr, mapa.comp, aMapa);
        else {
            amostrar(S0, 0, aUmid); amostrar(S0, 1, aCrosta); amostrar(S0, 2, aTraf); amostrar(S0, 3, aMo);
            amostrar(S1, 0, aPalha); amostrar(S1, 1, aSal); amostrar(S2, 2, aPoca); amostrar(S2, 3, aRach);
        }

        for (let b = 0; b < res; b++) {
            const linhaA = celAmostra[b] * AMOSTRA;
            for (let a = 0; a < res; a++) {
                const p = b * res + a, o = p * 4;
                const q = linhaA + celAmostra[a];

                if (mapa) {
                    const [r, g, bl] = rampa(aMapa[q]);
                    const sh = 0.9 + 0.1 * ruidoFino[p];
                    out[o] = r * sh; out[o + 1] = g * sh; out[o + 2] = bl * sh; out[o + 3] = 255;
                    continue;
                }

                let r, g, bl;
                {
                    const umid = clamp(aUmid[q] + clima.molhado * 0.25), crosta = aCrosta[q], trafego = aTraf[q], mo = aMo[q];
                    const palha = aPalha[q], sal = aSal[q];
                    const poca = aPoca[q], rach = aRach[q] * (1 + clima.seca * 0.8);
                    const nf = ruidoFino[p], nm = ruidoMedio[p];
                    const h = canteiro[p];

                    // Cor base da classe; canteiro mais escuro e grumoso.
                    const tc = clamp(nm * 0.8 + nf * 0.4 - 0.1);
                    r = t0[0] + (t1[0] - t0[0]) * tc;
                    g = t0[1] + (t1[1] - t0[1]) * tc;
                    bl = t0[2] + (t1[2] - t0[2]) * tc;
                    // Pouca matéria orgânica: superfície clareia.
                    const fMo = (1 - mo) * 0.85;
                    r += (claro[0] - r) * fMo; g += (claro[1] - g) * fMo; bl += (claro[2] - bl) * fMo;
                    // Crosta: película lisa e clara (menos no canteiro recém-revolvido).
                    const fCr = crosta * (0.85 + 0.15 * nf) * 0.85 * (1 - h * 0.35);
                    r += (crostaC[0] - r) * fCr; g += (crostaC[1] - g) * fCr; bl += (crostaC[2] - bl) * fCr;
                    // Seco clareia, úmido escurece.
                    let m = (1.48 + (0.52 - 1.48) * umid) * (1 - mo * (0.16 + 0.12 * nm));
                    // Relevo do canteiro e torrões.
                    m *= 1 + luzCanteiro[p] * 0.22 - (1 - h) * 0.06;
                    const tr = torrao[p];
                    if (tr > 0) m *= 1 + (tr - 1) * 0.9 * Math.min(1, tr);
                    r *= m; g *= m; bl *= m;
                    // Poeira ocre na seca e terra escura sob chuva; as poças continuam sendo as simuladas.
                    const poeira = clima.seca * (1 - umid) * 0.38;
                    r += (211 - r) * poeira; g += (165 - g) * poeira; bl += (98 - bl) * poeira;
                    const aguaSuperficial = clima.molhado * 0.28;
                    r *= 1 - aguaSuperficial; g *= 1 - aguaSuperficial; bl *= 1 - aguaSuperficial * 0.65;
                    // Rastro de pneu: faixa mais escura com garras.
                    const fT = trafego * (0.5 + 0.5 * garra[p]) * 0.55;
                    r *= 1 - fT; g *= 1 - fT; bl *= 1 - fT;
                    // Rachaduras poligonais (só argiloso que secou por vários dias).
                    const larg = clamp(rach * argila * 2.1 - 0.08);
                    if (larg > 0.01) {
                        const f = clamp((1 - smoothstep(larg * 0.09, larg * 0.09 + 0.015, fenda1[p]))
                            + 0.6 * (1 - smoothstep(larg * 0.045, larg * 0.045 + 0.012, fenda2[p])));
                        const e = 1 - f * 0.82;
                        r *= e; g *= e; bl *= e;
                    }
                    // Sal.
                    if (sal > 0) {
                        const fS = sal * smoothstep(0.55, 0.7, ruidoSal[p]);
                        r += (SAL[0] - r) * fS; g += (SAL[1] - g) * fS; bl += (SAL[2] - bl) * fS;
                    }
                    // Palhada.
                    if (palhaPx[o + 3] > 110 && palhaPx[o] / 255 < palha) {
                        const br = 0.72 + 0.5 * palhaPx[o + 1] / 255;
                        r = PALHA[0] * br; g = PALHA[1] * br; bl = PALHA[2] * br;
                    }
                    // Poças nas partes baixas e nos rastros, com reflexo do céu.
                    // Abaixo de 0,08 a poça é zero: o teste evita a conta na maior parte do topo, que está seca.
                    const xPoca = poca + (ruidoPoca[p] - 0.5) * 0.25;
                    const pm = xPoca > 0.08 ? smoothstep(0.08, 0.35, xPoca) : 0;
                    if (pm > 0) {
                        // Borda molhada escura, lâmina d'água e reflexo do céu em faixas.
                        const borda = pm * (1 - pm) * 4;
                        r *= 1 - borda * 0.35; g *= 1 - borda * 0.35; bl *= 1 - borda * 0.35;
                        const fA = smoothstep(0.3, 0.7, pm) * 0.85;
                        r += (AGUA[0] - r) * fA; g += (AGUA[1] - g) * fA; bl += (AGUA[2] - bl) * fA;
                        const fC = fA * (0.12 + 0.45 * smoothstep(0.55, 0.85, ruidoMedio[p] + ruidoFino[p] * 0.15));
                        r += (CEU[0] - r) * fC; g += (CEU[1] - g) * fC; bl += (CEU[2] - bl) * fC;
                    }
                }
                if (cinza) {
                    const l = (r + g + bl) / 3;
                    r += (l - r) * 0.75; g += (l - g) * 0.75; bl += (l - bl) * 0.75;
                }
                out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    return { canvas, res, pintar };
}
