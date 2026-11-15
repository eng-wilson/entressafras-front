import assert from 'node:assert/strict';
import { readdir, readFile, access, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
async function listar(pasta) {
    const itens = await readdir(pasta, { withFileTypes: true });
    return (await Promise.all(itens.map(i => i.isDirectory() ? listar(join(pasta, i.name)) : join(pasta, i.name)))).flat();
}
const dentro = alvo => assert.ok(alvo === resolve(raiz) || alvo.startsWith(resolve(raiz) + sep), `Dependência externa: ${alvo}`);
let imports = 0, imagens = 0;
for (const arquivo of await listar(raiz)) {
    if (/\.(js|mjs|css)$/.test(arquivo) && !arquivo.includes(`${sep}test${sep}`)) {
        const texto = await readFile(arquivo, 'utf8');
        const regex = arquivo.endsWith('.css') ? /@import\s+['"]([^'"]+)['"]/g : /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
        for (const match of texto.matchAll(regex)) {
            const alvo = resolve(dirname(arquivo), match[1]);
            dentro(alvo); await access(alvo); imports++;
        }
        for (const match of texto.matchAll(/new URL\(['"](\.[^'"]+)['"], import.meta.url\)/g)) {
            const alvo = resolve(dirname(arquivo), match[1]); dentro(alvo); await access(alvo);
        }
    }
    if (arquivo.endsWith('manifest.json')) {
        const manifesto = JSON.parse(await readFile(arquivo, 'utf8'));
        for (const sprite of Object.values(manifesto.sprites)) {
            for (const imagem of [sprite.cor, sprite.dados]) {
                const alvo = resolve(dirname(arquivo), imagem); dentro(alvo); await access(alvo); imagens++;
            }
        }
    }
}
// Copiar para fora do repositório detecta dependências ocultas do projeto hospedeiro.
const temporaria = await mkdtemp(join(tmpdir(), 'farmatro-portabilidade-'));
try {
    const destino = join(temporaria, 'pasta-renomeada');
    await cp(raiz, destino, { recursive: true });
    const api = await import(pathToFileURL(join(destino, 'index.js')).href);
    assert.equal(typeof api.criarSimulacao, 'function');
    const classeId = 'latossolo_vermelho';
    const { safras } = api.simulateRotacao({ rotacao: api.ROTACOES.soja_milho, sementes: [2023, 2024], classe: api.CLASSES_SOLO[classeId], solo: api.soloLocal(), fonteClima: api.fonteSintetica(), retratos: c => c === 1 });
    assert.ok(safras.length >= 2);
    const safra = safras.find(s => s.ciclo === 1);
    assert.ok(safra.sim.plantas.length > 0);
    assert.ok(Number.isFinite(safra.resumo.produtividade));
    console.log(`OK: ${imports} imports internos, ${imagens} referências de imagens e rotação executada fora do repositório.`);
} finally {
    // Só remove a pasta temporária criada acima, com caminho absoluto validado.
    assert.ok(resolve(temporaria).startsWith(resolve(tmpdir()) + sep));
    assert.ok(temporaria.includes('farmatro-portabilidade-'));
    await rm(temporaria, { recursive: true, force: true });
}
