// Fonte de clima para rotações e comparações: entrega o clima de qualquer safra de qualquer ano agrícola.
// Duas implementações com o mesmo contrato, para a simulação não saber de onde vem o clima:
//   fontePower(serie)          série diária do NASA POWER (src/services/nasa-power.js), ET0 FAO-56 Penman-Monteith
//   fonteSintetica({ normais }) gerador de clima de src/climate/clima-regional.js (testes, demonstração, sem rede)
//
// Contrato:
//   { id, nome, origem, anos: [ano...], safra({ ano, plantio: 'MM-DD', dias }), aquecimento(ano, k) }
//   ano = ano agrícola que começa em 1º de julho de `ano`. safra() devolve dias + 1 valores, dia 0 = plantio,
//   no contrato de simulation/forcante.js: { chuva[], tmax[], tmin[], et0[], data[] (MM-DD), origem }.
//
// Cenário climático (sliders do edital: temperatura e chuva): comCenario(serie, { dT, dChuvaPct, atrasoInicio,
// anteciparFim }) devolve uma série nova pelo método delta (perturba o clima observado) e a ET0 é recalculada.
import { climaDaSafraRegional, NORMAIS } from './clima-regional.js';
import { et0PenmanMonteith, diaDoAnoISO } from './et0.js';

const DIA_MS = 86400000;
const msDe = iso => Date.parse(iso + 'T00:00:00Z');
const isoDe = ms => new Date(ms).toISOString().slice(0, 10);

// Data real de um plantio 'MM-DD' dentro do ano agrícola que começa em julho de `ano`.
export function dataDoPlantio(ano, plantio) {
    const [m, d] = plantio.split('-').map(Number);
    const y = m >= 7 ? ano : ano + 1;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ET0 diária da série (Penman-Monteith com Rs, UR e vento do POWER).
export function calcularEt0(serie) {
    const t0 = msDe(serie.inicio);
    const et0 = new Array(serie.n);
    for (let i = 0; i < serie.n; i++) {
        et0[i] = et0PenmanMonteith({
            tmax: serie.tmax[i], tmin: serie.tmin[i], ur: serie.ur[i], vento: serie.vento[i], rad: serie.rad[i],
            elev: serie.local.elev, lat: serie.local.lat, diaDoAno: diaDoAnoISO(isoDe(t0 + i * DIA_MS))
        });
    }
    return et0;
}

export function fontePower(serie, { horizonteDias = 420 } = {}) {
    const t0 = msDe(serie.inicio);
    const et0 = serie.et0 ?? calcularEt0(serie);
    const indice = iso => Math.round((msDe(iso) - t0) / DIA_MS);
    const anoIni = Number(serie.inicio.slice(0, 4));
    const anos = [];
    for (let y = anoIni; y <= anoIni + Math.ceil(serie.n / 365); y++) {
        const i = indice(`${y}-07-01`);
        if (i >= 0 && i + horizonteDias < serie.n) anos.push(y);
    }
    const cen = serie.cenario;
    return {
        id: 'nasa-power', nome: serie.fonte?.nome ?? 'NASA POWER',
        origem: `NASA POWER · ${serie.local.lat.toFixed(2)}, ${serie.local.lon.toFixed(2)}${cen ? ' · cenário ' + cen.descricao : ''}`,
        local: serie.local, anos, cenario: cen ?? null,
        safra({ ano, plantio, dias }) {
            const i0 = indice(dataDoPlantio(ano, plantio));
            if (i0 < 0 || i0 + dias >= serie.n) throw new Error(`clima fora da série do POWER: ano ${ano}, plantio ${plantio}`);
            const fatia = a => a.slice(i0, i0 + dias + 1);
            const data = [], datas = [];
            for (let d = 0; d <= dias; d++) { const iso = isoDe(t0 + (i0 + d) * DIA_MS); datas.push(iso); data.push(iso.slice(5)); }
            return {
                chuva: fatia(serie.chuva), tmax: fatia(serie.tmax), tmin: fatia(serie.tmin), et0: fatia(et0),
                data, datas, preenchido: fatia(serie.preenchido),
                origem: `NASA POWER · safra ${ano}/${ano + 1}`
            };
        },
        aquecimento(ano, k) { return anos.includes(ano - k) ? ano - k : ano; }
    };
}

export function fonteSintetica({ normais = NORMAIS.cerrado_go, sementeBase = 2000, anos = 8 } = {}) {
    return {
        id: 'sintetico', nome: normais.nome, origem: `sintético · ${normais.nome}`,
        anos: Array.from({ length: anos }, (_, i) => sementeBase + i), cenario: null,
        safra: ({ ano, plantio, dias }) => climaDaSafraRegional({ semente: ano, plantio, dias, normais }),
        aquecimento: (ano, k) => ano - 1000 - k
    };
}

// Método delta sobre a série observada. ΔT soma nas máximas e mínimas (UR mantida, como no método delta
// usual); Δchuva multiplica a chuva; atrasoInicio desloca a chuva de ago–dez para mais tarde (estação começa
// depois); anteciparFim puxa a chuva de mar–mai para mais cedo (estação acaba antes). A ET0 é recalculada.
export function comCenario(serie, { dT = 0, dChuvaPct = 0, atrasoInicio = 0, anteciparFim = 0 } = {}) {
    const t0 = msDe(serie.inicio);
    const n = serie.n;
    const chuva0 = Array.from(serie.chuva, v => v * (1 + dChuvaPct / 100));
    const chuva = chuva0.slice();
    for (let i = 0; i < n; i++) {
        const iso = isoDe(t0 + i * DIA_MS);
        const md = iso.slice(5);
        if (atrasoInicio > 0 && md >= '08-15' && md <= '12-31') chuva[i] = i - atrasoInicio >= 0 ? chuva0[i - atrasoInicio] : 0;
        if (anteciparFim > 0 && md >= '03-01' && md <= '05-31') chuva[i] = i + anteciparFim < n ? chuva0[i + anteciparFim] : 0;
    }
    const partes = [];
    if (dT) partes.push(`${dT > 0 ? '+' : ''}${dT} °C`);
    if (dChuvaPct) partes.push(`${dChuvaPct > 0 ? '+' : ''}${dChuvaPct} % chuva`);
    if (atrasoInicio) partes.push(`chuvas começam ${atrasoInicio} d depois`);
    if (anteciparFim) partes.push(`chuvas acabam ${anteciparFim} d antes`);
    const nova = {
        ...serie, chuva,
        tmax: Array.from(serie.tmax, v => v + dT), tmin: Array.from(serie.tmin, v => v + dT),
        cenario: partes.length ? { dT, dChuvaPct, atrasoInicio, anteciparFim, descricao: partes.join(', ') } : null
    };
    delete nova.et0;
    nova.et0 = calcularEt0(nova);
    return nova;
}

// Início das chuvas no ano agrícola, critério agronômico de Sivakumar (1988), adaptado ao Cerrado (busca a
// partir de 1º de setembro): primeiro dia em que 3 dias seguidos somam ≥ 20 mm e, nos 30 dias seguintes,
// nenhum período seco (< 1 mm/dia) passa de 7 dias. Devolve o dia do ano agrícola (0 = 1º de julho) ou null.
export function inicioDasChuvas(fonte, ano) {
    const c = fonte.safra({ ano, plantio: '07-01', dias: 300 }).chuva;
    const ini = 62;   // 1º de setembro
    for (let d = ini; d < c.length - 33; d++) {
        if (c[d] + c[d + 1] + c[d + 2] < 20) continue;
        let seco = 0, maior = 0;
        for (let k = d + 3; k < d + 33; k++) { seco = c[k] < 1 ? seco + 1 : 0; maior = Math.max(maior, seco); }
        if (maior <= 7) return d;
    }
    return null;
}

// Dia do ano agrícola (0 = 1º de julho) de uma data 'MM-DD', sem 29 de fevereiro.
export function diaDoAnoAgricola(mmdd) {
    const ms = Date.UTC(2001, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(3, 5)));
    const jul = Date.UTC(2001, 6, 1);
    return Math.round(((ms - jul) / DIA_MS + 365) % 365);
}

// Clima da safra contra os outros anos da fonte, por decêndio (mesma saída de climaVsNormal, mas a régua são
// os anos observados): normal = média dos anos; p10–p90 = faixa dos anos; 'seco' abaixo do p25.
export function climaVsAnos(fonte, { ano, plantio, dias }) {
    const porAno = fonte.anos.map(a => fonte.safra({ ano: a, plantio, dias }));
    const atual = fonte.safra({ ano, plantio, dias });
    const out = [];
    for (let i = 0; i <= dias; i += 10) {
        const j = Math.min(i + 9, dias);
        const soma = c => { let s = 0; for (let d = i; d <= j; d++) s += c.chuva[d]; return s; };
        const a = porAno.map(soma).sort((x, y) => x - y);
        const q = f => a[Math.min(a.length - 1, Math.floor(f * a.length))];
        const normal = a.reduce((x, y) => x + y, 0) / a.length;
        const mm = soma(atual);
        let tx = 0; for (let d = i; d <= j; d++) tx += atual.tmax[d];
        let txN = 0; for (const c of porAno) for (let d = i; d <= j; d++) txN += c.tmax[d];
        const tmaxMedia = tx / (j - i + 1), tmaxNormal = txN / ((j - i + 1) * porAno.length);
        out.push({
            diaInicio: i, diaFim: j, data: atual.data[i], chuvaMm: mm, chuvaNormalMm: normal,
            anomaliaPct: normal > 0.5 ? (mm / normal - 1) * 100 : 0,
            p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9),
            classe: mm < q(0.25) ? 'seco' : mm > q(0.75) ? 'umido' : 'normal',
            tmaxMedia, tmaxNormal, anomaliaTmaxC: tmaxMedia - tmaxNormal
        });
    }
    return out;
}
