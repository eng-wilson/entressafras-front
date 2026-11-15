// Pinturas de tecido aplicadas somente à máscara FOLHA; a anatomia original é preservada.
import { IDX } from '../../domain/channels.js';
let atlas = null, pedido = null;
export const versaoDanos = () => atlas ? 1 : 0;
export function carregarDanos() {
    if (!pedido) pedido = new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas'); c.width = 384; c.height = 256;
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            atlas = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            resolve(true);
        };
        img.onerror = () => { console.warn('Atlas de danos indisponível; sintomas por cor permanecem ativos.'); resolve(false); };
        img.src = new URL('../../../assets/sprites/danos/atlas.png', import.meta.url).href;
    });
    return pedido;
}
export function pintarDanos(px, sprite, est) {
    if (!atlas || est.modo !== 'real') return;
    const g = est.ganho ?? 1, ag = est.ag, cr = est.cr;
    const pesos = [Math.max(ag[IDX.agua_deficit], cr[IDX.agua_deficit]) * g,
        cr[IDX.N] * g, cr[IDX.K] * g, est.pragas?.percevejo ?? 0,
        est.pragas?.nematoide ?? 0, Math.max(ag[IDX.calor], cr[IDX.calor]) * g];
    if (!pesos.some(v => v > 0)) return;
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 4 || sprite.dadosPx[i + 3] < 90 || sprite.dadosPx[i + 2] >> 5 !== 1) continue;
        // A máscara automática pode confundir pétalas creme/rosadas com folhas.
        // A pintura nova só entra em tecido originalmente verde.
        if (sprite.corPx[i + 1] <= sprite.corPx[i] * 1.04 || sprite.corPx[i + 1] <= sprite.corPx[i + 2] * 1.12) continue;
        const u = sprite.dadosPx[i] / 255, v = sprite.dadosPx[i + 1] / 255;
        const idade = (sprite.dadosPx[i + 2] & 31) / 31;
        const tom = Math.max(.55, Math.min(1.3, (sprite.corPx[i] + sprite.corPx[i + 1] + sprite.corPx[i + 2]) / 360));
        for (let k = 0; k < 6; k++) {
            const peso = Math.min(.85, Math.max(0, pesos[k]) * .85) *
                (k === 1 ? .25 + .75 * idade : k === 2 ? .15 + .85 * v : 1);
            if (!peso) continue;
            const x = Math.min(127, Math.floor(v * 127)), y = Math.min(127, Math.floor(u * 127));
            const a = ((Math.floor(k / 3) * 128 + y) * 384 + k % 3 * 128 + x) * 4;
            // Sucção e clorose radicular imprimem lesões/halos; o fundo verde do
            // atlas não deve deixar uma planta atacada mais verde que a saudável.
            if ((k === 3 || k === 4) && atlas[a] < atlas[a + 1] * .94) continue;
            for (let c = 0; c < 3; c++) px[i + c] += (atlas[a + c] * tom - px[i + c]) * peso;
        }
    }
}
