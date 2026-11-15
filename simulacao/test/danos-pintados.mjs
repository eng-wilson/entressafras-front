import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const raiz = fileURLToPath(new URL('../../', import.meta.url));
const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    const erros = []; page.on('pageerror', e => erros.push(e.message));
    await page.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<body style="background:#ede9df;color:#282820;font:14px system-ui">' });
        try {
            const arq = resolve(raiz, '.' + path);
            if (!arq.startsWith(raiz)) throw Error('fora da raiz');
            await route.fulfill({ contentType: { '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' }[extname(arq)] ?? 'text/plain', body: await readFile(arq) });
        } catch { await route.fulfill({ status: 404, body: '' }); }
    });
    await page.goto('http://local/');
    const resultado = await page.evaluate(async () => {
        const { CULTURAS } = await import('/simulacao/src/domain/crops/catalogo.js');
        const { createSpriteSet } = await import('/simulacao/src/render/sprites/manifest.js');
        const { createCompositor, chaveEstresse } = await import('/simulacao/src/render/sprites/symptoms.js');
        const { carregarDanos } = await import('/simulacao/src/render/sprites/painted-damage.js');
        const { IDX, NCANAIS } = await import('/simulacao/src/domain/channels.js');
        if (!await carregarDanos()) throw Error('Atlas não carregou');
        const casos = [['Saudável', null], ['Seca', 'agua_deficit'], ['N', 'N'], ['K', 'K'], ['Percevejo', 'percevejo'], ['Dano radicular', 'nematoide'], ['Calor', 'calor']];
        let verificados = 0;
        for (const crop of Object.values(CULTURAS)) {
            const set = createSpriteSet(crop); await set.carregarArte();
            const k = Math.floor(crop.sprites.fases.length / 2);
            const sprite = set.obter(k, 0, 0, 0), compositor = createCompositor();
            const titulo = document.createElement('h2'); titulo.textContent = crop.nome; document.body.append(titulo);
            const linha = document.createElement('div'); linha.style.cssText = 'display:flex;gap:10px'; document.body.append(linha);
            let saudavel;
            for (const [nome, canal] of casos) {
                const est = { modo: 'real', ag: new Float32Array(NCANAIS), cr: new Float32Array(NCANAIS), ganho: 1, senesc: 0 };
                if (canal === 'percevejo' || canal === 'nematoide') est.pragas = { [canal]: .85 };
                else if (canal) { est.ag[IDX[canal]] = .85; est.cr[IDX[canal]] = .65; }
                const c = compositor.compor(sprite, est);
                const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
                if (!canal) saudavel = px;
                else if (!px.some((v, i) => i % 4 !== 3 && v !== saudavel[i])) throw Error(`${crop.id}: ${nome} sem efeito`);
                for (let i = 3; i < px.length; i += 4) if (px[i] !== saudavel[i]) throw Error('Dano alterou alpha');
                if (canal && chaveEstresse(est) === chaveEstresse({ ...est, pragas: null, ag: new Float32Array(NCANAIS), cr: new Float32Array(NCANAIS) })) throw Error('Cache não distingue dano');
                const figura = document.createElement('figure'); figura.style.margin = '0'; linha.append(figura);
                const legenda = document.createElement('figcaption'); legenda.textContent = nome; figura.append(legenda);
                const mini = document.createElement('canvas'); mini.width = 195; mini.height = 260; figura.append(mini);
                const fator = Math.min(185 / c.width, 250 / c.height);
                mini.getContext('2d').drawImage(c, (195 - c.width * fator) / 2, 260 - c.height * fator, c.width * fator, c.height * fator);
                verificados++;
            }
        }
        return { culturas: Object.keys(CULTURAS).length, verificados };
    });
    assert.deepEqual(erros, []);
    const scratch = resolve(raiz, 'simulacao/scratch/danos'); await mkdir(scratch, { recursive: true });
    await page.screenshot({ path: resolve(scratch, 'galeria.png'), fullPage: true });
    console.log('OK: atlas, cache, efeito dos danos e silhuetas preservadas', resultado);
} finally { await browser.close(); }
