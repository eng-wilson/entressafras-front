// Cenários de safra: clima diário + estado inicial do solo.
// u, v = posição no talhão normalizada (0..1). d = profundidade em metros.
import { smoothNoise, smoothstep, clamp, mulberry32 } from '../../utils/math.js';

// ---------- clima ----------
function climaBase(dias, seed = 2024) {
    const rng = mulberry32(seed);
    const chuva = [], tmax = [], tmin = [], et0 = [];
    for (let d = 0; d <= dias; d++) {
        const r = rng();
        let mm = 0;
        if (d === 0) mm = 25;
        else if (r < 0.38) mm = 4 + -Math.log(1 - rng()) * 14;
        const tx = 30 + Math.sin(d * 0.21) * 1.2 + (rng() - 0.5) * 2 - (mm > 0 ? 1.5 : 0);
        const tn = 19.5 + (rng() - 0.5) * 2;
        chuva.push(mm);
        tmax.push(tx);
        tmin.push(tn);
        et0.push(Math.max(1.5, 4.0 + (tx - 30) * 0.25 - (mm > 0 ? 1.2 : 0)));
    }
    return { chuva, tmax, tmin, et0 };
}

function aplicarJanela(clima, d0, d1, fn) {
    for (let d = d0; d <= d1 && d < clima.chuva.length; d++) fn(d);
}

function veranico(clima, d0, d1, intensidade = 1) {
    aplicarJanela(clima, d0, d1, d => {
        clima.chuva[d] = 0;
        clima.tmax[d] += 2.5 * intensidade;
        clima.et0[d] = Math.max(clima.et0[d], 5.2 + 0.6 * intensidade);
    });
}

// ---------- solo ----------
function gauss(u, v, cu, cv, r) {
    const dx = u - cu, dv = v - cv;
    return Math.exp(-(dx * dx + dv * dv) / (2 * r * r));
}

function ruido(u, v, s, off = 0) {
    return smoothNoise((u + off) * 512, (v + off) * 512, s);
}

// Faixas de rodado ao longo das linhas de plantio (linhas correm em z, ou seja, em v).
export function rastros(u, centros, meiaLargura) {
    let m = 0;
    for (const c of centros) m = Math.max(m, 1 - smoothstep(meiaLargura * 0.6, meiaLargura, Math.abs(u - c)));
    return m;
}

// Exportado para domain/soil/solo-local.js (solo informado pelo produtor parte da referência).
export function soloReferencia(u, v) {
    const n = ruido(u, v, 140, 3);
    return {
        relevo: 0.25 * ruido(u, v, 200, 11),
        trafego: 0,
        compactacao: d => 0.15 + 0.08 * d,
        acidez: d => (d < 0.2 ? 0.1 : 0.25),
        mo: d => 0.1 + 0.7 * Math.exp(-d / 0.25),
        biologia: 0.75,
        fert: { N: 0.88 + 0.08 * n, P: 0.9, K: 0.9, Mg: 0.9, S: 0.9, Zn: 0.9, FeMn: 0.95 },
        palhada: 0.65,
        crosta: 0.05,
        espessuraA: 0.48 + 0.06 * (n - 0.5),
        gley: () => 0,
        lencol: null,
        sal: 0
    };
}

function comBaixada(base, u, v, cu, cv, r, lencolMin) {
    const g = gauss(u, v, cu, cv, r);
    base.relevo = clamp(base.relevo * 0.5 + g);
    if (g > 0.35) {
        // Lençol freático raso na baixada: mais raso quanto mais baixo.
        base.lencol = lencolMin + (1 - g) * 0.9;
        base.gley = d => (d > base.lencol - 0.15 ? 0.8 : 0.1 * g);
    }
    return base;
}

export const CENARIOS = {
    referencia: {
        nome: 'Referência — plantio direto bem manejado',
        descricao: 'Solo estruturado, palhada, fertilidade corrigida e chuva regular.',
        clima: dias => climaBase(dias),
        solo: (u, v) => soloReferencia(u, v)
    },
    veranico: {
        nome: 'Veranico no pendoamento',
        descricao: '25 dias sem chuva cobrindo VT–R1, a fase mais sensível do milho.',
        clima: dias => { const c = climaBase(dias); veranico(c, 50, 75, 1); return c; },
        solo: (u, v) => { const s = soloReferencia(u, v); s.palhada = 0.4; return s; }
    },
    calor: {
        nome: 'Onda de calor na floração',
        descricao: 'Máximas de 37–39 °C entre os dias 56 e 66.',
        clima: dias => {
            const c = climaBase(dias);
            aplicarJanela(c, 56, 66, d => { c.tmax[d] = 37 + (d % 3); c.et0[d] = 6; c.chuva[d] = d % 4 === 0 ? 6 : 0; });
            return c;
        },
        solo: (u, v) => soloReferencia(u, v)
    },
    geada: {
        nome: 'Geada (safrinha) com baixada',
        descricao: 'Frente fria nos dias 38–41. O ar frio escorre e acumula na baixada.',
        clima: dias => {
            const c = climaBase(dias);
            const tn = { 38: 6, 39: 2.5, 40: 0.5, 41: 3 };
            aplicarJanela(c, 38, 41, d => { c.tmin[d] = tn[d]; c.tmax[d] = 19 + (d - 38); c.chuva[d] = 0; c.et0[d] = 2.5; });
            return c;
        },
        solo: (u, v) => comBaixada(soloReferencia(u, v), u, v, 0.78, 0.78, 0.22, 1.2)
    },
    encharcamento: {
        nome: 'Encharcamento na baixada',
        descricao: 'Chuvas pesadas entre os dias 12 e 34 e lençol freático raso na parte baixa.',
        clima: dias => {
            const c = climaBase(dias);
            aplicarJanela(c, 12, 34, d => { c.chuva[d] = d % 2 === 0 ? 38 : 12; c.et0[d] = 2.5; c.tmax[d] = 27; });
            return c;
        },
        solo: (u, v) => {
            const s = comBaixada(soloReferencia(u, v), u, v, 0.75, 0.7, 0.24, 0.25);
            s.palhada = 0.35;
            return s;
        }
    },
    compactacao: {
        nome: 'Compactação (rodado e pé-de-grade)',
        descricao: 'Rastros de máquina com solo úmido e camada densa a 15–27 cm. Veranico curto nos dias 62–76 revela o problema.',
        clima: dias => { const c = climaBase(dias); veranico(c, 62, 76, 0.7); return c; },
        solo: (u, v) => {
            const s = soloReferencia(u, v);
            const tr = rastros(u, [0.28, 0.72], 0.06);
            s.trafego = tr;
            s.compactacao = d => {
                let c = 0.2 + 0.05 * d;
                if (d >= 0.18 && d <= 0.3) c = Math.max(c, 0.78);
                if (d <= 0.32) c = Math.max(c, 0.95 * tr);
                return c;
            };
            s.crosta = 0.35;
            s.palhada = 0.15;
            s.biologia = 0.35;
            s.mo = d => 0.1 + 0.45 * Math.exp(-d / 0.2);
            return s;
        }
    },
    pobre_acido: {
        nome: 'Solo pobre e ácido',
        adubacaoN: { dia: 30, dose: 0.15 },
        descricao: 'Pouca matéria orgânica, subsolo com alumínio, P e K baixos, solo descoberto. Veranico nos dias 55–68.',
        clima: dias => { const c = climaBase(dias); veranico(c, 55, 68, 0.8); return c; },
        solo: (u, v) => {
            const s = soloReferencia(u, v);
            const n = ruido(u, v, 120, 7);
            const rebK = gauss(u, v, 0.3, 0.65, 0.18);
            s.acidez = d => (d < 0.2 ? 0.45 : 0.85);
            s.mo = d => 0.05 + 0.25 * Math.exp(-d / 0.15);
            s.biologia = 0.2;
            s.fert = { N: 0.6 + 0.1 * n, P: 0.4 + 0.1 * n, K: 0.65 - 0.4 * rebK, Mg: 0.65, S: 0.65, Zn: 0.6, FeMn: 0.9 };
            s.palhada = 0.05;
            s.crosta = 0.45;
            s.espessuraA = 0.2 + 0.12 * n;
            return s;
        }
    },
    mosaico: {
        nome: 'Mosaico de deficiências (demonstração)',
        descricao: 'Uma reboleira por nutriente para comparar os padrões lado a lado: N, P, K, Mg, S, Zn, Fe/Mn.',
        clima: dias => climaBase(dias),
        solo: (u, v) => {
            const s = soloReferencia(u, v);
            const centros = {
                N: [0.2, 0.2], P: [0.5, 0.18], K: [0.8, 0.2],
                Mg: [0.2, 0.52], S: [0.5, 0.5], Zn: [0.8, 0.52],
                FeMn: [0.35, 0.82]
            };
            for (const [nut, [cu, cv]] of Object.entries(centros)) {
                s.fert[nut] = clamp(s.fert[nut] - 0.8 * gauss(u, v, cu, cv, 0.09), 0.08, 1);
            }
            return s;
        }
    }
};
