// Sintomas pintados por pixel sobre o sprite, guiados pela máscara de dados (u, v, órgão, idade).
// São os mesmos operadores do antigo shader 3D (plano, seção 6.4), agora em JavaScript.
// O resultado vai para um cache com chave = sprite + vetor de estresse quantizado.
import { clamp, smoothstep } from '../../utils/math.js';
import { vnoise } from '../../utils/noise.js';
import { rampa } from '../../utils/ramp.js';
import { IDX, NCANAIS } from '../../domain/channels.js';
import { ORGAO } from './mask.js';

const CHLOR = [214, 199, 77], PALE = [158, 178, 87], NECRO = [117, 82, 41];
const BLEACH = [219, 214, 179], PURPLE = [97, 36, 87], DROUGHT = [77, 102, 97];
const LESAO = [178, 164, 118];   // mancha de calor: tecido descolorido, opaco
const SECA = [196, 163, 59], PENDAO_SECO = [150, 112, 62];

// Ganho apenas visual: zero permanece saudável e danos moderados ganham leitura no talhão.
const intensidade = v => Math.pow(clamp(v), 0.65);
const NIVEIS = 8;
const q = v => Math.round(clamp(v) * NIVEIS) / NIVEIS;

// Folhas afetadas avançam da mais velha para a mais nova (móveis) ou o contrário (imóveis).
const wMovel = (s, idade) => smoothstep(0, 0.25, s * 1.35 - (1 - idade));
const wImovel = (s, idade) => smoothstep(0, 0.25, s * 1.35 - idade);

// Estado quantizado de uma planta para o cache.
// est: { modo: 'real' | 'mapa' | 'cinza', ag, cr (Float32Array 12), senesc, valorMapa, ganho }
export function chaveEstresse(est) {
    if (est.modo === 'mapa') return 'm' + q(est.valorMapa);
    if (est.modo === 'cinza') return 'c';
    const g = est.ganho;
    let k = 'r';
    k += [IDX.agua_deficit, IDX.frio, IDX.calor, IDX.agua_excesso].map(c => q(intensidade(est.ag[c] * g))).join(',');
    for (let i = 0; i < NCANAIS - 1; i++) k += ',' + q(intensidade(est.cr[i] * g));
    k += ',' + q(est.senesc * 4);
    return k;
}

export function createCompositor({ max = 260 } = {}) {
    const cache = new Map();

    const chaveDe = (sprite, est) => sprite.chave + '|' + chaveEstresse(est);

    // Imagem já pronta no cache (ou null). Não calcula nada.
    function emCache(chave) {
        const cv = cache.get(chave);
        if (cv) { cache.delete(chave); cache.set(chave, cv); }
        return cv || null;
    }

    function compor(sprite, est) {
        const chave = chaveDe(sprite, est);
        let cv = emCache(chave);
        if (cv) return cv;
        if (/^r0,0(,0)+$/.test(chaveEstresse(est))) {
            cv = sprite.cor;
        } else {
            cv = document.createElement('canvas');
            cv.width = sprite.larg; cv.height = sprite.alt;
            const ctx = cv.getContext('2d');
            const img = ctx.createImageData(sprite.larg, sprite.alt);
            img.data.set(sprite.corPx);
            if (est.modo === 'real') sintomas(img.data, sprite, est);
            else falsaCor(img.data, sprite, est);
            ctx.putImageData(img, 0, 0);
        }
        cache.set(chave, cv);
        if (cache.size > max) cache.delete(cache.keys().next().value);
        return cv;
    }

    return { compor, emCache, chaveDe, limpar: () => cache.clear(), get tamanho() { return cache.size; } };
}

function falsaCor(px, sprite, est) {
    const d = sprite.dadosPx;
    const cor = est.modo === 'mapa' ? rampa(q(est.valorMapa)) : [150, 150, 150];
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 4) continue;
        const org = d[i + 2] >> 5;
        const lum = (px[i] + px[i + 1] + px[i + 2]) / 765;
        const sh = clamp(lum / 0.42, 0.55, 1.3);
        const c = (org === ORGAO.FOLHA || org === ORGAO.COLMO) ? cor : [107, 107, 107];
        px[i] = c[0] * sh; px[i + 1] = c[1] * sh; px[i + 2] = c[2] * sh;
    }
}

// Índices (em bytes) dos pixels que recebem sintoma: visíveis, com máscara confiável e órgão folha, colmo ou pendão.
// É fixo por sprite, então é calculado uma vez e guardado nele; o laço dos sintomas só passa por esses pixels.
function pixelsComSintoma(sprite) {
    if (sprite.pixelsSintoma) return sprite.pixelsSintoma;
    const c = sprite.corPx, d = sprite.dadosPx;
    const lista = [];
    for (let i = 0; i < c.length; i += 4) {
        if (c[i + 3] < 4 || d[i + 3] < 90) continue;
        const org = d[i + 2] >> 5;
        if (org === ORGAO.FOLHA || org === ORGAO.COLMO || org === ORGAO.PENDAO) lista.push(i);
    }
    sprite.pixelsSintoma = Int32Array.from(lista);
    return sprite.pixelsSintoma;
}

function sintomas(px, sprite, est) {
    const d = sprite.dadosPx, W = sprite.larg;
    const g = est.ganho;
    const s = k => q(intensidade(est.cr[k] * g));
    const sDef = q(intensidade(est.ag[IDX.agua_deficit] * g)), sFrio = q(intensidade(est.ag[IDX.frio] * g));
    const sCalor = q(intensidade(est.ag[IDX.calor] * g));
    const sExcesso = q(intensidade(est.ag[IDX.agua_excesso] * g));
    const cDef = s(IDX.agua_deficit), cExc = s(IDX.agua_excesso), cCal = s(IDX.calor), cGea = s(IDX.frio);
    const sN = s(IDX.N), sP = s(IDX.P), sK = s(IDX.K), sMg = s(IDX.Mg);
    const sS = s(IDX.S), sZn = s(IDX.Zn), sFe = s(IDX.FeMn);
    const sen = q(est.senesc * 4);
    const visivel = 1 - smoothstep(0.6, 1, sprite.maturacao) * 0.4;
    // tom: luminância do pixel pintado relativa a um verde médio. As cores de sintoma são multiplicadas
    // por ele para manter o sombreamento do sprite (face de baixo, contorno, brilho).
    let r, gg, b, tom = 1;
    const mix = (c, f) => {
        if (f <= 0) return;
        f = Math.min(1, f);
        r += (c[0] * tom - r) * f; gg += (c[1] * tom - gg) * f; b += (c[2] * tom - b) * f;
    };

    const lista = pixelsComSintoma(sprite);
    for (let n = 0; n < lista.length; n++) {
        const i = lista[n];
        const B = d[i + 2], org = B >> 5;
        r = px[i]; gg = px[i + 1]; b = px[i + 2];
        const r0 = r, g0 = gg, b0 = b;
        tom = clamp((r + gg + b) / 315, 0.5, 1.25);

        if (org === ORGAO.FOLHA) {
            const u = d[i] / 255, v = d[i + 1] / 255, idade = (B & 31) / 31;
            // Coordenada da ponta: na arte, u (distância horizontal ao eixo) cortaria a queima em linha vertical;
            // somar margem e ruído faz a queima avançar pela borda e terminar irregular.
            const uP = sprite.mascaraAuto ? u + 0.18 * v + 0.12 * (vnoise(((i >> 2) % W) * 0.06, (((i >> 2) / W) | 0) * 0.06) - 0.5) : u;
            const x = (i >> 2) % W, y = ((i >> 2) / W) | 0;
            let w;
            // Massas de cor legíveis sem zoom; os padrões por órgão seguem por cima.
            mix(DROUGHT, sDef * 0.72);
            mix(LESAO, sCalor * 0.38);
            mix(PALE, cExc * 0.48);
            // Excesso atual fica legível antes da clorose crônica, sobretudo nas folhas velhas.
            mix([181, 192, 94], sExcesso * (0.2 + 0.35 * idade));
            mix(SECA, cDef * 0.38 * (0.4 + 0.6 * idade));
            // Encharcamento: amarelecimento a partir das folhas velhas.
            if (cExc > 0) mix(PALE, 0.75 * cExc * wMovel(cExc, idade));
            // N: dicotiledôneas têm clorose uniforme; gramíneas mantêm o "V"
            // amarelo da ponta pela nervura central. Em ambos começa nas velhas.
            if (sN > 0) {
                w = wMovel(sN, idade);
                if (sprite.dicotiledonea) {
                    mix(PALE, .78 * sN * w);
                    mix(CHLOR, .32 * sN * w * smoothstep(.35, .9, u));
                } else {
                    const lim = (u * 1.25 - 0.25) * (0.35 + sN);
                    // Máscara gerada da cor: borda do "V" larga (com faixa estreita surgem contornos).
                    const eV = sprite.mascaraAuto ? 0.22 : 0.05;
                    const dentroV = 1 - smoothstep(lim - eV, lim + eV, v);
                    mix(PALE, 0.35 * sN * w);
                    mix(CHLOR, dentroV * w * clamp(sN * 1.5));
                    mix(NECRO, dentroV * w * smoothstep(0.75, 1, sN) * smoothstep(0.8, 0.95, u));
                }
            }
            // P: verde-escuro opaco e arroxeado nas margens.
            if (sP > 0) {
                const f = 0.35 * sP * 0.28; r *= 1 - f; gg *= 1 - f; b *= 1 - f;
                mix(PURPLE, wMovel(sP, idade) * sP * smoothstep(0.25, 1, v) * 0.9);
            }
            // K: clorose e necrose da margem começando pela ponta.
            if (sK > 0) {
                w = wMovel(sK, idade);
                const lim = 1 - sK * (0.15 + 0.6 * u);
                const ponta = smoothstep(0.15, 0.45, u + sK * 0.3);
                mix(CHLOR, w * ponta * smoothstep(lim - 0.2, lim - 0.06, v));
                if (sprite.mascaraAuto) mix(NECRO, 0.75 * w * ponta * smoothstep(lim - 0.1, lim + 0.12, v));   // margem queimada em degradê
                else mix(NECRO, w * ponta * smoothstep(lim - 0.03, lim + 0.02, v));
            }
            // Mg: estrias internervais nas folhas velhas.
            if (sMg > 0) {
                // Máscara gerada da cor (arte): v é distância à borda, e faixas em v viram contornos; usa mosqueado.
                const nerv = sprite.mascaraAuto ? vnoise(x * 14 / W * 3, y * 14 / W * 3) : 0.5 - 0.5 * Math.cos(v * Math.PI * 11);
                mix(CHLOR, wMovel(sMg, idade) * sMg * smoothstep(0.35, 0.75, nerv) * smoothstep(0.1, 0.3, u) * 0.9);
            }
            // S: palidez uniforme nas folhas novas.
            if (sS > 0) mix([174, 196, 96], wImovel(sS, idade) * sS * 0.85);
            // Zn: faixas claras na base das folhas novas, entre nervura e margem.
            if (sZn > 0) {
                const faixa = sprite.mascaraAuto
                    ? smoothstep(0.55, 0.8, vnoise(x * 14 / W * 3 + 3, y * 14 / W * 3)) * (1 - smoothstep(0.25, 0.6, u))
                    : smoothstep(0.12, 0.28, v) * (1 - smoothstep(0.72, 0.88, v)) * (1 - smoothstep(0.25, 0.6, u));
                mix(BLEACH, wImovel(sZn, idade) * faixa * sZn * (sprite.mascaraAuto ? 0.5 : 1));
            }
            // Fe/Mn: clorose internerval fina nas folhas novas.
            if (sFe > 0) {
                const nerv = sprite.mascaraAuto ? vnoise(x * 14 / W * 5 + 9, y * 14 / W * 5) : 0.5 + 0.5 * Math.cos(v * Math.PI * 18);
                mix([225, 209, 81], wImovel(sFe, idade) * sFe * smoothstep(0.3, 0.7, nerv));
            }
            // Déficit hídrico agudo: verde-acinzentado.
            if (sDef > 0) mix(DROUGHT, sDef * 0.55);
            // Déficit hídrico crônico: queima da ponta e baixeiras secando.
            if (cDef > 0) {
                const lim = 1 - cDef * 0.72;
                mix(NECRO, 0.85 * smoothstep(lim - 0.04, lim + 0.14, uP));   // degradê: ponta seca sem corte reto
                mix([186, 182, 152], smoothstep(0.6, 1, cDef * 1.2 - (1 - idade) * 0.8));
            }
            // Calor crônico: queima de ponta e manchas descoloridas.
            if (cCal > 0) {
                const lim = 1 - cCal * 0.52;
                mix(NECRO, 0.8 * smoothstep(lim - 0.04, lim + 0.14, uP));
                // Manchas em coordenadas de pixel (escala ~ 1/20 da planta): em (u, v) viravam listras.
                const esc = 14 / Math.max(W, 1);
                // Escala ~1/8 da planta: na tela (sprite reduzido ~5x) a lesão tem vários pixels, não vira "brilho".
                const manchas = smoothstep(0.62, 0.8, vnoise(x * esc * 0.9, y * esc * 0.9));
                mix(LESAO, manchas * cCal * 0.9);
            }
            // Frio agudo: arroxeado leve nas margens.
            if (sFrio > 0) mix(PURPLE, sFrio * 0.25 * smoothstep(0.2, 1, v));
            // Geada: placas necróticas nas folhas novas; severa = folha inteira palha.
            if (cGea > 0) {
                // Geada severa cobre a folha toda; leve, só placas (sem ilhas verdes soltas na severa).
                const placa = smoothstep(0.3, 0.6, vnoise(x * 0.12, y * 0.05) + cGea * 0.95 - 0.35);
                mix([168, 148, 110], wImovel(cGea, idade) * placa * cGea);
            }
            // Senescência precoce (estresse): folhas velhas secam antes.
            if (sen > 0) mix(SECA, sen * (0.3 + 0.7 * idade));
            // Na maturação natural a folha já seca; os sintomas ficam menos distinguíveis.
            if (visivel < 1) { r = r0 + (r - r0) * visivel; gg = g0 + (gg - g0) * visivel; b = b0 + (b - b0) * visivel; }
        } else if (org === ORGAO.COLMO) {
            mix(PALE, sN * 0.35);
            mix(PURPLE, sP * 0.45 + sFrio * 0.2);
        } else {
            mix(PENDAO_SECO, cCal * 0.75 + cDef * 0.35);   // pendão (a lista só tem folha, colmo e pendão)
        }

        px[i] = r; px[i + 1] = gg; px[i + 2] = b;
    }
}
