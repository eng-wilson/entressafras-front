// Servidor local do exemplo, sem dependências. Raiz limitada à pasta simulacao/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const porta = Number(process.argv[2] ?? 8081);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (pathname === '/') { res.writeHead(302, { Location: '/exemplo/' }).end(); return; }
        const relativo = pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : '');
        const arquivo = resolve(raiz, relativo);
        if (!arquivo.startsWith(resolve(raiz) + sep)) { res.writeHead(403).end(); return; }
        const bytes = await readFile(arquivo);
        res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(bytes);
    } catch { res.writeHead(404).end('Arquivo não encontrado'); }
}).listen(porta, '127.0.0.1', () => console.log(`Exemplo: http://127.0.0.1:${porta}/`));
