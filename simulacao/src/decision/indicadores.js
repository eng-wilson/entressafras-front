// Indicadores de uma rotação para a decisão: produção, compatibilidade com o clima do local, água, solo
// exposto, trajetória da saúde do solo, pragas, forragem e mercado. Sem R$: o edital pede saúde do solo e
// adaptação ao clima; mercado entra como "tem comprador local", informado pelo produtor.
//
//   indicadoresRotacao({ av, trajetoria, fonte, mercadoLocal })
//     av: avaliarRotacao (simulation/comparar.js), N anos medidos, cada um depois de um ano de aquecimento;
//     trajetoria: simulateRotacao com anos seguidos (o solo de um ano passa para o próximo);
//     fonte: fonte de clima (src/climate/fonte-clima.js), para a chuva fora das safras e o início das chuvas.
//   compararProdutividade(avA, avB)   diferença pareada (mesmo ano) em % do potencial, por posição
//   tendenciasClima(fonte)            chuva, temperatura e início das chuvas por ano, com tendência por década
//
// Critérios com fonte:
//   ISNA = ETa/ETc na fase sensível, risco = % de anos abaixo do limiar: método do ZARC (MAPA/Embrapa);
//   classes de risco 20/30/40 %: as do ZARC;
//   início das chuvas: Sivakumar (1988), adaptado (sim/../data/fonteClima.js);
//   solo coberto: ≥ 30 % de cobertura (critério de cultivo conservacionista, USDA NRCS);
//   chuva erosiva: evento ≥ 12,7 mm (Wischmeier & Smith, 1978, USLE).
import { AGRONOMIA } from '../domain/crops/agronomia.js';
import { inicioDasChuvas, diaDoAnoAgricola } from '../climate/fonte-clima.js';

export const LIMIAR_ISNA = 0.55;          // suposição (D): o ZARC define o limiar por cultura e ciclo
export const COBERTURA_MIN = 0.3;
export const CHUVA_EROSIVA_MM = 12.7;
export const FORRAGEIRAS = new Set(['brizantha_marandu', 'brizantha_piata', 'brizantha_paiaguas', 'ruziziensis', 'milheto']);
export const LEGUMINOSAS = new Set(['soja', 'feijao', 'crotalaria_juncea', 'crotalaria_spectabilis', 'crotalaria_ochroleuca']);
// Padrão de mercado local (o produtor muda na tela): grãos de cadeia estabelecida no Cerrado.
export const MERCADO_PADRAO = { soja: true, milho: true, sorgo: true, algodao: true, trigo: false, feijao: true, arroz: false };

const media = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export function quantil(a, q) {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const faixa = a => ({ p10: quantil(a, 0.1), p50: quantil(a, 0.5), p90: quantil(a, 0.9), media: media(a) });

export function classeRiscoZarc(fracAnos) {
    if (fracAnos <= 0.2) return { id: 'baixo', rotulo: 'baixo (≤ 20 %)' };
    if (fracAnos <= 0.3) return { id: 'medio', rotulo: 'médio (20–30 %)' };
    if (fracAnos <= 0.4) return { id: 'alto', rotulo: 'alto (30–40 %)' };
    return { id: 'inapto', rotulo: 'fora da janela (> 40 %)' };
}

export function indicadoresRotacao({ av, trajetoria, fonte, mercadoLocal = MERCADO_PADRAO, limiarIsna = LIMIAR_ISNA }) {
    const rot = av.rotacao;
    const anos = av.anos;
    const n = anos.length;
    const inicioChuvas = new Map(anos.map(a => [a.semente, inicioDasChuvas(fonte, a.semente)]));

    // ---- por safra: produção e compatibilidade com o clima ----
    const safras = rot.safras.map((s, i) => {
        const lista = anos.map(a => a.safras[i]);
        const r0 = lista[0].resumo;
        const grao = r0.tipo !== 'cobertura';
        const pct = lista.map(x => x.resumo.produtividadePct);
        const prod = lista.map(x => x.resumo.produtividade);
        const isna = lista.map(x => x.resumo.agua.isnaCritico);
        const fracSeca = isna.filter(v => v < limiarIsna).length / n;
        const diaPlantio = diaDoAnoAgricola(s.plantio);
        const primavera = s.plantio >= '08-01' && s.plantio <= '12-31';
        const antes = primavera
            ? anos.filter(a => { const d = inicioChuvas.get(a.semente); return d === null || diaPlantio < d; }).length / n
            : null;
        const causas = {};
        for (const x of lista) {
            const top = Object.entries(x.resumo.perdas).sort((a, b) => b[1] - a[1])[0];
            if (top) causas[top[0]] = (causas[top[0]] ?? 0) + 1;
        }
        const agro = AGRONOMIA[s.cultura];
        const canais = new Set(lista.flatMap(x => Object.keys(x.resumo.perdasPct ?? {})));
        const perdasPctMedias = Object.fromEntries([...canais].map(canal => [canal,
            media(lista.map(x => x.resumo.perdasPct?.[canal] ?? 0))
        ]));
        const pragas = new Set(lista.flatMap(x => Object.keys(x.pressaoPragas ?? {})));
        const pressaoPragasMedia = Object.fromEntries([...pragas].map(praga => [praga,
            media(lista.map(x => x.pressaoPragas?.[praga] ?? 0))
        ]));
        return {
            posicao: i, nome: lista[0].nome, cultura: s.cultura, companheira: s.companheira ?? null, plantio: s.plantio,
            cicloDias: lista[0].cicloDias, grao, unidade: r0.unidade, potencial: r0.potencial,
            produtividadePct: faixa(pct), produtividade: faixa(prod),
            anosQuebra: pct.filter(v => v < 70).length / n,          // perda > 30 % do potencial
            isnaCritico: faixa(isna), fracAnosSeca: fracSeca, riscoHidrico: classeRiscoZarc(fracSeca),
            anosGeada: lista.filter(x => x.resumo.agua.diasGeada > 0).length / n,
            diasCalorCritico: media(lista.map(x => x.resumo.agua.diasCalorCritico)),
            plantioAntesDasChuvas: antes,
            etaMm: media(lista.map(x => x.resumo.agua.etaMm)), etcMm: media(lista.map(x => x.resumo.agua.etcMm)),
            causaPrincipal: Object.entries(causas).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
            perdaPragasPct: media(lista.map(x => (x.resumo.perdasPct.nematoide ?? 0) + (x.resumo.perdasPct.percevejo ?? 0))),
            perdasPctMedias, pressaoPragasMedia,
            forrageira: FORRAGEIRAS.has(s.cultura) || FORRAGEIRAS.has(s.companheira),
            leguminosa: LEGUMINOSAS.has(s.cultura) || LEGUMINOSAS.has(s.companheira),
            comVenda: grao && mercadoLocal[s.cultura] !== false,
            residuo: agro.residuo, hospedeiroNematoide: agro.hospedeiro.nematoide
        };
    });

    // ---- por ano agrícola: cobertura do solo, chuva sobre solo exposto, água usada ----
    const porAno = anos.map(a => {
        const cob = new Float32Array(365), palha = new Float32Array(365);
        const inicio = a.safras.map((s, i) => ({ dia: diaDoAnoAgricola(rot.safras[i].plantio), palhada: s.soloInicial?.palhada ?? 0 }));
        // Palhada de um dia: a que a próxima safra encontra no plantio (já decomposta na entressafra).
        for (let d = 0; d < 365; d++) {
            let prox = inicio[0], menor = Infinity;
            for (const s of inicio) { const dist = (s.dia - d + 365) % 365; if (dist < menor) { menor = dist; prox = s; } }
            palha[d] = prox.palhada;
        }
        a.safras.forEach((s, i) => {
            const d0 = inicio[i].dia;
            s.serie.forEach((x, d) => { const k = (d0 + d) % 365; cob[k] = Math.max(cob[k], x.cobertura); });
        });
        const chuva = fonte.safra({ ano: a.semente, plantio: '07-01', dias: 364 }).chuva;
        let exp = 0, chuvaExp = 0, erosiva = 0, chuvaTot = 0;
        for (let d = 0; d < 365; d++) {
            const total = 1 - (1 - cob[d]) * (1 - palha[d]);
            if (total < COBERTURA_MIN) exp++;
            chuvaTot += chuva[d];
            chuvaExp += chuva[d] * (1 - total);
            if (chuva[d] >= CHUVA_EROSIVA_MM) erosiva += chuva[d] * (1 - total);
        }
        const creditoN = a.safras.reduce((acc, s, i) => {
            const R = AGRONOMIA[rot.safras[i].cultura].residuo;
            const comp = rot.safras[i].companheira ? AGRONOMIA[rot.safras[i].companheira].residuo.creditoN * 0.6 : 0;
            return acc + (R.creditoN + comp) * (s.resumo.fatores.biomassa ?? 1);
        }, 0);
        return {
            semente: a.semente, diasExpostos: exp, chuvaMm: chuvaTot, chuvaSoloExpostoMm: chuvaExp, chuvaErosivaExpostaMm: erosiva,
            etaMm: a.safras.reduce((acc, s) => acc + s.resumo.agua.etaMm, 0),
            enxurradaMm: a.safras.reduce((acc, s) => acc + s.resumo.agua.escoamentoMm, 0),
            creditoN
        };
    });

    // ---- trajetória do solo: anos seguidos, do solo de hoje ao fim ----
    const inicios = trajetoria.safras.filter(s => s.posicao === 0);
    const traj = inicios.map(s => ({ ano: s.semente, ...s.soloInicial, nematoide: s.pressaoPragas.nematoide }));
    const delta = k => (traj.length > 1 ? traj[traj.length - 1][k] - traj[0][k] : 0);

    const graos = safras.filter(s => s.grao);
    const forragem = safras.filter(s => FORRAGEIRAS.has(s.cultura)).reduce((acc, s) => acc + s.produtividade.p50, 0);
    return {
        id: rot.id, nome: rot.nome, rotacao: rot, anos: anos.map(a => a.semente), safras, porAno,
        resumo: {
            produtividadePct: media(graos.map(s => s.produtividadePct.p50)),
            piorAnoPct: media(graos.map(s => s.produtividadePct.p10)),
            fracAnosSeca: Math.max(0, ...safras.filter(s => s.grao).map(s => s.fracAnosSeca)),
            etaMm: media(porAno.map(a => a.etaMm)),
            diasExpostos: media(porAno.map(a => a.diasExpostos)),
            chuvaErosivaExpostaMm: media(porAno.map(a => a.chuvaErosivaExpostaMm)),
            chuvaSoloExpostoMm: media(porAno.map(a => a.chuvaSoloExpostoMm)),
            creditoN: media(porAno.map(a => a.creditoN)),
            forragemTha: forragem,
            forragemConsorcio: safras.some(s => FORRAGEIRAS.has(s.companheira)),
            safrasComVenda: safras.filter(s => s.comVenda).length, totalSafras: safras.length,
            deltaMo: delta('mo'), deltaCompactacao: delta('compactacao'), deltaPalhada: delta('palhada'),
            moRelPct: traj.length > 1 && traj[0].mo > 0 ? 100 * delta('mo') / traj[0].mo : 0,
            compactacaoRelPct: traj.length > 1 && traj[0].compactacao > 0 ? 100 * delta('compactacao') / traj[0].compactacao : 0,
            deltaBiologia: delta('biologia'), nematoideFinal: traj.length ? traj[traj.length - 1].nematoide : 0,
            deltaNematoide: delta('nematoide')
        },
        trajetoria: traj
    };
}

// Diferença pareada (mesmo ano, mesmo clima) de B contra A, em pontos do % do potencial, nas posições em que
// as duas rotações têm a mesma cultura (o efeito da rotação na soja seguinte, por exemplo).
export function compararProdutividade(avA, avB) {
    const out = [];
    avA.rotacao.safras.forEach((sa, i) => {
        const sb = avB.rotacao.safras[i];
        if (!sb || sa.cultura !== sb.cultura) return;
        const d = avA.anos.map((a, y) => avB.anos[y].safras[i].resumo.produtividadePct - a.safras[i].resumo.produtividadePct);
        const f = faixa(d);
        out.push({
            posicao: i, cultura: sa.cultura, nome: avB.anos[0].safras[i].nome, deltaPp: f,
            anosBMelhor: d.filter(x => x > 0.5).length, totalAnos: d.length,
            semDiferenca: f.p10 < 0 && f.p90 > 0 && Math.abs(f.p50) < 2
        });
    });
    return out;
}

// Tendência do clima do local (edital: "long-term water trends"): por ano agrícola, chuva total, Tmax média,
// dias com Tmax ≥ 34 °C e início das chuvas; inclinação por década por mínimos quadrados.
export function tendenciasClima(fonte) {
    const anos = fonte.anos.map(a => {
        const c = fonte.safra({ ano: a, plantio: '07-01', dias: 364 });
        return {
            ano: a,
            chuvaMm: c.chuva.reduce((x, y) => x + y, 0),
            tmaxMedia: media(c.tmax),
            diasQuentes: c.tmax.filter(t => t >= 34).length,
            inicioChuvas: inicioDasChuvas(fonte, a)
        };
    });
    const incl = k => {
        const pts = anos.filter(a => a[k] !== null);
        const mx = media(pts.map(a => a.ano)), my = media(pts.map(a => a[k]));
        let num = 0, den = 0;
        for (const a of pts) { num += (a.ano - mx) * (a[k] - my); den += (a.ano - mx) ** 2; }
        return den > 0 ? 10 * num / den : 0;
    };
    const ini = anos.map(a => a.inicioChuvas).filter(v => v !== null);
    return {
        anos,
        porDecada: { chuvaMm: incl('chuvaMm'), tmaxMedia: incl('tmaxMedia'), diasQuentes: incl('diasQuentes'), inicioChuvas: incl('inicioChuvas') },
        inicioChuvas: { p20: quantil(ini, 0.2), p50: quantil(ini, 0.5), p80: quantil(ini, 0.8) }
    };
}
