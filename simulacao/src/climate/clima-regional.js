// Clima regional por ano agrícola: gera o clima diário de qualquer safra a partir de normais mensais e de
// uma semente por ano. Dá duas coisas que o clima de cenário não dá:
//   - calendário: a safra começa numa data (MM-DD), então soja de outubro e milho safrinha de fevereiro
//     do mesmo ano usam o mesmo ano de chuva (comparação pareada entre rotações);
//   - ano normal: as normais servem de régua ("−35 % do normal") e o conjunto de anos dá p10/p50/p90.
//
// Saída no contrato de forcante.js: { chuva[], tmax[], tmin[], et0[] }, dia 0 = plantio, mais data[] (MM-DD).
// Normais sintéticas, aproximando o sudoeste goiano (Rio Verde). A troca por NASA POWER / INMET entra aqui.
import { clamp, curve, mulberry32 } from '../utils/math.js';

export const NORMAIS = {
    cerrado_go: {
        nome: 'Cerrado goiano (normais aproximadas, sintéticas)',
        //        jan  fev  mar  abr  mai  jun jul  ago  set  out  nov  dez
        chuva:  [275, 225, 210,  95,  35, 10,  7,  15,  55, 140, 215, 265],   // mm/mês
        tmax:   [29.5, 29.8, 29.8, 29.6, 28.5, 27.8, 28.3, 30.6, 31.8, 31.2, 29.8, 29.3],
        tmin:   [19.6, 19.5, 19.3, 18.0, 15.3, 13.6, 13.2, 14.8, 17.5, 19.0, 19.3, 19.5],
        ra:     [16.6, 16.2, 15.0, 13.2, 11.5, 10.6, 11.0, 12.6, 14.4, 15.8, 16.4, 16.6]  // radiação no topo da atmosfera, mm/dia equiv.
    }
};

const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const INICIO_ANO_AGRICOLA = 6;   // julho (índice do mês)
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Dia do ano agrícola (0 = 1º de julho) para uma data MM-DD.
export function diaAgricola(mmdd) {
    const [m, d] = mmdd.split('-').map(Number);
    let dia = 0;
    for (let i = INICIO_ANO_AGRICOLA; i !== m - 1; i = (i + 1) % 12) dia += DIAS_MES[i];
    return dia + d - 1;
}

function dataDe(diaAg) {
    let i = INICIO_ANO_AGRICOLA, d = ((diaAg % 365) + 365) % 365;
    while (d >= DIAS_MES[i]) { d -= DIAS_MES[i]; i = (i + 1) % 12; }
    return { mes: i, dia: d + 1, mmdd: `${String(i + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}` };
}

const hargreaves = (tx, tn, ra) => Math.max(1.2, 0.0023 * ra * ((tx + tn) / 2 + 17.8) * Math.sqrt(Math.max(0.5, tx - tn)));

// Variação do ano, sorteada uma vez por ano agrícola:
//   fatorChuva: o ano inteiro mais seco ou mais úmido;
//   fimChuva: dias de antecipação (+) ou atraso (−) da retirada das chuvas (risco da safrinha);
//   veranico: um período seco no meio do verão, ou nenhum.
export function anoClimatico(semente) {
    const rng = mulberry32((semente * 2654435761) >>> 0);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const fatorChuva = clamp(Math.exp(0.22 * gauss()), 0.6, 1.5);
    const fimChuva = Math.round(clamp(gauss() * 15, -30, 35));
    const temVeranico = rng() < 0.55;
    const veranico = temVeranico ? { inicio: diaAgricola('12-15') + Math.floor(rng() * 70), duracao: 8 + Math.floor(rng() * 16) } : null;
    const calor = gauss() * 0.8;   // anomalia de temperatura do ano, °C
    return { semente, fatorChuva, fimChuva, veranico, calor, rng };
}

// Clima diário de um ano agrícola inteiro (540 dias, para caber safra longa que passa de junho).
const cache = new Map();
export function climaDoAno(semente, normais = NORMAIS.cerrado_go) {
    const chave = `${semente}|${normais.nome}`;
    if (cache.has(chave)) return cache.get(chave);
    const ano = anoClimatico(semente);
    const { rng } = ano;
    const n = 540, chuva = [], tmax = [], tmin = [], et0 = [], data = [];
    const fimRef = diaAgricola('04-01');
    for (let d = 0; d < n; d++) {
        const { mes, mmdd } = dataDe(d);
        let mm = normais.chuva[mes] / DIAS_MES[mes] * ano.fatorChuva;   // mm/dia esperado
        // Retirada das chuvas: a partir de março, desloca a curva de chuva para frente ou para trás.
        if (d > fimRef - 45 && d < fimRef + 75) {
            const { mes: mDesl } = dataDe(d + ano.fimChuva);
            mm = normais.chuva[mDesl] / DIAS_MES[mDesl] * ano.fatorChuva;
        }
        const emVeranico = ano.veranico && d >= ano.veranico.inicio && d < ano.veranico.inicio + ano.veranico.duracao;
        const pUmido = clamp(mm / 11, 0, 0.7);
        let r = 0;
        if (!emVeranico && rng() < pUmido) r = -Math.log(1 - rng()) * (mm / Math.max(0.02, pUmido));
        else rng();
        const tx = normais.tmax[mes] + ano.calor + (rng() - 0.5) * 2.4 - (r > 0 ? 1.5 : 0) + (emVeranico ? 2.2 : 0);
        const tn = normais.tmin[mes] + ano.calor * 0.6 + (rng() - 0.5) * 2;
        chuva.push(r); tmax.push(tx); tmin.push(tn);
        et0.push(hargreaves(tx, tn, normais.ra[mes]) * (r > 0 ? 0.75 : 1));
        data.push(mmdd);
    }
    const out = { ano, chuva, tmax, tmin, et0, data };
    cache.set(chave, out);
    return out;
}

// Clima de uma safra: recorte do ano agrícola a partir da data de plantio.
export function climaDaSafraRegional({ semente, plantio, dias, normais = NORMAIS.cerrado_go }) {
    const A = climaDoAno(semente, normais);
    const d0 = diaAgricola(plantio);
    const fatia = a => a.slice(d0, d0 + dias + 1);
    return {
        chuva: fatia(A.chuva), tmax: fatia(A.tmax), tmin: fatia(A.tmin), et0: fatia(A.et0), data: fatia(A.data),
        origem: `sintético · ano ${semente}`, veranico: A.ano.veranico, fatorChuva: A.ano.fatorChuva, fimChuva: A.ano.fimChuva
    };
}

// Ano normal da safra, por decêndio: chuva e temperatura esperadas pelas normais.
export function normalDaSafra({ plantio, dias, normais = NORMAIS.cerrado_go }) {
    const d0 = diaAgricola(plantio);
    const dec = [];
    for (let i = 0; i <= dias; i += 10) {
        let mm = 0, tx = 0, n = 0;
        for (let d = i; d < Math.min(i + 10, dias + 1); d++, n++) {
            const { mes } = dataDe(d0 + d);
            mm += normais.chuva[mes] / DIAS_MES[mes];
            tx += normais.tmax[mes];
        }
        dec.push({ diaInicio: i, diaFim: i + n - 1, data: dataDe(d0 + i).mmdd, chuvaMm: mm, tmax: tx / n });
    }
    return dec;
}

// Clima da safra comparado com o ano normal e com a faixa de anos (p10–p90), por decêndio.
//   anomaliaPct: chuva do decêndio em % do normal (−35 = 35 % abaixo);
//   classe: 'seco' abaixo do p25 dos anos, 'umido' acima do p75, senão 'normal'.
export function climaVsNormal({ clima, plantio, dias, normais = NORMAIS.cerrado_go, anosFaixa = 30 }) {
    const normal = normalDaSafra({ plantio, dias, normais });
    const amostras = normal.map(() => []);
    for (let s = 1; s <= anosFaixa; s++) {
        const c = climaDaSafraRegional({ semente: 900000 + s, plantio, dias, normais });
        normal.forEach((n, i) => amostras[i].push(soma(c.chuva, n.diaInicio, n.diaFim)));
    }
    return normal.map((n, i) => {
        const mm = soma(clima.chuva, n.diaInicio, n.diaFim);
        const a = amostras[i].sort((x, y) => x - y);
        const q = f => a[Math.min(a.length - 1, Math.floor(f * a.length))];
        const tx = media(clima.tmax, n.diaInicio, n.diaFim);
        return {
            ...n, chuvaNormalMm: n.chuvaMm, chuvaMm: mm,
            anomaliaPct: n.chuvaMm > 0.5 ? (mm / n.chuvaMm - 1) * 100 : 0,
            p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9),
            classe: mm < q(0.25) ? 'seco' : mm > q(0.75) ? 'umido' : 'normal',
            tmaxMedia: tx, tmaxNormal: n.tmax, anomaliaTmaxC: tx - n.tmax
        };
    });
}

// Sobreposição entre decêndios secos ou quentes e as fases sensíveis da cultura. Não precisa rodar a
// simulação: serve para a tela marcar o risco no calendário antes de qualquer conta de planta.
export function sobreposicaoRisco({ crop, decendios, sensMin = 0.8 }) {
    const out = [];
    for (const d of decendios) {
        const tMeio = ((d.diaInicio + d.diaFim) / 2) / crop.cicloDias;
        const sensAgua = curva(crop.sensibilidade.agua_deficit, tMeio);
        const sensCalor = curva(crop.sensibilidade.calor, tMeio);
        const fase = crop.fases.find(f => tMeio < f.ate) ?? crop.fases[crop.fases.length - 1];
        if (d.classe === 'seco' && sensAgua >= sensMin) out.push({ ...d, risco: 'seca', sens: sensAgua, fase: fase.codigo, faseNome: fase.nome });
        if (d.tmaxMedia >= crop.limites.tCalor - 2 && sensCalor >= sensMin) out.push({ ...d, risco: 'calor', sens: sensCalor, fase: fase.codigo, faseNome: fase.nome });
    }
    return out;
}

function soma(a, i, j) { let s = 0; for (let k = i; k <= j && k < a.length; k++) s += a[k]; return s; }
function media(a, i, j) { let s = 0, n = 0; for (let k = i; k <= j && k < a.length; k++, n++) s += a[k]; return n ? s / n : 0; }
const curva = (p, x) => (p ? curve(p, x) : 1);
