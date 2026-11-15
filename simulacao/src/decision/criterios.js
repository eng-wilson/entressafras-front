// Decisão: critérios, prioridades do produtor, ordem das rotações e o cartão de cada rotação no formato do
// edital (raciocínio, evidência, benefícios, lacunas, riscos que pedem revisão local). Puro, sem DOM.
//
//   CRITERIOS               o que se mede, de onde vem, sentido (maior ou menor é melhor) e limiar de empate
//   PRIORIDADES             o que o produtor pesa (0 a 3), ligado aos critérios
//   ordenar(inds, pesos)    nota 0..1 por rotação, com os valores reais ao lado (nada escondido na nota)
//   cartao(ind, atual, ctx) texto do cartão, gerado só a partir dos indicadores
import { ROTULO_CAUSA } from '../simulation/comparar.js';

const pct = v => `${Math.round(v)} %`;
const pp = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} pp`;
const principal = ind => ind.safras[0];

// Cada critério: valor(ind), sentido (+1 maior é melhor, −1 menor é melhor), empate (diferença que não conta),
// formato, nível de confiança da origem (A medido, B publicado, C calibrado, D suposição).
export const CRITERIOS = {
    producao: {
        rotulo: 'Cultura principal: % do potencial (mediana)', valor: ind => principal(ind).produtividadePct.p50,
        sentido: +1, empate: 2, fmt: pct, nivel: 'C', fonte: 'simulação com clima NASA POWER; resposta à seca calibrada (Embrapa)'
    },
    estabilidade: {
        rotulo: 'Cultura principal: % do potencial no pior ano (p10)', valor: ind => principal(ind).produtividadePct.p10,
        sentido: +1, empate: 3, fmt: pct, nivel: 'C', fonte: 'mesma simulação, faixa dos anos'
    },
    risco_clima: {
        rotulo: 'Anos com falta de água na fase crítica (pior safra de grão)', valor: ind => ind.resumo.fracAnosSeca * 100,
        sentido: -1, empate: 5, fmt: pct, nivel: 'B', fonte: 'ISNA = ETa/ETc na fase sensível, método do ZARC'
    },
    agua: {
        rotulo: 'Água transpirada pela rotação (mm/ano)', valor: ind => ind.resumo.etaMm,
        sentido: -1, empate: 25, fmt: v => `${Math.round(v)} mm`, nivel: 'B', fonte: 'ETa = ET0 · Kc · Ks (FAO-56), ET0 Penman-Monteith do POWER'
    },
    solo_exposto: {
        rotulo: 'Dias de solo descoberto por ano (< 30 % de cobertura)', valor: ind => ind.resumo.diasExpostos,
        sentido: -1, empate: 7, fmt: v => `${Math.round(v)} d`, nivel: 'D', fonte: 'cobertura do dossel + palhada; critério de 30 % (USDA NRCS)'
    },
    erosao: {
        rotulo: 'Chuva erosiva sobre solo exposto (mm/ano)', valor: ind => ind.resumo.chuvaErosivaExpostaMm,
        sentido: -1, empate: 15, fmt: v => `${Math.round(v)} mm`, nivel: 'D', fonte: 'eventos ≥ 12,7 mm (USLE) × fração descoberta; chuva NASA POWER'
    },
    materia_organica: {
        rotulo: 'Matéria orgânica 0–30 cm (variação no período)', valor: ind => ind.resumo.moRelPct,
        sentido: +1, empate: 0.5, fmt: v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} %`, nivel: 'D', fonte: 'palhada que entra no solo (entressafra)'
    },
    compactacao: {
        rotulo: 'Compactação 0–30 cm (variação no período)', valor: ind => ind.resumo.compactacaoRelPct,
        sentido: -1, empate: 5, fmt: v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)} %`, nivel: 'D', fonte: 'raiz da safra anterior desfaz a camada densa; rastro de colheita soma'
    },
    nitrogenio: {
        rotulo: 'N deixado por leguminosa (índice por ano)', valor: ind => ind.resumo.creditoN * 100,
        sentido: +1, empate: 2, fmt: v => v.toFixed(0), nivel: 'D', fonte: 'crédito de N do resíduo (domain/crops/agronomia.js)'
    },
    pragas: {
        rotulo: 'Pressão de nematoide no fim do período (0–100)', valor: ind => ind.resumo.nematoideFinal * 100,
        sentido: -1, empate: 5, fmt: v => v.toFixed(0), nivel: 'D', fonte: 'índice de hospedeiro (Embrapa Soja: Pratylenchus); não calibrado'
    },
    forragem: {
        rotulo: 'Forragem na entressafra (t/ha MS)', valor: ind => ind.resumo.forragemTha + (ind.resumo.forragemConsorcio ? 3 : 0),
        sentido: +1, empate: 1, fmt: v => `${v.toFixed(1)} t`, nivel: 'D', fonte: 'biomassa simulada da forrageira; consórcio: 3 t/ha (suposição)'
    },
    mercado: {
        rotulo: 'Safras por ano com venda no mercado local', valor: ind => ind.resumo.safrasComVenda,
        sentido: +1, empate: 0.5, fmt: v => `${v}`, nivel: 'A', fonte: 'informado pelo produtor'
    },
    // Culturas da rotação que o produtor nunca registrou no histórico (de qualquer talhão). Calculado na tela
    // (resumo.culturasNovas), porque depende do histórico, não da simulação. Sem histórico, todas empatam.
    facilidade: {
        rotulo: 'Culturas que você ainda não plantou', valor: ind => ind.resumo.culturasNovas ?? 0,
        sentido: -1, empate: 0.5, fmt: v => (v ? `${v} nova${v > 1 ? 's' : ''}` : 'Já conhece'), nivel: 'A', fonte: 'histórico de safras informado pelo produtor'
    }
};

// Prioridades do edital (água, forragem, fixação de N, erosão, matéria orgânica, mercado) + produção, clima,
// estrutura do solo e pragas. Peso 0 a 3.
export const PRIORIDADES = {
    producao: { rotulo: 'Produção da cultura principal', criterios: ['producao', 'estabilidade'], padrao: 2 },
    clima: { rotulo: 'Segurança contra seca', criterios: ['risco_clima'], padrao: 2 },
    agua: { rotulo: 'Economizar água', criterios: ['agua'], padrao: 1 },
    erosao: { rotulo: 'Controle de erosão', criterios: ['solo_exposto', 'erosao'], padrao: 2 },
    materia_organica: { rotulo: 'Matéria orgânica', criterios: ['materia_organica'], padrao: 1 },
    estrutura: { rotulo: 'Descompactar o solo', criterios: ['compactacao'], padrao: 1 },
    nitrogenio: { rotulo: 'Fixação de N', criterios: ['nitrogenio'], padrao: 1 },
    pragas: { rotulo: 'Quebrar ciclo de pragas', criterios: ['pragas'], padrao: 1 },
    forragem: { rotulo: 'Forragem para o gado', criterios: ['forragem'], padrao: 0 },
    mercado: { rotulo: 'Venda da safrinha', criterios: ['mercado'], padrao: 1 },
    facilidade: { rotulo: 'Facilidade (culturas que já conhece)', criterios: ['facilidade'], padrao: 0 }
};

export function pesosPadrao() {
    return Object.fromEntries(Object.entries(PRIORIDADES).map(([k, p]) => [k, p.padrao]));
}

// Nota de cada rotação: média ponderada dos critérios normalizados entre as rotações (0 = pior, 1 = melhor).
// Critério em que todas ficam dentro do limiar de empate não separa ninguém (vale 0,5 para todas).
export function ordenar(inds, pesos) {
    const tabela = {};
    for (const [id, c] of Object.entries(CRITERIOS)) {
        const v = inds.map(c.valor);
        const lo = Math.min(...v), hi = Math.max(...v);
        const empate = hi - lo < c.empate;
        tabela[id] = { valores: v, empate, norm: v.map(x => (empate ? 0.5 : c.sentido > 0 ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo))) };
    }
    const peso = {};
    for (const [p, def] of Object.entries(PRIORIDADES)) for (const c of def.criterios) peso[c] = (peso[c] ?? 0) + (pesos[p] ?? 0) / def.criterios.length;
    const somaPeso = Object.values(peso).reduce((a, b) => a + b, 0) || 1;
    const notas = inds.map((ind, i) => {
        let s = 0;
        const contrib = {};
        for (const c of Object.keys(CRITERIOS)) { const v = (peso[c] ?? 0) * tabela[c].norm[i]; s += v; contrib[c] = v / somaPeso; }
        return { id: ind.id, nota: s / somaPeso, contrib };
    });
    const ordem = notas.map((n, i) => ({ ...n, i })).sort((a, b) => b.nota - a.nota);
    // Empate técnico: diferença de nota menor que 0,05 entre as duas primeiras.
    const empateTopo = ordem.length > 1 && ordem[0].nota - ordem[1].nota < 0.05;
    return { tabela, peso, ordem, empateTopo };
}

// Diferenças contra a rotação atual que passam do limiar de empate, ordenadas pelo peso do produtor.
function diferencas(ind, atual, peso) {
    const out = [];
    for (const [id, c] of Object.entries(CRITERIOS)) {
        const a = c.valor(atual), b = c.valor(ind);
        const d = b - a;
        if (Math.abs(d) < c.empate) continue;
        out.push({ id, c, a, b, melhor: d * c.sentido > 0, peso: peso[id] ?? 0 });
    }
    return out.sort((x, y) => y.peso - x.peso || Math.abs(y.b - y.a) - Math.abs(x.b - x.a));
}

function raciocinio(ind) {
    const partes = [];
    for (const s of ind.safras) {
        const R = s.residuo, txt = [];
        if (s.hospedeiroNematoide <= 0.2) txt.push('não multiplica o nematoide (quebra o ciclo)');
        if (s.leguminosa && s.posicao > 0) txt.push('leguminosa: deixa N para a próxima safra');
        if (R.descompacta >= 0.2 || s.companheira?.startsWith('brizantha')) txt.push('raiz agressiva rompe camada compactada');
        if (R.palhada >= 0.7 || s.companheira?.startsWith('brizantha')) txt.push('palhada abundante e duradoura protege o solo na seca');
        if (s.forrageira && s.posicao > 0) txt.push('serve de forragem na entressafra');
        if (s.grao && s.posicao > 0) txt.push('gera grão para venda na safrinha');
        if (!s.grao) txt.push('cobertura, sem venda');
        if (txt.length) partes.push(`${s.nome} (plantio ${s.plantio.split('-').reverse().join('/')}): ${txt.join('; ')}.`);
    }
    return partes.join(' ');
}

// ctx: { fonte: { origem, anos }, solo: respostasSolo(...), cenario, limiarIsna }
export function cartao(ind, atual, ctx, peso = {}) {
    const ehAtual = ind.id === atual.id;
    const difs = ehAtual ? [] : diferencas(ind, atual, peso);
    const beneficios = difs.filter(d => d.melhor).slice(0, 4).map(d => `${d.c.rotulo}: ${d.c.fmt(d.b)} (atual ${d.c.fmt(d.a)})`);
    const piores = difs.filter(d => !d.melhor).slice(0, 3).map(d => `${d.c.rotulo}: ${d.c.fmt(d.b)} (atual ${d.c.fmt(d.a)})`);
    for (const cmp of ind.comparacao ?? []) {
        if (cmp.semDiferenca) continue;
        const t = `${cmp.nome}: ${pp(cmp.deltaPp.p50)} do potencial contra a atual (faixa ${pp(cmp.deltaPp.p10)} a ${pp(cmp.deltaPp.p90)}; melhor em ${cmp.anosBMelhor} de ${cmp.totalAnos} anos, mesmo clima)`;
        (cmp.deltaPp.p50 > 0 ? beneficios : piores).unshift(t);
    }

    const riscos = [...piores];
    for (const s of ind.safras) {
        if (s.grao && ['alto', 'inapto'].includes(s.riscoHidrico.id)) riscos.push(`${s.nome}: falta de água na fase crítica em ${pct(100 * s.fracAnosSeca)} dos anos (risco ${s.riscoHidrico.rotulo}). Conferir o ZARC do município para esta data.`);
        if (s.anosGeada > 0.1) riscos.push(`${s.nome}: geada em ${pct(100 * s.anosGeada)} dos anos.`);
        if (s.plantioAntesDasChuvas > 0.3) riscos.push(`${s.nome}: em ${pct(100 * s.plantioAntesDasChuvas)} dos anos o plantio cai antes do início das chuvas (risco de replantio).`);
        if (s.diasCalorCritico >= 3) riscos.push(`${s.nome}: ${s.diasCalorCritico.toFixed(0)} dias/ano de calor acima do limite na fase sensível.`);
        if (s.grao && !s.comVenda) riscos.push(`${s.nome}: sem mercado local marcado.`);
        if (s.forrageira && (s.cultura === 'crotalaria_spectabilis' || s.companheira === 'crotalaria_spectabilis')) riscos.push(`${s.nome}: crotalária spectabilis é tóxica para o gado (alcaloides). Não pastejar o consórcio.`);
    }
    if (!ind.safras.some(s => s.posicao > 0 && s.grao)) riscos.push('Sem receita na safrinha: a cobertura se paga pela soja seguinte e pelo solo, não pela venda.');

    const anos = ctx.fonte.anos;
    const evidencias = [
        `Clima: ${ctx.fonte.origem}, ${anos.length} safras (${anos[0]}/${anos[0] + 1} a ${anos.at(-1)}/${anos.at(-1) + 1}). Mesmo clima para todas as rotações.`,
        'ET0 FAO-56 Penman-Monteith (radiação, umidade e vento do POWER); ETa = ET0 · Kc · Ks.',
        'Falta de água na fase crítica: ISNA (ETa/ETc), o índice do ZARC (MAPA/Embrapa).',
        'Resposta à seca na floração, à compactação e ao alumínio: calibrada contra ensaios da Embrapa (test/sim-faixas.mjs).',
        'Início das chuvas: critério de Sivakumar (1988).'
    ];
    if (ind.safras.some(s => s.hospedeiroNematoide <= 0.2)) evidencias.push('Crotalária spectabilis como não hospedeira de Pratylenchus: Embrapa Soja (manejo do nematoide das lesões).');
    if (ctx.cenario) evidencias.push(`Cenário climático aplicado: ${ctx.cenario.descricao} (método delta sobre o clima observado).`);

    const lacunas = [
        'Pragas: índice simplificado, não calibrado (nível D).',
        'Matéria orgânica, N e compactação: direção confiável, magnitude é suposição (nível D).',
        'Potencial em sc/ha é referência regional, não da sua cultivar.',
        'Ciclo em dias fixos: aquecimento não encurta o ciclo no modelo (falta graus-dia).',
        'Chuva do POWER é média de uma grade de cerca de 50 km: um pluviômetro na fazenda vale mais.'
    ];
    const informados = Object.entries(ctx.solo).filter(([, r]) => r.origem === 'padrão').map(([k]) => k);
    if (informados.length) lacunas.unshift(`Solo: ${informados.join(', ')} em valor padrão. Informe o laudo para tirar a dúvida.`);
    if (ind.safras.some(s => s.companheira)) lacunas.push('Consórcio: a competição entre as duas plantas não é simulada.');

    const revisao = [];
    for (const s of ind.safras) if (s.grao && s.posicao > 0) revisao.push(`Data de plantio de ${s.nome} contra o ZARC do município e o ciclo da cultivar.`);
    if (ind.safras.some(s => !s.grao)) revisao.push('Espécie e densidade da cobertura com o agrônomo; dessecação antes da soja.');
    if (ind.resumo.nematoideFinal > 0.5 || ind.safras.some(s => s.hospedeiroNematoide <= 0.2)) revisao.push('Laudo nematológico do talhão antes e depois da rotação.');
    revisao.push('Comprador e logística para cada produto vendido.');

    const causa = principal(ind).causaPrincipal;
    return {
        id: ind.id, nome: ind.nome, atual: ehAtual,
        raciocinio: raciocinio(ind) + (causa ? ` No período, a maior perda da cultura principal foi ${ROTULO_CAUSA[causa]?.toLowerCase() ?? causa}.` : ''),
        evidencias, beneficios, riscos, lacunas, revisao
    };
}
