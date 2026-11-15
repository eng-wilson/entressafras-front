import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const raiz = resolve('.');

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log('LOG:', msg.text()));
page.on('pageerror', err => console.error('ERRO BROWSER:', err));

const html = `<!doctype html><html><body>
<script type="module">
import { CULTURAS } from '/simulacao/src/domain/crops/catalogo.js';
import { nomeSprite } from '/simulacao/src/render/sprites/manifest.js';
import { pintarGramineaTouceira } from '/simulacao/src/render/sprites/painters/graminea-touceira.js';
import { pintarLeguminosa } from '/simulacao/src/render/sprites/painters/leguminosa.js';

const PINTORES = {
    graminea_touceira: pintarGramineaTouceira,
    leguminosa_arbustiva: pintarLeguminosa,
    leguminosa_baixa: pintarLeguminosa,
    malvacea: pintarLeguminosa
};

function alturaDaFase(crop, fase) {
    const jan = crop.janelas?.altura ?? [0, 0.45];
    const u = Math.min(1, Math.max(0, (fase.t - jan[0]) / (jan[1] - jan[0])));
    const hMed = (crop.morfologia.alturaMax[0] + crop.morfologia.alturaMax[1]) / 2;
    return hMed * u * u * (3 - 2 * u) + 0.12;
}

window.exportarCultura = async function(cropId, baseFases, mapeamento) {
    const crop = CULTURAS[cropId];
    if (!crop) throw new Error('Cultura não encontrada: ' + cropId);
    const pintor = PINTORES[crop.sprites.pintor];
    if (!pintor) throw new Error('Sem pintor para: ' + crop.sprites.pintor);

    const bases = new Map();
    const resultadosPng = {};

    // 1. Renderizar os 5 sprites base
    for (const baseId of baseFases) {
        const faseIdx = crop.sprites.fases.findIndex(f => f.id === baseId);
        if (faseIdx < 0) throw new Error('Fase base não encontrada: ' + baseId);
        const fase = crop.sprites.fases[faseIdx];

        const s = pintor(crop, faseIdx, { postura: 0, espiga: 0, variante: 0 });
        const corData = s.cor.toDataURL('image/png');
        const dadosCanvas = document.createElement('canvas');
        dadosCanvas.width = s.larg; dadosCanvas.height = s.alt;
        dadosCanvas.getContext('2d').putImageData(new ImageData(s.dadosPx, s.larg, s.alt), 0, 0);
        const dadosData = dadosCanvas.toDataURL('image/png');

        resultadosPng[baseId + '.png'] = corData;
        resultadosPng[baseId + '.dados.png'] = dadosData;

        const altura = alturaDaFase(crop, fase);
        bases.set(baseId, {
            cor: baseId + '.png',
            dados: baseId + '.dados.png',
            ancora: s.ancora,
            resolucao: s.res,
            altura
        });
    }

    // 2. Gerar manifesto para todas as fases
    const sprites = {};
    for (let k = 0; k < crop.sprites.fases.length; k++) {
        const fase = crop.sprites.fases[k];
        const baseKey = mapeamento[fase.id] ?? baseFases[0];
        const base = bases.get(baseKey);
        if (!base) throw new Error('Mapeamento inválido para fase: ' + fase.id + ' -> ' + baseKey);
        const { altura, ...meta } = base;
        const resolucao = Math.round(base.resolucao * altura / alturaDaFase(crop, fase));
        for (let v = 0; v < 3; v++) {
            sprites[nomeSprite(crop, k, 0, 0, v)] = { ...meta, resolucao };
        }
    }

    return {
        cropId,
        resultadosPng,
        manifesto: { sprites }
    };
};
</script></body></html>`;

await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/export.html') {
        await route.fulfill({ status: 200, contentType: 'text/html', body: html });
        return;
    }
    try {
        const filePath = resolve(raiz, '.' + decodeURIComponent(url.pathname));
        const mime = {
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png'
        }[extname(filePath)] ?? 'text/plain';
        const body = await readFile(filePath);
        await route.fulfill({ status: 200, contentType: mime, body });
    } catch (e) {
        await route.fulfill({ status: 404, body: e.message });
    }
});

await page.goto('http://local/export.html');
await page.waitForFunction(() => typeof window.exportarCultura === 'function');

const configuracoes = [
    {
        id: 'brizantha_marandu',
        baseFases: ['E', 'PER', 'TOU', 'FL', 'SEM'],
        mapa: { E: 'E', PER: 'PER', TOU: 'TOU', AL: 'TOU', FL: 'FL', SEM: 'SEM', DES: 'SEM', PAL: 'SEM' }
    },
    {
        id: 'brizantha_piata',
        baseFases: ['E', 'PER', 'TOU', 'FL', 'SEM'],
        mapa: { E: 'E', PER: 'PER', TOU: 'TOU', AL: 'TOU', FL: 'FL', SEM: 'SEM', DES: 'SEM', PAL: 'SEM' }
    },
    {
        id: 'brizantha_paiaguas',
        baseFases: ['E', 'PER', 'TOU', 'FL', 'SEM'],
        mapa: { E: 'E', PER: 'PER', TOU: 'TOU', AL: 'TOU', FL: 'FL', SEM: 'SEM', DES: 'SEM', PAL: 'SEM' }
    },
    {
        id: 'ruziziensis',
        baseFases: ['E', 'PER', 'TAP', 'FL', 'SEM'],
        mapa: { E: 'E', PER: 'PER', TAP: 'TAP', AL: 'TAP', FL: 'FL', SEM: 'SEM', DES: 'SEM', PAL: 'SEM' }
    },
    {
        id: 'crotalaria_juncea',
        baseFases: ['E', 'V', 'FL', 'VAG', 'PAL'],
        mapa: { E: 'E', V: 'V', FL: 'FL', VAG: 'VAG', ROL: 'PAL', PAL: 'PAL' }
    },
    {
        id: 'crotalaria_spectabilis',
        baseFases: ['E', 'V', 'FL', 'VAG', 'PAL'],
        mapa: { E: 'E', V: 'V', FL: 'FL', VAG: 'VAG', ROL: 'PAL', PAL: 'PAL' }
    },
    {
        id: 'crotalaria_ochroleuca',
        baseFases: ['E', 'V', 'FL', 'VAG', 'PAL'],
        mapa: { E: 'E', V: 'V', FL: 'FL', VAG: 'VAG', ROL: 'PAL', PAL: 'PAL' }
    }
];

for (const cfg of configuracoes) {
    console.log(`\nExportando sprites para ${cfg.id}...`);
    const res = await page.evaluate(
        ({ id, baseFases, mapa }) => window.exportarCultura(id, baseFases, mapa),
        cfg
    );

    const pastaCrop = resolve(raiz, `simulacao/assets/sprites/${cfg.id}`);
    await mkdir(pastaCrop, { recursive: true });

    for (const [nome, dataUri] of Object.entries(res.resultadosPng)) {
        const buf = Buffer.from(dataUri.split(',')[1], 'base64');
        await writeFile(resolve(pastaCrop, nome), buf);
    }
    await writeFile(resolve(pastaCrop, 'manifest.json'), JSON.stringify(res.manifesto, null, 2) + '\n');
    console.log(`Concluído ${cfg.id}: ${Object.keys(res.resultadosPng).length} PNGs gerados, manifesto com ${Object.keys(res.manifesto.sprites).length} entradas.`);
}

await browser.close();
console.log('\nTodas as 7 coberturas exportadas com sucesso!');
