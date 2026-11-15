// Recorte mecânico das pranchas pintadas; não desenha nem substitui a arte por geometria.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const saida = resolve(raiz, 'simulacao/scratch/coberturas');
const grama = { E: 'E', PER: 'PER', TOU: 'TOU', AL: 'TOU', FL: 'FL', SEM: 'SEM', DES: 'SEM', PAL: 'SEM' };
const leguminosa = { E: 'E', V: 'V', FL: 'FL', VAG: 'VAG', ROL: 'MAT', PAL: 'MAT' };
const culturas = [
  ...['marandu', 'piata', 'paiaguas'].map(v => ({ id: `brizantha_${v}`, fases: ['E', 'PER', 'TOU', 'FL', 'SEM'], mapa: grama })),
  { id: 'ruziziensis', fases: ['E', 'PER', 'TAP', 'FL', 'SEM'], mapa: { ...grama, TAP: 'TAP', AL: 'TAP' } },
  ...['juncea', 'spectabilis', 'ochroleuca'].map(v => ({ id: `crotalaria_${v}`, fases: ['E', 'V', 'FL', 'VAG', 'MAT'], mapa: leguminosa }))
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const erros = [];
  page.on('pageerror', err => erros.push(err.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body>' });
    const arquivo = resolve(raiz, '.' + decodeURIComponent(url.pathname));
    if (!arquivo.startsWith(raiz.endsWith(sep) ? raiz : raiz + sep)) return route.fulfill({ status: 403, body: '' });
    try {
      const mime = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' }[extname(arquivo)];
      await route.fulfill({ contentType: mime ?? 'text/plain', body: await readFile(arquivo) });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('http://sprites.local/');
  await page.evaluate(async () => {
    window.culturas = (await import('/simulacao/src/domain/crops/catalogo.js')).CULTURAS;
    window.mascaras = await import('/simulacao/src/render/sprites/mask.js');
    window.manifestos = await import('/simulacao/src/render/sprites/manifest.js');
    window.sintomas = await import('/simulacao/src/render/sprites/symptoms.js');
    window.canais = await import('/simulacao/src/domain/channels.js');
    window.campo = await import('/simulacao/src/render/field/lavoura.js');
    document.body.style.cssText = 'margin:24px;background:#ece8dc;font:16px system-ui;color:#24251d';
  });
  await mkdir(saida, { recursive: true });
  const resultados = [];
  for (const cfg of culturas) {
    const pasta = resolve(raiz, 'simulacao/assets/sprites', cfg.id);
    const resultado = await page.evaluate(async cfg => {
      const crop = window.culturas[cfg.id];
      const img = new Image();
      img.src = `/simulacao/assets/sprites/${cfg.id}/fases-pintadas.png`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const dados = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = dados.data;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const min = Math.min(px[i], px[i + 1], px[i + 2]);
        const max = Math.max(px[i], px[i + 1], px[i + 2]);
        // Mesmo isolamento do fundo branco usado nas pranchas de milheto/sorgo.
        if (min > 246 && max - min < 10) px[i + 3] = 0;
      }
      ctx.putImageData(dados, 0, 0);
      // Componentes conectados evitam cortar pontas que ultrapassam a coluna
      // vizinha sem tocar a outra planta. Não altera os pixels da pintura.
      const labels = new Int32Array(canvas.width * canvas.height);
      const queue = new Int32Array(labels.length), componentes = [];
      for (let pixel = 0; pixel < labels.length; pixel++) {
        if (labels[pixel] || px[pixel * 4 + 3] <= 16) continue;
        const label = componentes.length + 1;
        let head = 0, tail = 1;
        queue[0] = pixel; labels[pixel] = label;
        const comp = { label, count: 0, x0: canvas.width, x1: 0, y0: canvas.height, y1: 0 };
        while (head < tail) {
          const p = queue[head++], x = p % canvas.width, y = Math.floor(p / canvas.width);
          comp.count++; comp.x0 = Math.min(comp.x0, x); comp.x1 = Math.max(comp.x1, x);
          comp.y0 = Math.min(comp.y0, y); comp.y1 = Math.max(comp.y1, y);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy, next = ny * canvas.width + nx;
            if (nx < 0 || nx >= canvas.width || ny < 0 || ny >= canvas.height || labels[next] || px[next * 4 + 3] <= 16) continue;
            labels[next] = label; queue[tail++] = next;
          }
        }
        componentes.push(comp);
      }
      const principais = [...componentes].sort((a, b) => b.count - a.count).slice(0, 5).sort((a, b) => a.x0 - b.x0);
      if (principais.length !== 5 || principais.some(c => c.count < 300)) throw new Error(`${cfg.id}: cinco plantas não identificadas`);
      const dono = new Map(principais.map((c, n) => [c.label, n]));
      for (const c of componentes) if (!dono.has(c.label)) {
        const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
        const distancias = principais.map(p => Math.max(p.x0 - cx, 0, cx - p.x1) ** 2 + Math.max(p.y0 - cy, 0, cy - p.y1) ** 2);
        dono.set(c.label, distancias.indexOf(Math.min(...distancias)));
      }
      const grupos = principais.map((_, n) => {
        const membros = componentes.filter(c => dono.get(c.label) === n);
        return [Math.min(...membros.map(c => c.x0)), Math.max(...membros.map(c => c.x1)) + 1,
          Math.min(...membros.map(c => c.y0)), Math.max(...membros.map(c => c.y1))];
      });
      const altura = fase => {
        const janela = crop.janelas.altura;
        const u = Math.max(0, Math.min(1, (fase.t - janela[0]) / (janela[1] - janela[0])));
        return (crop.morfologia.alturaMax[0] + crop.morfologia.alturaMax[1]) / 2 * u * u * (3 - 2 * u) + .12;
      };
      const arquivos = {}, bases = {}, cortes = [];
      for (let n = 0; n < grupos.length; n++) {
        const [x0, x1, y0, y1] = grupos[n];
        const cor = document.createElement('canvas');
        cor.width = x1 - x0 + 8; cor.height = y1 - y0 + 9;
        const isolada = cor.getContext('2d').createImageData(cor.width, cor.height);
        for (let y = y0; y <= y1; y++) for (let x = x0; x < x1; x++) {
          const origem = y * canvas.width + x;
          if (dono.get(labels[origem]) === n) isolada.data.set(px.subarray(origem * 4, origem * 4 + 4), ((y - y0 + 4) * cor.width + x - x0 + 4) * 4);
        }
        cor.getContext('2d').putImageData(isolada, 0, 0);
        const cp = cor.getContext('2d').getImageData(0, 0, cor.width, cor.height).data;
        let soma = 0, qtd = 0;
        for (let y = Math.max(4, cor.height - 14); y < cor.height - 4; y++) for (let x = 0; x < cor.width; x++) {
          if (cp[(y * cor.width + x) * 4 + 3] > 128) { soma += x; qtd++; }
        }
        const ancora = [qtd ? Math.round(soma / qtd) : Math.round(cor.width / 2), cor.height - 5];
        const id = cfg.fases[n];
        const fase = crop.sprites.fases.find(f => f.id === (id === 'MAT' ? 'VAG' : id));
        const resolucao = Math.max(1, Math.round((y1 - y0 + 1) / altura(fase)));
        const sprite = window.mascaras.spriteDeImagens(cor, null, { ancora, res: resolucao, semBranco: crop.archetype.startsWith('graminea') });
        const mask = document.createElement('canvas');
        mask.width = cor.width; mask.height = cor.height;
        mask.getContext('2d').putImageData(new ImageData(sprite.dadosPx, mask.width, mask.height), 0, 0);
        arquivos[`arte-${id}.png`] = sprite.cor.toDataURL();
        arquivos[`arte-${id}.dados.png`] = mask.toDataURL();
        bases[id] = { cor: `arte-${id}.png`, dados: `arte-${id}.dados.png`, ancora, resolucao, altura: altura(fase) };
        cortes.push({ fase: id, limites: [x0, y0, x1, y1], largura: cor.width, altura: cor.height, ancora });
      }
      const sprites = {};
      crop.sprites.fases.forEach((fase, k) => {
        const { altura: h, ...base } = bases[cfg.mapa[fase.id]];
        for (let v = 0; v < 3; v++) sprites[window.manifestos.nomeSprite(crop, k, 0, 0, v)] = { ...base, resolucao: Math.max(1, Math.round(base.resolucao * h / altura(fase))) };
      });
      return { arquivos, manifesto: { sprites }, cortes };
    }, cfg);
    for (const [nome, uri] of Object.entries(resultado.arquivos)) await writeFile(resolve(pasta, nome), Buffer.from(uri.split(',')[1], 'base64'));
    await writeFile(resolve(pasta, 'manifest.json'), JSON.stringify(resultado.manifesto, null, 2) + '\n');
    resultados.push({ cultura: cfg.id, cortes: resultado.cortes });
  }
  // Valida o loader real, todas as posturas/estados reprodutivos e os sintomas.
  for (const cfg of culturas) {
    const validacao = await page.evaluate(async id => {
      const crop = window.culturas[id], set = window.manifestos.createSpriteSet(crop);
      const carregados = await set.carregarArte();
      const compositor = window.sintomas.createCompositor({ max: 16 });
      let combinacoes = 0, sintomas = 0;
      const { NCANAIS, IDX } = window.canais;
      for (let k = 0; k < crop.sprites.fases.length; k++) {
        const f = crop.sprites.fases[k];
        const repro = f.espiga || f.vagem || f.fruto || f.capulho || f.inflorescencia;
        for (let p = 0; p < 3; p++) for (let e = 0; e < (repro ? 3 : 1); e++) for (let v = 0; v < 3; v++) {
          const s = set.obter(k, p, e, v);
          if (!s.chave.startsWith('arte:')) throw new Error(`${id}: fallback procedural ${s.chave}`);
          if (s.cor.width !== s.larg || s.dadosPx.length !== s.larg * s.alt * 4) throw new Error('Dimensões incompatíveis');
          const rgba = s.cor.getContext('2d').getImageData(0, 0, s.larg, s.alt).data;
          let visiveis = 0;
          for (let i = 3; i < rgba.length; i += 4) {
            if (rgba[i] !== s.dadosPx[i]) throw new Error(`${id}: alpha divergente`);
            if (rgba[i]) visiveis++;
          }
          if (!visiveis || rgba[3]) throw new Error('Sprite vazio ou fundo opaco');
          for (const canal of ['agua_deficit', 'N', 'S', 'K']) {
            const ag = new Float32Array(NCANAIS), cr = new Float32Array(NCANAIS);
            ag[IDX[canal]] = .7; cr[IDX[canal]] = .5;
            compositor.compor(s, { modo: 'real', ag, cr, ganho: 1, senesc: 0 }); sintomas++;
          }
          combinacoes++;
        }
      }
      const { P } = window.canais;
      const lavoura = window.campo.createLavoura(crop, { width: 4.2, depth: 4.2 });
      await lavoura.sprites.carregarArte();
      const reg = new Float32Array(lavoura.plants.length * P.STRIDE);
      for (let i = 0; i < lavoura.plants.length; i++) {
        reg[i * P.STRIDE + P.CRESC] = 1; reg[i * P.STRIDE + P.ESPIGA] = 1;
      }
      let plantasVerificadas = 0;
      const secao = document.createElement('section');
      secao.style.cssText = 'margin-bottom:22px;padding:16px;background:#faf9f4;border-radius:12px';
      const titulo = document.createElement('h2'); titulo.textContent = crop.nome; secao.append(titulo);
      const linha = document.createElement('div'); linha.style.cssText = 'display:flex;gap:20px'; secao.append(linha); document.body.append(secao);
      for (const estresse of [0, .7]) {
        for (let i = 0; i < lavoura.plants.length; i++) {
          reg[i * P.STRIDE + P.AGUDO + IDX.agua_deficit] = estresse;
          reg[i * P.STRIDE + P.CRONICO + IDX.agua_deficit] = estresse * .5;
        }
        for (const fase of crop.sprites.fases) {
          lavoura.atualizar(fase.t + .001, reg, { modo: 'real', ganho: 1 });
          let tentativas = 0;
          while (lavoura.pendentes && tentativas++ < 200) lavoura.processarFila(100);
          if (lavoura.pendentes) throw new Error(`${id}: fila de lavoura incompleta`);
          for (const planta of lavoura.plants) {
            if (!planta.vis?.spr.chave.startsWith('arte:')) throw new Error(`${id}: planta sem arte em ${fase.id}`);
            plantasVerificadas++;
          }
        }
        lavoura.atualizar(crop.sprites.fases.find(f => f.id === 'FL').t + .001, reg, { modo: 'real', ganho: 1 });
        while (lavoura.pendentes) lavoura.processarFila(100);
        const figura = document.createElement('figure'); figura.style.margin = '0'; linha.append(figura);
        const legenda = document.createElement('figcaption'); legenda.textContent = estresse ? 'Déficit hídrico · 0,7' : 'Sem estresse'; figura.append(legenda);
        const tela = document.createElement('canvas'); tela.width = 620; tela.height = 390; figura.append(tela);
        const ctx = tela.getContext('2d');
        const cam = { escala: 66, dpr: 1, proj: (x, y, z) => [310 + (x - z) * 66 * .866, 235 + (x + z) * 33 - y * 66] };
        ctx.fillStyle = '#785c37'; ctx.beginPath();
        [[-2.1,-2.1],[2.1,-2.1],[2.1,2.1],[-2.1,2.1]].forEach(([x,z], i) => { const p = cam.proj(x,0,z); if (i) ctx.lineTo(...p); else ctx.moveTo(...p); });
        ctx.closePath(); ctx.fill(); lavoura.desenhar(ctx, cam, 0);
      }
      return { carregados, combinacoes, sintomas, plantasVerificadas };
    }, cfg.id);
    assert.equal(validacao.carregados, Object.keys(JSON.parse(await readFile(resolve(raiz, 'simulacao/assets/sprites', cfg.id, 'manifest.json'))).sprites).length);
    Object.assign(resultados.find(r => r.cultura === cfg.id), validacao);
    console.log(cfg.id, validacao);
  }
  assert.deepEqual(erros, []);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.screenshot({ path: resolve(saida, 'galeria.png'), fullPage: true });
  await writeFile(resolve(saida, 'validacao.json'), JSON.stringify(resultados, null, 2) + '\n');
} finally { await browser.close(); }
