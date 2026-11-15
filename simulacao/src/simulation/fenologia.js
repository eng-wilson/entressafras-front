// Fenologia: em que ponto do ciclo a cultura está e o que isso implica no dia.
// Hoje usa a fração de dias do ciclo (t = dia / dias). A troca por graus-dia acontece só aqui.
// Lê: crop.kc, crop.cobertura, crop.demanda, crop.morfologia.raizProfMax, crop.janelas.altura.
import { curve, smoothstep } from '../utils/math.js';

export function fenologia(dia, dias, crop, par) {
    const F = par.fenologia;
    const t = dia / dias;
    const tPrev = Math.max(0, (dia - 1) / dias);
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
