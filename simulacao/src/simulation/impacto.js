// Impacto da safra: traduz o estado da planta em produtividade (sc/ha ou t/ha), separa a perda por causa
// e acha os eventos críticos (estresse que caiu numa fase sensível e custou produção).
//
//   serieDoDia(E, ctx)                 chamado pelo orquestrador no fim de cada dia
//   resumoSafra(E, crop, serie, par)   produtividade, perda por canal e por componente
//   eventosCriticos(serie, crop, resumo, par)
//
// Lê: agudo, dispRel, celP, senesc, atribDia, atrib, espiga, hAcc, hPot, acama. Não escreve no estado.
import { clamp, curve } from '../utils/math.js';
import { CANAIS, IDX, NCANAIS, ROTULO_CANAL } from '../domain/channels.js';
import { agronomiaDe } from '../domain/crops/agronomia.js';

const COMPONENTES = ['bio', 'esp', 'sen', 'ac'];
export const ROTULO_COMPONENTE = {
    bio: 'Planta menor (crescimento freado)',
    esp: 'Grãos abortados ou mal cheios',
    sen: 'Ciclo encurtado (senescência antecipada)',
    ac: 'Acamamento (perda na colheita)'
};

export function faseDoDia(crop, t) {
    for (const f of crop.fases) if (t < f.ate) return f;
    return crop.fases[crop.fases.length - 1];
}

// Médias do talhão no dia: o que a tela precisa para ligar clima, fase e planta.
//   ks: fator de água da transpiração (1 = sem restrição), o mesmo que solo/agua.js usa;
//   umidade: água disponível relativa na zona de raiz (0..1);
//   agudo: estresse de hoje por canal; sens: peso da fase por canal;
//   ndvi: NDVI esperado (cobertura × verdor), ndviPotencial: o mesmo sem estresse.
export function serieDoDia(E, ctx) {
    const { NP, celP, agudo, dispRel, senesc, atribDia } = E;
    const I = ctx.par.impacto, ksMeio = ctx.par.agua.ksMeio;
    const { t, cob } = ctx.fen;
    const ag = new Float32Array(NCANAIS);
    let ks = 0, um = 0, verdor = 0;
    for (let p = 0; p < NP; p++) {
        const c = celP[p], o = p * NCANAIS;
        ks += clamp(dispRel[c] / ksMeio);
        um += dispRel[c];
        let pior = 0;
        for (let k = 0; k < NCANAIS; k++) {
            ag[k] += agudo[o + k];
            if (k < 3) pior = Math.max(pior, agudo[o + k]);   // água (déficit, excesso) e calor: o que murcha hoje
        }
        verdor += cob * (1 - I.ndviEstresse * pior) * clamp(1 - I.ndviSenesc * senesc[p]);
    }
    const n = Math.max(1, NP);
    for (let k = 0; k < NCANAIS; k++) ag[k] /= n;
    const sens = new Float32Array(NCANAIS);
    for (let k = 0; k < NCANAIS; k++) {
        const s = ctx.crop.sensibilidade[CANAIS[k]];
        sens[k] = s ? curve(s, t) : 1;
    }
    const f = faseDoDia(ctx.crop, t);
    const dano = {};
    for (const X of COMPONENTES) dano[X] = Float32Array.from(atribDia[X]);
    return {
        dia: ctx.dia, t, fase: f.codigo, faseNome: f.nome,
        erosaoU: E.erosaoDia.reduce((s, v) => s + v, 0) / E.NC,
        deposicaoU: E.deposicaoDia.reduce((s, v) => s + v, 0) / E.NC,
        sedimentoMovelU: E.sedimento.reduce((s, v) => s + v, 0) / E.NC,
        sedimentoExportadoU: E.exportacaoSedimentoDia / E.NC,
        nutrientesExportados: Object.fromEntries(Object.entries(E.exportacaoNutrientesDia).map(([n, v]) => [n, v / E.NC])),
        espessuraAU: E.espA.reduce((s, v) => s + v, 0) / E.NC,
        chuva: ctx.clima.chuva, tmax: ctx.clima.tmax, tmin: ctx.clima.tmin, et0: ctx.clima.et0,
        ks: ks / n, umidade: um / n, cobertura: cob,
        // Balanço hídrico da cultura (FAO-56): ETc = ET0 · Kc (demanda) e ETa = ET0 · Kc · Ks (o que transpirou).
        kc: ctx.fen.kc, etc: ctx.clima.et0 * ctx.fen.kc, eta: ctx.clima.et0 * ctx.fen.kc * (ks / n),
        escoamento: E.escoamentoGlobal / E.NC,   // enxurrada que saiu da célula, mm (média do talhão)
        ndvi: I.ndviSolo + I.ndviGanho * verdor / n,
        ndviPotencial: I.ndviSolo + I.ndviGanho * cob,
        agudo: ag, sens, dano
    };
}

// Água e clima da safra, a partir da série diária.
//   isna: índice de satisfação das necessidades de água, ETa / ETc (o índice do ZARC, MAPA/Embrapa);
//   isnaCritico: o mesmo só nos dias de fase sensível à seca (sensibilidade ≥ 0,8), que é o que o ZARC usa;
//   diasCalorCritico: Tmax ≥ tCalor da cultura em fase sensível ao calor; diasGeada: Tmin ≤ tGeada após emergir.
export const SENS_CRITICA = 0.8;
export function balancoDaSafra(serie, crop, par) {
    let etc = 0, eta = 0, etcC = 0, etaC = 0, chuva = 0, esc = 0, diasCriticos = 0, calor = 0, geada = 0;
    const emerg = par.fenologia.emergencia;
    for (const s of serie) {
        etc += s.etc; eta += s.eta; chuva += s.chuva; esc += s.escoamento;
        if (s.sens[IDX.agua_deficit] >= SENS_CRITICA && s.etc > 0) { etcC += s.etc; etaC += s.eta; diasCriticos++; }
        if (s.tmax >= crop.limites.tCalor && s.sens[IDX.calor] >= SENS_CRITICA) calor++;
        if (s.t > emerg && s.tmin <= crop.limites.tGeada) geada++;
    }
    return {
        etcMm: etc, etaMm: eta, isna: etc > 0 ? eta / etc : 1, isnaCritico: etcC > 0 ? etaC / etcC : 1, diasCriticos,
        chuvaMm: chuva, escoamentoMm: esc, diasCalorCritico: calor, diasGeada: geada
    };
}

// Produtividade e perda por causa. A soma das perdas é exatamente potencial − produtividade:
// por planta, ln(potencial / Y) se divide entre os componentes (espiga, biomassa, senescência, acamamento)
// e cada componente se divide entre os canais na proporção registrada por planta/crescimento.js.
export function resumoSafra(E, crop, serie, par, { potencial } = {}) {
    const agro = agronomiaDe(crop);
    const prod = agro.produto, P = par.produtividade;
    const cobertura = prod.tipo === 'cobertura';
    const Ypot = potencial ?? prod.potencial;
    const aE = cobertura ? 0 : P.expEspiga;
    const aB = cobertura ? P.expBiomassaCobertura : P.expBiomassa;
    const acMax = par.crescimento.acamamento.maximo;
    const { NP, espiga, hAcc, hPot, senesc, acama, atrib } = E;

    const perdaComp = {};
    for (const X of COMPONENTES) perdaComp[X] = new Float64Array(NCANAIS + 1);   // último índice: sem causa registrada
    let somaY = 0;
    const fat = { espiga: 0, biomassa: 0, senesc: 0, acama: 0 };
    for (let p = 0; p < NP; p++) {
        const rB = hPot[p] > 0 ? hAcc[p] / hPot[p] : 1;
        const fS = clamp(1 - P.kSenesc * senesc[p]), fA = clamp(1 - P.kAcama * Math.min(1, acama[p] / acMax));
        const ln = {
            esp: -aE * Math.log(espiga[p]),
            bio: -aB * Math.log(Math.max(1e-6, rB)),
            sen: -Math.log(Math.max(1e-6, fS)),
            ac: -Math.log(Math.max(1e-6, fA))
        };
        const Y = Ypot * Math.exp(-(ln.esp + ln.bio + ln.sen + ln.ac));
        somaY += Y;
        fat.espiga += espiga[p]; fat.biomassa += rB; fat.senesc += senesc[p]; fat.acama += acama[p];
        const Ltot = ln.esp + ln.bio + ln.sen + ln.ac;
        if (Ltot <= 0) continue;
        const gap = Ypot - Y;
        const o = p * NCANAIS;
        for (const X of COMPONENTES) {
            if (ln[X] <= 0) continue;
            const parte = gap * ln[X] / Ltot;
            let soma = 0;
            for (let k = 0; k < NCANAIS; k++) soma += atrib[X][o + k];
            if (soma <= 0) { perdaComp[X][NCANAIS] += parte; continue; }
            for (let k = 0; k < NCANAIS; k++) perdaComp[X][k] += parte * atrib[X][o + k] / soma;
        }
    }
    const n = Math.max(1, NP);
    for (const X of COMPONENTES) for (let k = 0; k <= NCANAIS; k++) perdaComp[X][k] /= n;
    for (const k in fat) fat[k] /= n;

    const perdas = {}, componentes = {};
    for (let k = 0; k <= NCANAIS; k++) {
        const nome = k < NCANAIS ? CANAIS[k] : 'outros';
        let v = 0;
        for (const X of COMPONENTES) v += perdaComp[X][k];
        if (v > 0) perdas[nome] = v;
    }
    for (const X of COMPONENTES) {
        let v = 0;
        for (let k = 0; k <= NCANAIS; k++) v += perdaComp[X][k];
        if (v > 0) componentes[X] = v;
    }

    // Perda de cada dia por canal: a perda do canal em cada componente, distribuída pelos dias
    // na proporção do dano registrado naquele dia.
    const totDia = {};
    for (const X of COMPONENTES) {
        totDia[X] = new Float64Array(NCANAIS);
        for (const s of serie) for (let k = 0; k < NCANAIS; k++) totDia[X][k] += s.dano[X][k];
    }
    for (const s of serie) {
        const pd = new Float32Array(NCANAIS);
        for (const X of COMPONENTES) for (let k = 0; k < NCANAIS; k++) {
            if (totDia[X][k] > 0) pd[k] += perdaComp[X][k] * s.dano[X][k] / totDia[X][k];
        }
        s.perda = pd;
    }

    return comPercentuais({
        cultura: crop.id, nome: crop.nome, tipo: prod.tipo, unidade: prod.unidade,
        potencial: Ypot, produtividade: somaY / n,
        perdas,          // { canal: unidade/ha }, soma = potencial − produtividade
        componentes,     // { bio | esp | sen | ac: unidade/ha }
        fatores: fat,
        agua: balancoDaSafra(serie, crop, par)   // ETa, ETc, ISNA, chuva, enxurrada, calor e geada
    });
}

// Percentuais sobre o potencial. Não dependem do teto em sc/ha, que é o número menos calibrado:
// "−42 % do potencial" é mais defensável que "−80 sc/ha". Chamar de novo se as perdas mudarem (pragas).
export function comPercentuais(r) {
    const pct = v => 100 * v / r.potencial;
    r.produtividadePct = pct(r.produtividade);
    r.perdaPct = 100 - r.produtividadePct;
    r.perdasPct = Object.fromEntries(Object.entries(r.perdas).map(([k, v]) => [k, pct(v)]));
    r.componentesPct = Object.fromEntries(Object.entries(r.componentes).map(([k, v]) => [k, pct(v)]));
    return r;
}

// Eventos críticos: trechos de dias seguidos em que um canal custou produção.
// Cada evento diz quando, em que fase, quanto custou e como estava o clima naquele trecho.
export function eventosCriticos(serie, crop, resumo, par) {
    const I = par.impacto, Ypot = resumo.potencial;
    const limiar = I.eventoLimiarDia * Ypot, minimo = I.eventoMinimoFrac * Ypot;
    const eventos = [];
    for (let k = 0; k < NCANAIS; k++) {
        const canal = CANAIS[k];
        if (!(resumo.perdas[canal] >= minimo)) continue;
        let ini = -1, fim = -1, calmo = 0;
        const fechar = () => {
            if (ini < 0) return;
            const trecho = serie.slice(ini, fim + 1);
            const perda = trecho.reduce((a, s) => a + s.perda[k], 0);
            if (perda >= minimo) eventos.push(montarEvento(canal, k, trecho, perda, resumo));
            ini = -1; calmo = 0;
        };
        for (let d = 0; d < serie.length; d++) {
            if (serie[d].perda[k] >= limiar) {
                if (ini < 0) ini = d;
                fim = d; calmo = 0;
            } else if (ini >= 0 && ++calmo > I.eventoFolgaDias) fechar();
        }
        fechar();
    }
    return eventos.sort((a, b) => b.perda - a.perda);
}

function montarEvento(canal, k, trecho, perda, resumo) {
    const porFase = new Map();
    for (const s of trecho) porFase.set(s.fase, (porFase.get(s.fase) ?? 0) + s.perda[k]);
    const fasePrincipal = [...porFase.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const nomeFase = trecho.find(s => s.fase === fasePrincipal).faseNome;
    const rotulo = ROTULO_CANAL[canal];
    return {
        canal, rotulo,
        diaInicio: trecho[0].dia, diaFim: trecho[trecho.length - 1].dia,
        fases: [...porFase.keys()], fasePrincipal, faseNome: nomeFase,
        perda, perdaFrac: perda / resumo.potencial, perdaPct: 100 * perda / resumo.potencial, unidade: resumo.unidade,
        chuvaMm: trecho.reduce((a, s) => a + s.chuva, 0),
        tmaxMax: Math.max(...trecho.map(s => s.tmax)),
        ksMin: Math.min(...trecho.map(s => s.ks)),
        agudoMax: Math.max(...trecho.map(s => s.agudo[k])),
        sensMedia: trecho.reduce((a, s) => a + s.sens[k], 0) / trecho.length,
        texto: `${rotulo} em ${nomeFase.toLowerCase()} (dias ${trecho[0].dia}–${trecho[trecho.length - 1].dia}): −${perda.toFixed(1)} ${resumo.unidade} (−${(100 * perda / resumo.potencial).toFixed(0)} % do potencial)`
    };
}
