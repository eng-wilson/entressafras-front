// Intensidades exclusivamente visuais; não alteram a simulação nem classificam risco agronômico.
import { clamp } from '../utils/math.js';
import { IDX } from '../domain/channels.js';

export function climaVisual(sim, dia) {
    const chuva = Math.max(0, sim.clima?.chuva?.[dia] ?? 0);
    const serie = sim.impacto?.serie?.[dia];
    const deficit = clamp(serie?.agudo?.[IDX.agua_deficit] ?? 0);
    const calor = clamp(serie?.agudo?.[IDX.calor] ?? 0);
    const molhado = clamp(chuva / 30);
    const seca = Math.max(deficit, calor * 0.65) * (1 - molhado);
    return { chuva, molhado, seca };
}

// rotulo: false omite a etiqueta de clima no topo (o hospedeiro mostra a sua no mesmo lugar).
export function desenharCeu(ctx, largura, altura, clima, { rotulo: comRotulo = true } = {}) {
    const { seca, molhado } = clima;
    const cor = (normal, quente, fria) => `rgb(${normal.map((v, i) => Math.round(v + (quente[i] - v) * seca + (fria[i] - v) * molhado)).join(',')})`;
    const fundo = ctx.createLinearGradient(0, 0, 0, altura);
    fundo.addColorStop(0, cor([237, 245, 248], [236, 143, 56], [62, 87, 117]));
    fundo.addColorStop(0.6, cor([247, 249, 246], [255, 218, 137], [159, 190, 213]));
    fundo.addColorStop(1, cor([233, 239, 234], [241, 207, 153], [216, 232, 240]));
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, largura, altura);
    if (seca > 0.05) {
        const x = largura * 0.78, y = altura * 0.18, raio = Math.min(largura, altura) * 0.32;
        const sol = ctx.createRadialGradient(x, y, 0, x, y, raio);
        sol.addColorStop(0, `rgba(255,255,216,${seca})`);
        sol.addColorStop(0.2, `rgba(255,236,128,${seca * 0.9})`);
        sol.addColorStop(1, 'rgba(255,185,65,0)');
        ctx.fillStyle = sol;
        ctx.fillRect(0, 0, largura, altura);
    }
    if (!comRotulo) return;
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
    ctx.strokeStyle = `rgba(218,242,255,${0.35 + clima.molhado * 0.4})`;
    ctx.lineWidth = 1 + clima.molhado;
    ctx.beginPath();
    const n = Math.round(18 + 100 * clima.molhado);
    for (let i = 0; i < n; i++) {
        const x = ((i * 137.508 - tempo * 65) % (largura + 40) + largura + 40) % (largura + 40) - 20;
        const y = (i * 73.31 + tempo * 370) % (altura + 35) - 35;
        const comprimento = 8 + clima.molhado * 18;
        ctx.moveTo(x, y); ctx.lineTo(x - comprimento * 0.3, y + comprimento);
    }
    ctx.stroke();
    ctx.restore();
}
