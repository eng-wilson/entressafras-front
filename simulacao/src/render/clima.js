// Intensidades exclusivamente visuais; não alteram a simulação nem classificam risco agronômico.
import { clamp } from '../utils/math.js';
import { IDX } from '../domain/channels.js';
import { fbm } from '../utils/noise.js';

export function climaVisual(sim, dia) {
    const chuva = Math.max(0, sim.clima?.chuva?.[dia] ?? 0);
    const serie = sim.impacto?.serie?.[dia];
    const deficit = clamp(serie?.agudo?.[IDX.agua_deficit] ?? 0);
    const calor = clamp(serie?.agudo?.[IDX.calor] ?? 0);
    const molhado = clamp(chuva / 30);
    const seca = Math.max(deficit, calor * 0.65) * (1 - molhado);
    const tmax = sim.clima?.tmax?.[dia];
    const frio = Number.isFinite(tmax) ? clamp((18 - tmax) / 14) * (1 - molhado) : 0;
    return { chuva, molhado, seca, frio };
}

// Céu diurno inspirado no app Tempo: zênite profundo, horizonte luminoso e luz atmosférica.
// Sem horário/nuvens observados, não inferimos noite, trovoadas ou nebulosidade em dias sem chuva.
const CEUS = {
    aberto: [[39, 113, 185], [64, 142, 204], [107, 176, 220], [162, 204, 230], [207, 226, 235]],
    seca: [[79, 121, 159], [135, 157, 164], [203, 181, 143], [238, 199, 140], [248, 219, 172]],
    chuva: [[66, 88, 114], [91, 115, 140], [129, 153, 174], [166, 186, 202], [202, 215, 225]],
    intensa: [[29, 44, 66], [45, 63, 86], [72, 92, 116], [112, 137, 158], [164, 185, 202]],
    frio: [[85, 123, 161], [118, 152, 182], [154, 183, 205], [191, 211, 225], [225, 235, 241]],
};
const misturar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

let atlasNuvens;
// Volume e iluminação pré-calculados: o ruído não é recalculado a cada quadro.
function nuvens() {
    if (atlasNuvens) return atlasNuvens;
    const w = 384, h = 192;
    atlasNuvens = [false, true].map(escura => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h);
        const densidade = (x, y) => {
            const ondulacao = fbm(x * 2.1 + 4, y * 2.1, 3);
            const massa = fbm(x * 5 + ondulacao * 1.5, y * 4.5, 5);
            return clamp((massa - 0.27 - Math.max(0, y - 0.18) * 0.39) * 4.2);
        };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const u = x / w, v = y / h;
            const massa = densidade(u, v);
            const relevo = clamp(0.5 + (densidade(u - 0.012, v - 0.018) - massa) * 4);
            const detalhe = fbm(u * 22 + 10, v * 20, 3);
            const luz = clamp(0.15 + relevo * 0.55 + detalhe * 0.3);
            const base = escura ? [27, 42, 62] : [105, 126, 146];
            const alcance = escura ? [58, 64, 70] : [111, 111, 105];
            const o = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) img.data[o + c] = base[c] + luz * alcance[c];
            img.data[o + 3] = massa * 255 * (1 - clamp((v - 0.68) / 0.32));
        }
        ctx.putImageData(img, 0, 0);
        return canvas;
    });
    return atlasNuvens;
}

function desenharAtmosferaChuvosa(ctx, largura, altura, molhado, tempo) {
    const presenca = clamp(molhado * 4), forte = clamp((molhado - 0.2) / 0.8);
    const [claras, escuras] = nuvens();
    ctx.save();
    // Bancos sobrepostos com velocidades diferentes, iluminados por uma abertura lateral.
    for (let camada = 0; camada < 2; camada++) {
        const deslocamento = Math.sin(tempo * 0.028 + camada * 2) * largura * 0.025;
        const x = -largura * 0.12 + deslocamento;
        const y = camada ? -altura * 0.19 : -altura * 0.04;
        ctx.globalAlpha = presenca * (camada ? 0.68 : 0.88);
        ctx.drawImage(claras, x, y, largura * 1.26, altura * (camada ? 0.73 : 0.62));
        ctx.globalAlpha *= forte * 0.94;
        ctx.drawImage(escuras, x, y, largura * 1.26, altura * (camada ? 0.73 : 0.62));
    }
    ctx.globalAlpha = 1;
    // Luz filtrada na abertura das nuvens, sem disco solar em céu fechado.
    ctx.translate(largura * 0.77, altura * 0.28);
    ctx.scale(largura * 0.62, altura * 0.48);
    const luz = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    luz.addColorStop(0, `rgba(218,232,240,${presenca * (0.3 - forte * 0.15)})`);
    luz.addColorStop(0.4, `rgba(179,204,221,${presenca * 0.1})`);
    luz.addColorStop(1, 'rgba(179,204,221,0)');
    ctx.fillStyle = luz; ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
    // Cortinas distantes: faixas largas e irregulares de precipitação no horizonte.
    ctx.save();
    for (let i = 0; i < 5; i++) {
        const x = largura * (i * 0.26 - 0.1) + Math.sin(i * 2.7) * largura * 0.08;
        const raio = largura * (0.1 + (i % 3) * 0.04);
        ctx.save(); ctx.translate(x, altura * 0.5); ctx.transform(1, 0, -0.16, 1, 0, 0); ctx.scale(raio, altura * 0.65);
        const nevoa = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        nevoa.addColorStop(0, `rgba(182,205,221,${presenca * (0.05 + forte * 0.1)})`);
        nevoa.addColorStop(1, 'rgba(182,205,221,0)');
        ctx.fillStyle = nevoa; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    ctx.restore();
}

export function paletaCeu({ seca = 0, molhado = 0, frio = 0 }) {
    return CEUS.aberto.map((cor, i) => {
        const seco = misturar(cor, CEUS.seca[i], clamp(seca));
        const frioSeco = misturar(seco, CEUS.frio[i], clamp(frio));
        const chuvoso = misturar(CEUS.chuva[i], CEUS.intensa[i], clamp((molhado - 0.45) / 0.55));
        return misturar(frioSeco, chuvoso, clamp(molhado * 2.5)).map(Math.round);
    });
}

export function interpolarClima(anterior, alvo, dt) {
    if (!anterior) return { ...alvo };
    const t = 1 - Math.exp(-Math.max(0, dt) / 180);
    return Object.fromEntries(['chuva', 'molhado', 'seca', 'frio'].map(k =>
        [k, (anterior[k] ?? 0) + ((alvo[k] ?? 0) - (anterior[k] ?? 0)) * t]));
}

// rotulo: false omite a etiqueta de clima no topo (o hospedeiro mostra a sua no mesmo lugar).
export function desenharCeu(ctx, largura, altura, clima, { rotulo: comRotulo = true, tempo = 0 } = {}) {
    const { seca, molhado } = clima;
    const cores = paletaCeu(clima);
    const fundo = ctx.createLinearGradient(0, 0, 0, altura);
    [0, 0.24, 0.52, 0.78, 1].forEach((p, i) => fundo.addColorStop(p, `rgb(${cores[i].join(',')})`));
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, largura, altura);
    const luz = (1 - clamp(molhado * 8)) * (1 - (clima.frio ?? 0) * 0.6);
    if (luz > 0.01) {
        const x = largura * 0.76, y = altura * 0.13, raio = Math.min(largura, altura) * (0.62 + seca * 0.22);
        const sol = ctx.createRadialGradient(x, y, 0, x, y, raio);
        sol.addColorStop(0, `rgba(255,253,225,${luz * 0.95})`);
        sol.addColorStop(0.08, `rgba(255,246,211,${luz * 0.6})`);
        sol.addColorStop(0.32, `rgba(255,230,178,${luz * (0.15 + seca * 0.18)})`);
        sol.addColorStop(1, 'rgba(255,233,193,0)');
        ctx.fillStyle = sol;
        ctx.fillRect(0, 0, largura, altura);
    }
    if (molhado > 0.01) desenharAtmosferaChuvosa(ctx, largura, altura, molhado, tempo);
    if (!comRotulo) return;
    desenharRotuloClima(ctx, largura, clima);
}

export function desenharRotuloClima(ctx, largura, clima) {
    const { seca } = clima;
    const rotulo = seca > 0.7 ? 'Seca intensa' : seca > 0.25 ? 'Estresse por seca / calor' : clima.chuva >= 30 ? 'Chuva intensa' : clima.chuva >= 0.2 ? 'Chuva' : 'Sem chuva';
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    const texto = `${rotulo} · ${clima.chuva.toFixed(1).replace('.', ',')} mm/dia`;
    const etiquetaLargura = ctx.measureText(texto).width + 20;
    const etiquetaX = Math.max(8, (largura - etiquetaLargura) / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(etiquetaX, 12, etiquetaLargura, 28);
    ctx.fillStyle = '#293c47';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, etiquetaX + 10, 26);
    ctx.restore();
}

export function desenharChuva(ctx, largura, altura, clima, tempo) {
    if (clima.chuva < 0.2) return;
    ctx.save();
    // Três planos: gotas finas ao longe, traços médios e poucas gotas próximas.
    for (let plano = 0; plano < 3; plano++) {
    ctx.strokeStyle = `rgba(218,242,255,${(0.12 + plano * 0.1) * (0.65 + clima.molhado * 0.35)})`;
    ctx.lineWidth = 0.65 + plano * 0.55;
    ctx.beginPath();
    const n = Math.round((24 + 100 * clima.molhado) * (1 - plano * 0.32));
    for (let i = 0; i < n; i++) {
        const x = ((i * 137.508 + plano * 71.3 - tempo * (30 + plano * 35)) % (largura + 40) + largura + 40) % (largura + 40) - 20;
        const y = (i * 73.31 + plano * 131 + tempo * (180 + plano * 170)) % (altura + 55) - 55;
        const comprimento = (5 + clima.molhado * 12) * (0.65 + plano * 0.7);
        ctx.moveTo(x, y); ctx.lineTo(x - comprimento * 0.3, y + comprimento);
    }
    ctx.stroke();
    }
    ctx.restore();
}
