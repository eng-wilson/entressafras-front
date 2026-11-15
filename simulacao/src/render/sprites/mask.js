// Contrato do sprite: imagem de cor + máscara de dados do mesmo tamanho.
// Máscara de dados (RGBA):
//   R = u, posição ao longo do órgão (0 base .. 255 ponta)
//   G = v, distância da nervura central até a margem (0 .. 255)
//   B = órgão (3 bits altos) e idade da folha (5 bits baixos, 0 nova .. 31 velha)
//   A = cobertura (mesma silhueta da cor)
import { clamp } from '../../utils/math.js';

export const ORGAO = { FOLHA: 1, COLMO: 2, PENDAO: 3, GRAO: 4, PALHA: 5, ESTIGMA: 6, FRUTO: 7 };

export const codificarB = (orgao, idade = 0) => (orgao << 5) | Math.round(clamp(idade) * 31);
export const orgaoDe = b => b >> 5;
export const idadeDe = b => (b & 31) / 31;

export function corDados(u, v, orgao, idade = 0) {
    return `rgb(${Math.round(clamp(u) * 255)}, ${Math.round(clamp(v) * 255)}, ${codificarB(orgao, idade)})`;
}

// Par de telas (cor e dados) desenhadas sempre com a mesma geometria.
export function criarTelas(larg, alt) {
    const cor = document.createElement('canvas');
    const dados = document.createElement('canvas');
    cor.width = dados.width = larg;
    cor.height = dados.height = alt;
    return {
        larg, alt, cor, dados,
        c: cor.getContext('2d', { willReadFrequently: true }),
        d: dados.getContext('2d', { willReadFrequently: true })
    };
}

// Preenche o mesmo caminho nas duas telas.
export function preencher(T, caminho, estiloCor, estiloDados) {
    T.c.beginPath(); caminho(T.c); T.c.fillStyle = estiloCor; T.c.fill();
    T.d.beginPath(); caminho(T.d); T.d.fillStyle = estiloDados; T.d.fill();
}

// Traço (linha) nas duas telas.
export function tracar(T, caminho, larg, estiloCor, estiloDados) {
    T.c.lineWidth = T.d.lineWidth = larg;
    T.c.lineCap = T.d.lineCap = 'round';
    T.c.beginPath(); caminho(T.c); T.c.strokeStyle = estiloCor; T.c.stroke();
    T.d.beginPath(); caminho(T.d); T.d.strokeStyle = estiloDados; T.d.stroke();
}

// Fecha o sprite: lê os pixels uma vez (os sintomas trabalham sobre esses arrays).
// As telas de trabalho ficam na CPU (leitura rápida); a imagem exibida vai para um canvas novo,
// que o navegador pode manter na GPU.
export function finalizarSprite(T, meta) {
    const corImg = T.c.getImageData(0, 0, T.larg, T.alt);
    const exibir = document.createElement('canvas');
    exibir.width = T.larg; exibir.height = T.alt;
    exibir.getContext('2d').putImageData(corImg, 0, 0);
    return {
        ...meta,
        larg: T.larg, alt: T.alt,
        cor: exibir,
        corPx: corImg.data,
        dadosPx: T.d.getImageData(0, 0, T.larg, T.alt).data
    };
}

// Adapta o recorte pintado sem mudar de estilo quando a simulação pede estresse.
// Cor e dados passam pela mesma transformação; o colo continua na mesma âncora.
// A compressão da porção superior aproxima panículas parciais/abortadas. Não
// substitui uma pintura anatômica específica de cada estado reprodutivo.
export function adaptarArte(base, { postura = 0, espiga = 0 } = {}) {
    const origem = criarTelas(base.larg, base.alt);
    origem.c.drawImage(base.cor, 0, 0);
    origem.d.putImageData(new ImageData(base.dadosPx, base.larg, base.alt), 0, 0);
    const topo = criarTelas(base.larg, base.alt);
    const corte = Math.round(base.ancora[1] * .43);
    const fator = [1, .7, .3][espiga];
    for (const canal of ['c', 'd']) {
        const img = canal === 'c' ? origem.cor : origem.dados;
        topo[canal].drawImage(img, 0, 0, base.larg, corte,
            0, corte * (1 - fator), base.larg, corte * fator);
        topo[canal].drawImage(img, 0, corte, base.larg, base.alt - corte,
            0, corte, base.larg, base.alt - corte);
    }
    const largura = [1, .68, .82][postura];
    const queda = postura === 2 ? .3 : 0;
    const T = criarTelas(base.larg, base.alt + Math.ceil(base.larg * queda));
    for (let x = 0; x < base.larg; x += 2) {
        const w = Math.min(2, base.larg - x);
        const dx = base.ancora[0] + (x - base.ancora[0]) * largura;
        const dy = Math.abs(x - base.ancora[0]) * queda;
        for (const canal of ['c', 'd']) T[canal].drawImage(canal === 'c' ? topo.cor : topo.dados,
            x, 0, w, base.alt, dx, dy, w * largura, base.alt);
    }
    return finalizarSprite(T, { ancora: [...base.ancora], res: base.res,
        maturacao: base.maturacao, mascaraAuto: base.mascaraAuto });
}

// Sprite a partir da arte final (PNG). A máscara de dados é gerada da própria imagem de cor
// (mascaraDaCor): os .dados.png pintados à mão não acompanham o contorno da arte (colmo e espiga em
// retângulo, idade em faixas horizontais) e os sintomas apareciam em blocos e listras.
// O PNG de dados continua aceito no manifesto, mas não é usado.
export function spriteDeImagens(imgCor, _imgDados, meta) {
    const T = criarTelas(imgCor.width, imgCor.height);
    T.c.drawImage(imgCor, 0, 0);
    const img = T.c.getImageData(0, 0, T.larg, T.alt);
    removerFranja(img.data, T.larg, T.alt);
    if (meta.semBranco) removerBrancoPreso(img.data, T.larg, T.alt);
    T.c.putImageData(img, 0, 0);
    T.d.putImageData(new ImageData(mascaraDaCor(img.data, T.larg, T.alt, meta.ancora), T.larg, T.alt), 0, 0);
    // mascaraAuto: os sintomas trocam padrões em faixa por mosqueado (ver symptoms.js).
    return finalizarSprite(T, { ...meta, mascaraAuto: true });
}

// Distância (chamfer 3-4, em px) de cada pixel "dentro" até o pixel "fora" mais próximo.
function distanciaBorda(dentro, W, H) {
    const INF = 1e9, d = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = dentro[i] ? INF : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!d[i]) continue;
        let m = d[i];
        if (x > 0) m = Math.min(m, d[i - 1] + 3); else m = Math.min(m, 3);
        if (y > 0) {
            m = Math.min(m, d[i - W] + 3);
            if (x > 0) m = Math.min(m, d[i - W - 1] + 4);
            if (x < W - 1) m = Math.min(m, d[i - W + 1] + 4);
        } else m = Math.min(m, 3);
        d[i] = m;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; if (!d[i]) continue;
        let m = d[i];
        if (x < W - 1) m = Math.min(m, d[i + 1] + 3); else m = Math.min(m, 3);
        if (y < H - 1) {
            m = Math.min(m, d[i + W] + 3);
            if (x < W - 1) m = Math.min(m, d[i + W + 1] + 4);
            if (x > 0) m = Math.min(m, d[i + W - 1] + 4);
        } else m = Math.min(m, 3);
        d[i] = m;
    }
    for (let i = 0; i < W * H; i++) d[i] /= 3;
    return d;
}

// Franja clara deixada pelo recorte do fundo branco: pixels esbranquiçados a poucos px da borda,
// bem mais claros que o interior logo atrás deles, viram transparentes. Flores no meio da planta ficam.
function removerFranja(px, W, H) {
    const N = W * H, opaco = new Uint8Array(N);
    for (let i = 0; i < N; i++) opaco[i] = px[i * 4 + 3] > 16 ? 1 : 0;
    const dist = distanciaBorda(opaco, W, H);
    const R = Math.max(3, Math.round(Math.min(W, H) * 0.012));
    const minC = i => Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!opaco[i] || dist[i] > R) continue;
        const c = minC(i);
        if (c < 130) continue;
        // Interior: média do mínimo de canal num anel um pouco mais para dentro.
        let soma = 0, n = 0;
        for (let dy = -R - 2; dy <= R + 2; dy += 2) for (let dx = -R - 2; dx <= R + 2; dx += 2) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const j = yy * W + xx;
            if (dist[j] > R + 1) { soma += minC(j); n++; }
        }
        const sat = Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - c;
        if (n && c > soma / n + 45) px[i * 4 + 3] = 0;
        // Parte fina (pendão, cabelo da espiga, pecíolo): sem interior para comparar, decide pela cor.
        // Esbranquiçado e pouco saturado na borda = resto do fundo branco.
        else if (!n && c > 150 && sat < 70) px[i * 4 + 3] = 0;
    }
    // Alfa parcial restante na borda: cor puxada para o tom do vizinho opaco (sem brilho branco).
    for (let i = 0; i < N; i++) {
        const a = px[i * 4 + 3];
        if (a > 16 && a < 235) { const k = 0.82; px[i * 4] *= k; px[i * 4 + 1] *= k; px[i * 4 + 2] *= k; }
    }
}

// Fundo branco preso dentro da planta (vão entre folha e colmo, entre ramos do pendão), sem contato com a
// borda. Só para culturas sem órgão branco (gramíneas): remove o branco pouco saturado e o halo de 1 px.
function removerBrancoPreso(px, W, H) {
    const N = W * H, tirar = new Uint8Array(N);
    const minC = i => Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const sat = i => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) - minC(i);
    for (let i = 0; i < N; i++) if (px[i * 4 + 3] > 16 && minC(i) > 200 && sat(i) < 45) tirar[i] = 1;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (tirar[i] || px[i * 4 + 3] <= 16 || minC(i) < 165 || sat(i) > 65) continue;
        if (tirar[i - 1] === 1 || tirar[i + 1] === 1 || tirar[i - W] === 1 || tirar[i + W] === 1) tirar[i] = 2;
    }
    for (let i = 0; i < N; i++) if (tirar[i]) px[i * 4 + 3] = 0;
}

const smooth01 = t => { t = clamp(t); return t * t * (3 - 2 * t); };

// Máscara de dados a partir da cor:
//   órgão: verde / verde-amarelado / oliva = FOLHA (recebe sintoma); branco (flor), amarelo-laranja
//          saturado (grão, espiga, pendão), marrom (palha, vagem seca) = FRUTO / PALHA (sem sintoma).
//   idade: pela altura (pé = folha velha, topo = folha nova), contínua.
//   u: distância horizontal ao eixo da planta (base -> ponta da folha).
//   v: nervura -> margem, pela distância até a borda da folha.
export function mascaraDaCor(px, W, H, ancora) {
    const N = W * H, out = new Uint8ClampedArray(N * 4), folha = new Uint8Array(N), org = new Uint8Array(N);
    let topo = H;
    for (let i = 0; i < N; i++) {
        const a = px[i * 4 + 3];
        if (a <= 16) continue;
        topo = Math.min(topo, (i / W) | 0);
        const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, c = mx - mn;
        const s = c / (1 - Math.abs(2 * l - 1) + 1e-6);
        let h = 0;
        if (c > 1e-6) h = mx === r ? 60 * (((g - b) / c) % 6) : mx === g ? 60 * ((b - r) / c + 2) : 60 * ((r - g) / c + 4);
        if (h < 0) h += 360;
        let o = ORGAO.FOLHA;
        if (s < 0.2 && l > 0.68) o = ORGAO.FRUTO;                       // flor branca
        else if (h >= 24 && h < 47 && s > 0.6 && l > 0.32) o = ORGAO.FRUTO; // grão, espiga, pendão dourado
        else if (h < 40 && l < 0.42) o = ORGAO.PALHA;                   // marrom / seco
        else if (h > 200 && h < 330) o = ORGAO.FRUTO;                   // flor roxa
        org[i] = o;
        if (o === ORGAO.FOLHA) folha[i] = 1;
    }
    // Mancha pequena de "fruto" no meio da folha é brilho amarelado da pintura, não órgão: volta a ser folha.
    // Conta, numa janela 9 x 9, quantos vizinhos também são fruto/flor; abaixo de 35 % é ruído.
    const ehFruto = new Uint8Array(N);
    for (let i = 0; i < N; i++) ehFruto[i] = org[i] === ORGAO.FRUTO ? 1 : 0;
    const integ = new Uint32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let lin = 0; for (let x = 0; x < W; x++) { lin += ehFruto[y * W + x]; integ[(y + 1) * (W + 1) + x + 1] = integ[y * (W + 1) + x + 1] + lin; } }
    const R9 = 4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!ehFruto[i]) continue;
        const x0 = Math.max(0, x - R9), x1 = Math.min(W, x + R9 + 1), y0 = Math.max(0, y - R9), y1 = Math.min(H, y + R9 + 1);
        const n = integ[y1 * (W + 1) + x1] - integ[y0 * (W + 1) + x1] - integ[y1 * (W + 1) + x0] + integ[y0 * (W + 1) + x0];
        if (n < 0.35 * (x1 - x0) * (y1 - y0)) { org[i] = ORGAO.FOLHA; folha[i] = 1; }
    }
    // Margem medida contra a silhueta da planta (alfa), não contra a classe "folha": sombra escura dentro
    // da folha não vira buraco com margem falsa em volta.
    const silhueta = new Uint8Array(N);
    for (let i = 0; i < N; i++) silhueta[i] = px[i * 4 + 3] > 16 ? 1 : 0;
    const dist = distanciaBorda(silhueta, W, H);
    const meiaFolha = Math.max(4, W * 0.035);                          // meia largura típica da folha (px)
    const ax = ancora ? ancora[0] : W / 2, ay = ancora ? ancora[1] : H;
    const alturaP = Math.max(1, ay - topo);
    let meiaLarg = 1;
    for (let i = 0; i < N; i++) if (folha[i]) meiaLarg = Math.max(meiaLarg, Math.abs((i % W) - ax));
    // Colmo / haste: faixa vertical no eixo da planta, com a meia largura medida no pé (linha logo acima
    // da âncora). Sem isso a haste, fina, contava inteira como "margem de folha" e levava a queima de margem.
    let meiaColmo = 0;
    const yPe = Math.max(0, Math.min(H - 1, Math.round(ay) - 4));
    for (const dir of [-1, 1]) {
        let x = Math.round(ax), n = 0;
        while (x >= 0 && x < W && px[(yPe * W + x) * 4 + 3] > 16 && n < W * 0.08) { x += dir; n++; }
        meiaColmo = Math.max(meiaColmo, n);
    }
    meiaColmo = Math.max(2, meiaColmo * 1.15);
    // Perto do eixo, v cai suavemente para 0 (miolo): sem efeito de margem na haste e sem corte vertical.
    const fatorColmo = x => smooth01((Math.abs(x - ax) - meiaColmo) / meiaColmo);
    for (let i = 0; i < N; i++) {
        if (org[i] === ORGAO.FOLHA && Math.abs((i % W) - ax) <= meiaColmo * 0.75) { org[i] = ORGAO.COLMO; folha[i] = 0; }
    }
    for (let i = 0; i < N; i++) {
        const a = px[i * 4 + 3];
        if (a <= 16) continue;
        const x = i % W, y = (i / W) | 0;
        const idade = clamp((y - topo) / alturaP);
        const u = clamp(Math.abs(x - ax) / meiaLarg);
        const v = folha[i] ? clamp(1 - dist[i] / meiaFolha) * fatorColmo(x) : 0;
        out[i * 4] = Math.round(u * 255);
        out[i * 4 + 1] = Math.round(v * 255);
        out[i * 4 + 2] = codificarB(org[i], idade);
        out[i * 4 + 3] = 255;
    }
    return out;
}
