import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const raiz = resolve('.');
const pasta = resolve(raiz, 'simulacao/assets/sprites/algodao');
const scratch = resolve(raiz, 'simulacao/scratch/algodao');
await mkdir(pasta, { recursive: true });
await mkdir(scratch, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log('LOG:', msg.text()));
page.on('pageerror', err => console.error('ERRO BROWSER:', err));

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#222;color:#fff;">
<h1>Algodão - Preparação de Sprites</h1>
<script type="module">
import crop from '/simulacao/src/domain/crops/algodao.js';
import { spriteDeImagens } from '/simulacao/src/render/sprites/mask.js';
import { createSpriteSet, nomeSprite } from '/simulacao/src/render/sprites/manifest.js';
import { createCompositor } from '/simulacao/src/render/sprites/symptoms.js';
import { IDX, NCANAIS, P } from '/simulacao/src/domain/channels.js';
import { createLavoura } from '/simulacao/src/render/field/lavoura.js';

window.executar = async function(imgBase64) {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = 'data:image/jpeg;base64,' + imgBase64; });
    const W = img.width, H = img.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, W, H);
    const px = imgData.data;

    const minC = i => Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const maxC = i => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    const sat = i => maxC(i) - minC(i);
    const isNearWhite = i => minC(i) > 230 && sat(i) < 28;

    const visited = new Uint8Array(W * H);
    const queue = new Int32Array(W * H);
    let qHead = 0, qTail = 0;

    for (let x = 0; x < W; x++) {
        const top = 0 * W + x, bot = (H - 1) * W + x;
        if (isNearWhite(top)) { visited[top] = 1; queue[qTail++] = top; }
        if (isNearWhite(bot)) { visited[bot] = 1; queue[qTail++] = bot; }
    }
    for (let y = 0; y < H; y++) {
        const left = y * W + 0, right = y * W + (W - 1);
        if (isNearWhite(left) && !visited[left]) { visited[left] = 1; queue[qTail++] = left; }
        if (isNearWhite(right) && !visited[right]) { visited[right] = 1; queue[qTail++] = right; }
    }

    while (qHead < qTail) {
        const idx = queue[qHead++];
        const x = idx % W, y = Math.floor(idx / W);
        const neighbors = [
            x > 0 ? idx - 1 : -1,
            x < W - 1 ? idx + 1 : -1,
            y > 0 ? idx - W : -1,
            y < H - 1 ? idx + W : -1
        ];
        for (const n of neighbors) {
            if (n >= 0 && !visited[n] && isNearWhite(n)) {
                visited[n] = 1;
                queue[qTail++] = n;
            }
        }
    }

    // Notice for cotton: only remove background that was reachable from borders!
    // Internal white bolls must NOT be removed!
    for (let i = 0; i < W * H; i++) {
        if (visited[i]) {
            px[i * 4 + 3] = 0;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    const cortes = [
        ['COT', 40, 160],
        ['VEG', 170, 410],
        ['F1', 420, 675],
        ['C1', 680, 945],
        ['CAP', 955, 1220]
    ];

    function alturaDaFase(fase) {
        const jan = crop.janelas?.altura ?? [0, 0.45];
        const u = Math.min(1, Math.max(0, (fase.t - jan[0]) / (jan[1] - jan[0])));
        const hMed = (crop.morfologia.alturaMax[0] + crop.morfologia.alturaMax[1]) / 2;
        return hMed * u * u * (3 - 2 * u) + 0.12;
    }

    const bases = new Map();
    const resultadosPng = {};

    for (const [id, x0, x1] of cortes) {
        const cutW = x1 - x0;
        const cCut = document.createElement('canvas');
        cCut.width = cutW; cCut.height = H;
        const cutCtx = cCut.getContext('2d', { willReadFrequently: true });
        cutCtx.drawImage(c, x0, 0, cutW, H, 0, 0, cutW, H);

        const cutPx = cutCtx.getImageData(0, 0, cutW, H).data;
        let minX = cutW, minY = H, maxX = 0, maxY = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < cutW; x++) {
                if (cutPx[(y * cutW + x) * 4 + 3] > 16) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const plantW = maxX - minX + 9;
        const plantH = maxY - minY + 9;
        const plantCanvas = document.createElement('canvas');
        plantCanvas.width = plantW; plantCanvas.height = plantH;
        plantCanvas.getContext('2d').drawImage(cCut, minX, minY, maxX - minX + 1, maxY - minY + 1, 4, 4, maxX - minX + 1, maxY - minY + 1);

        const plantPx = plantCanvas.getContext('2d').getImageData(0, 0, plantW, plantH).data;
        let sumX = 0, n = 0;
        for (let y = plantH - 14; y < plantH - 4; y++) {
            for (let x = 0; x < plantW; x++) {
                if (plantPx[(y * plantW + x) * 4 + 3] > 128) {
                    sumX += x;
                    n++;
                }
            }
        }
        const ancora = [n ? Math.round(sumX / n) : Math.round(plantW / 2), plantH - 5];
        const fase = crop.sprites.fases.find(f => f.id === id);
        const altura = alturaDaFase(fase);
        const resolucao = Math.round((maxY - minY) / altura);

        // semBranco is false for cotton because cotton has white fiber / cream flowers
        const s = spriteDeImagens(plantCanvas, null, { ancora, res: resolucao, maturacao: fase.maturacao ?? 0, semBranco: false });
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = s.larg; maskCanvas.height = s.alt;
        maskCanvas.getContext('2d').putImageData(new ImageData(s.dadosPx, s.larg, s.alt), 0, 0);

        resultadosPng[id + '.png'] = s.cor.toDataURL('image/png');
        resultadosPng[id + '.dados.png'] = maskCanvas.toDataURL('image/png');

        bases.set(id, { cor: id + '.png', dados: id + '.dados.png', ancora, resolucao, altura });
    }

    const origemPorFase = {
        COT: 'COT',
        VEG: 'VEG',
        B1: 'VEG',
        F1: 'F1',
        C1: 'C1',
        CAP: 'CAP',
        M: 'CAP'
    };

    const sprites = {};
    for (let k = 0; k < crop.sprites.fases.length; k++) {
        const fase = crop.sprites.fases[k];
        const baseKey = origemPorFase[fase.id] ?? 'VEG';
        const base = bases.get(baseKey);
        const { altura, ...meta } = base;
        const resolucao = Math.round(base.resolucao * altura / alturaDaFase(fase));
        for (let v = 0; v < 3; v++) {
            sprites[nomeSprite(crop, k, 0, 0, v)] = { ...meta, resolucao };
        }
    }

    return {
        resultadosPng,
        manifesto: { sprites }
    };
};
</script>
</body>
</html>`;

await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname === '/app.html') {
        await route.fulfill({ status: 200, contentType: 'text/html', body: html });
        return;
    }
    try {
        const filePath = resolve(raiz, '.' + decodeURIComponent(pathname));
        const mime = {
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.html': 'text/html'
        }[extname(filePath)] ?? 'text/plain';
        const body = await readFile(filePath);
        await route.fulfill({ status: 200, contentType: mime, body });
    } catch (e) {
        await route.fulfill({ status: 404, body: e.message });
    }
});

await page.goto('http://local/app.html');
await page.waitForFunction(() => typeof window.executar === 'function');

const rawJpg = await readFile('C:/Users/ninec/.gemini/antigravity/brain/fbb5b0fa-e418-4691-8371-61c03ecaba55/algodao_fases_progresso_1794765579387.jpg');
const base64 = rawJpg.toString('base64');

console.log('Executando extração e geração de máscaras para Algodão...');
const res = await page.evaluate((b64) => window.executar(b64), base64);

for (const [nome, dataUri] of Object.entries(res.resultadosPng)) {
    const buf = Buffer.from(dataUri.split(',')[1], 'base64');
    await writeFile(resolve(pasta, nome), buf);
    console.log('Salvo:', resolve(pasta, nome));
}

await writeFile(resolve(pasta, 'manifest.json'), JSON.stringify(res.manifesto, null, 2) + '\n');
console.log('Salvo manifesto com', Object.keys(res.manifesto.sprites).length, 'entradas.');

await writeFile(resolve(pasta, 'algodao_fases_progresso.jpg'), rawJpg);
console.log('Salva prancha original do algodão.');

await browser.close();
