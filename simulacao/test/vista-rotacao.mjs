import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
import { createCamera } from '../src/render/iso/camera.js';

const cam = createCamera();
Object.assign(cam, { ox: 300, oy: 220, escala: 75 });
for (let q = 0; q < 4; q++) {
  for (const [x, y, z] of [[1.2, -.4, -.7], [-1.4, 0, .6]]) {
    const [sx, sy] = cam.proj(x, y, z);
    const topo = cam.noPlanoY(sx, sy, y), fx = cam.noPlanoX(sx, sy, x), fz = cam.noPlanoZ(sx, sy, z);
    for (const erro of [topo.x - x, topo.z - z, fx.z - z, fx.y - y, fz.x - x, fz.y - y]) assert.ok(Math.abs(erro) < 1e-10);
  }
  cam.girar();
}
assert.equal(cam.quarto, 0);
cam.girar(-1); assert.equal(cam.quarto, 3);
const raiz = fileURLToPath(new URL('../../', import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const erros = [];
  page.on('pageerror', err => erros.push(err.message));
  await page.route('**/*', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<body style="margin:0;background:#ece8dc;font:16px system-ui;display:grid;grid-template-columns:1fr 1fr">' });
    try {
      const file = resolve(raiz, '.' + path);
      if (!file.startsWith(raiz)) throw Error('fora da raiz');
      await route.fulfill({ contentType: { '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' }[extname(file)] ?? 'text/plain', body: await readFile(file) });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('http://local/');
  const resultado = await page.evaluate(async () => {
    const { createCamera } = await import('/simulacao/src/render/iso/camera.js');
    const { createDiorama } = await import('/simulacao/src/render/iso/diorama.js');
    const { createLavoura } = await import('/simulacao/src/render/field/lavoura.js');
    const { simulateSeason, celulaDe } = await import('/simulacao/src/simulation/season.js');
    const { CULTURAS } = await import('/simulacao/src/domain/crops/catalogo.js');
    const { CENARIOS } = await import('/simulacao/src/domain/soil/scenarios.js');
    const { CLASSES_SOLO } = await import('/simulacao/src/domain/soil/presets.js');
    const crop = CULTURAS.soja, classe = Object.values(CLASSES_SOLO)[0];
    const width = 4.2, depth = 3.2, totalH = .9;
    const lavoura = createLavoura(crop, { width, depth });
    await lavoura.sprites.carregarArte();
    const sim = simulateSeason({ crop, classe, cenario: CENARIOS.referencia, plants: lavoura.plants, width, depth });
    const dia = 65, reg = sim.plantas[dia];
    lavoura.atualizar(dia / crop.cicloDias, reg);
    while (lavoura.pendentes) lavoura.processarFila(100);
    const bloco = createDiorama({ width, depth, totalH, profTotalM: .3, crop, resolucao: 256 });
    bloco.atualizar({ sim, dia, classe, modo: { tipo: 'real' }, lavoura, reg });
    for (let parede = 0; parede < 4; parede++) {
      const px = bloco.raizes.canvas.getContext('2d').getImageData(0, parede * 512, 1024, 512).data;
      if (!px.some((v, i) => i % 4 === 3 && v > 0)) throw Error(`Parede ${parede} sem raízes`);
    }
    const cam = createCamera();
    Object.assign(cam, { escala: 70, ox: 300, oy: 240 });
    let cliques = 0;
    for (let q = 0; q < 4; q++) {
      const section = document.createElement('section');
      section.innerHTML = `<p style="margin:12px">Vista ${q * 90}°</p>`;
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 440; section.append(canvas); document.body.append(section);
      const ctx = canvas.getContext('2d');
      bloco.desenharBloco(ctx, cam); lavoura.desenhar(ctx, cam, 0);
      const sx = cam.eixoX()[1] > 0 ? 1 : -1, sz = cam.eixoZ()[1] > 0 ? 1 : -1;
      for (const p of [[.37, 0, -.27], [sx * width / 2, -.6, .27], [.37, -.6, sz * depth / 2]]) {
        const hit = bloco.tocarSolo(...cam.proj(...p), cam);
        if (!hit || hit.celula !== celulaDe(p[0], p[2], width, depth)) throw Error(`Seleção incorreta ${q}: ${JSON.stringify(hit)}`);
        cliques++;
      }
      cam.girar();
    }
    return { vistas: 4, cliques, faces: bloco.perfil.faces.length };
  });
  assert.equal(resultado.faces, 4);
  assert.deepEqual(erros, []);
  const scratch = resolve(raiz, 'simulacao/scratch/rotacao'); await mkdir(scratch, { recursive: true });
  await page.screenshot({ path: resolve(scratch, 'vistas.png'), fullPage: true });
  console.log('OK: projeções inversas, retorno após 4 giros,', resultado);
} finally { await browser.close(); }
