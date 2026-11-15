// Fenologia: em que ponto do ciclo a cultura está e o que isso implica no dia.
// Na safra, usa soma térmica acumulada; aceita fração por dias no modo de comparação histórica.
// Lê: crop.kc, crop.cobertura, crop.demanda, crop.morfologia.raizProfMax, crop.janelas.altura.
import { curve, smoothstep, clamp } from '../utils/math.js';

// Acumulação desde o plantio, sem usar a temperatura futura para normalizar o ciclo.
// Os valores padrão são didáticos, não exigências térmicas de cultivares.
export function progressoTermico(clima, dias, crop, par) {
    const F = par.fenologia, cfg = crop.termica ?? {};
    const base = cfg.baseC ?? crop.limites.tFrio;
    const teto = cfg.tetoC ?? F.tetoC;
    const referencia = cfg.referenciaC ?? F.referenciaC;
    const alvo = cfg.grausDiaCiclo ?? (referencia - base) * dias;
    if (![base, teto, alvo].every(Number.isFinite) || teto <= base || alvo <= 0) throw new Error('Parâmetros térmicos inválidos');
    const progresso = new Float64Array(dias + 1), acumulado = new Float64Array(dias + 1);
    for (let d = 1; d <= dias; d++) {
        const tx = clima.tmax[d - 1], tn = clima.tmin[d - 1];
        if (!Number.isFinite(tx) || !Number.isFinite(tn) || tx < tn) throw new Error(`Temperatura inválida no dia ${d - 1}`);
        const gd = Math.max(0, Math.min(teto, (tx + tn) / 2) - base);
        acumulado[d] = acumulado[d - 1] + gd;
        progresso[d] = F.modo === 'dias' ? d / dias : clamp(acumulado[d] / alvo);
    }
    return { progresso, acumulado, baseC: base, tetoC: teto, alvo };
}

export function fenologia(dia, dias, crop, par, termica = null) {
    const F = par.fenologia;
    const t = termica ? termica.progresso[dia] : dia / dias;
    const tPrev = termica ? termica.progresso[Math.max(0, dia - 1)] : Math.max(0, (dia - 1) / dias);
    const emergiu = t > F.emergencia;
    const [h0, h1] = crop.janelas.altura;
    return {
        t, tPrev, emergiu,
        kc: emergiu ? curve(crop.kc, t) : 0,                  // coeficiente de cultura (transpiração)
        cob: curve(crop.cobertura, t),                        // cobertura do dossel, 0..1
        raizPot: emergiu ? F.raizInicialM + crop.morfologia.raizProfMax * smoothstep(F.raizJanela[0], F.raizJanela[1], t) : 0,
        dPot: smoothstep(h0, h1, t) - smoothstep(h0, h1, tPrev),   // crescimento potencial do dia (fração da altura)
        req: F.demandaBase + F.demandaGanho * curve(crop.demanda, t)   // exigência de nutrientes
    };
}
