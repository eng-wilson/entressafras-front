// Panorama da sugestão inteira. Só recebe os indicadores multianuais da rotação:
// ano, cultura e decêndio da cena não participam desta leitura.
import { LIMIAR_ISNA } from './indicadores.js';

const numero = (v, casas = 0) => Number(v).toFixed(casas).replace('.', ',');
const percentual = v => `${numero(100 * v)}%`;
const perda = (s, canais) => canais.reduce((v, c) => v + (s.perdasPctMedias?.[c] ?? 0), 0);
const pior = (safras, valor) => safras.reduce((a, b) => valor(b) > valor(a) ? b : a);
const faixaAgua = s => s.fracAnosSeca <= 0.2 ? 'good' : s.fracAnosSeca <= 0.3 ? 'warn' : 'risk';
const faixaTemp = s => s.diasCalorCritico >= 3 || s.anosGeada >= 0.2 ? 'risk'
    : s.diasCalorCritico >= 1 || s.anosGeada >= 0.1 ? 'warn' : 'good';
const ordem = { good: 0, neu: 0, warn: 1, risk: 2 };
const nomesPragas = { nematoide: 'Nematoide', percevejo: 'Percevejo' };
const pressao = s => Math.max(0, ...Object.values(s.pressaoPragasMedia ?? {}));

export function panoramaRotacao(ind) {
    if (!ind?.safras?.length) return { sinais: [], alertas: [], acoes: { itens: [], semAjuste: [] } };
    const safras = ind.safras;
    const n = ind.anos.length;
    const anos = [...ind.anos].sort((a, b) => a - b);
    const contexto = `${n} anos agrícolas · ${anos[0]}/${String(anos[0] + 1).slice(-2)} a ${anos.at(-1)}/${String(anos.at(-1) + 1).slice(-2)}`;
    const agua = pior(safras, s => s.fracAnosSeca);
    const temp = pior(safras, s => ordem[faixaTemp(s)] * 10000 + s.diasCalorCritico + s.anosGeada);
    const praga = pior(safras, pressao);
    const pragaNome = nomesPragas[Object.entries(praga.pressaoPragasMedia ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? 'Pragas';
    const dias = ind.resumo.diasExpostos;
    const diasAno = `${numero(dias)} ${Math.round(dias) === 1 ? 'dia' : 'dias'}/ano`;
    const soloEstado = dias <= 5 ? 'good' : dias <= 20 ? 'warn' : 'risk';
    const pragaEstado = pressao(praga) >= 0.7 ? 'risk' : pressao(praga) >= 0.5 ? 'warn' : 'good';
    const soloAcao = soloEstado === 'good' ? 'Mantenha a cobertura entre todas as culturas' : 'Reduza os intervalos sem cobertura com palhada e plantas de cobertura';
    const aguaAcao = 'Revise as datas de plantio de cada cultura e conserve água com palhada';
    const tempAcao = 'Revise as datas de plantio para afastar as fases sensíveis dos extremos';
    const pragaAcao = 'Diversifique as culturas hospedeiras e confira a pressão de pragas no campo';

    const sinais = [
        {
            id: 'agua', nome: 'Água', icone: 'i-drop', estado: faixaAgua(agua),
            estadoRotulo: faixaAgua(agua) === 'good' ? 'Risco baixo' : faixaAgua(agua) === 'warn' ? 'Risco médio' : 'Risco alto',
            medida: 'Seca na fase crítica', valor: `Até ${percentual(agua.fracAnosSeca)} dos anos com seca`,
            leitura: `${agua.nome} tem a maior frequência de falta de água entre as culturas da sugestão. Cada cultura é avaliada da semeadura à colheita nos ${n} anos simulados.`,
            criterio: `Faixa pela cultura com maior risco: baixo até 20% dos anos; médio até 30%; alto acima de 30%. Seca significa ISNA abaixo de ${numero(LIMIAR_ISNA, 2)} na fase crítica; não é a porcentagem de água disponível hoje.`,
            evidencias: safras.map(s => ({ nome: s.nome, valor: `${percentual(s.fracAnosSeca)} dos anos com seca`, detalhe: `ISNA mediano na fase crítica: ${numero(s.isnaCritico.p50, 2)} · perda média por falta ou excesso de água: ${numero(perda(s, ['agua_deficit', 'agua_excesso']), 1)}% do potencial desta cultura` })),
            acao: aguaAcao, momento: 'Antes de definir o calendário completo da rotação'
        },
        {
            id: 'solo', nome: 'Solo', icone: 'i-leaf', estado: soloEstado,
            estadoRotulo: soloEstado === 'good' ? 'Bem coberto' : soloEstado === 'warn' ? 'Atenção' : 'Exposto',
            medida: 'Cobertura no ano inteiro', valor: `${diasAno} de solo descoberto`,
            leitura: `Média dos ${n} anos agrícolas, incluindo os intervalos entre culturas. Considera a proteção conjunta da vegetação e da palhada. Esta barra representa cobertura, não uma nota geral de fertilidade.`,
            criterio: 'Solo descoberto: cobertura abaixo de 30%. Faixa visual favorável até 5 dias/ano; atenção até 20; exposto acima de 20.',
            evidencias: [{ nome: 'Chuva sobre solo sem proteção', valor: `${numero(ind.resumo.chuvaSoloExpostoMm)} mm/ano`, detalhe: 'Média anual da parcela de chuva que atinge solo sem cobertura.' }],
            acao: soloAcao, momento: 'Planeje também os intervalos entre colheita e plantio'
        },
        {
            id: 'pragas', nome: 'Pragas', icone: 'i-bug', estado: pragaEstado,
            estadoRotulo: pragaEstado === 'good' ? 'Pressão baixa' : pragaEstado === 'warn' ? 'Pressão média' : 'Pressão alta',
            medida: 'Pressão ao iniciar as culturas', valor: `${numero(pressao(praga), 2)} de 1 · maior pressão média`,
            leitura: `${pragaNome} em ${praga.nome}: maior índice médio no plantio entre todas as culturas e pragas simuladas. Cada média usa os ${n} anos; não é uma contagem de insetos neste decêndio.`,
            criterio: 'Faixa pelo maior índice médio: baixa abaixo de 0,50; média de 0,50 a menos de 0,70; alta a partir de 0,70. Modelo simplificado de nematoide e percevejo, sem calibração local.',
            evidencias: safras.map(s => ({ nome: s.nome, valor: `Pressão média máxima: ${numero(pressao(s), 2)} de 1`, detalhe: `Perda média por pragas: ${numero(s.perdaPragasPct, 1)}% do potencial desta cultura` })),
            acao: pragaAcao, momento: 'Ao escolher a sequência completa de culturas'
        },
        {
            id: 'temperatura', nome: 'Temperatura', icone: 'i-temp', estado: faixaTemp(temp),
            estadoRotulo: faixaTemp(temp) === 'good' ? 'Risco baixo' : faixaTemp(temp) === 'warn' ? 'Atenção' : 'Risco alto',
            medida: 'Extremos no ciclo das culturas', valor: `Maior atenção: ${temp.nome}`,
            leitura: `Considera calor na fase sensível e geada durante os ciclos completos de todas as culturas, nos ${n} anos. A barra segue a cultura na faixa mais grave.`,
            criterio: 'Atenção: pelo menos 1 dia de calor crítico por ciclo, em média, ou geada em 10% dos anos. Risco alto: pelo menos 3 dias de calor ou geada em 20% dos anos. Limites de temperatura específicos de cada cultura.',
            evidencias: safras.map(s => ({ nome: s.nome, valor: `${numero(s.diasCalorCritico, 1)} dias de calor crítico/ciclo`, detalhe: `Média nos anos simulados · geada em ${percentual(s.anosGeada)} dos anos · perda térmica média: ${numero(perda(s, ['calor', 'frio']), 1)}% do potencial desta cultura` })),
            acao: tempAcao, momento: 'Antes de definir as datas de plantio da rotação'
        }
    ];

    // Mantém os riscos por cultura: não soma percentuais com potenciais distintos.
    const alertas = [];
    for (const s of safras) {
        const aguaPerda = perda(s, ['agua_deficit', 'agua_excesso']);
        if (s.fracAnosSeca >= 0.1 || aguaPerda > 0.45) alertas.push({
            id: `agua-${s.posicao}`, icone: 'i-drop', titulo: `${s.nome} · estresse hídrico`,
            estado: faixaAgua(s) === 'risk' ? 'risk' : 'warn', impactoPct: aguaPerda,
            resumo: `Seca na fase crítica em ${percentual(s.fracAnosSeca)} dos anos`, acao: aguaAcao,
            quando: `Planejar a janela de plantio de ${s.nome}`
        });
        const tempPerda = perda(s, ['calor', 'frio']);
        if (faixaTemp(s) !== 'good' || tempPerda > 0.45) alertas.push({
            id: `temperatura-${s.posicao}`, icone: 'i-temp', titulo: `${s.nome} · extremos térmicos`,
            estado: faixaTemp(s) === 'risk' ? 'risk' : 'warn', impactoPct: tempPerda,
            resumo: `${numero(s.diasCalorCritico, 1)} dias de calor crítico/ciclo · geada em ${percentual(s.anosGeada)} dos anos`,
            acao: tempAcao, quando: `Planejar a janela de plantio de ${s.nome}`
        });
        if (pressao(s) >= 0.5 || s.perdaPragasPct > 0.45) alertas.push({
            id: `pragas-${s.posicao}`, icone: 'i-bug', titulo: `${s.nome} · pragas`,
            estado: pressao(s) >= 0.7 ? 'risk' : 'warn', impactoPct: s.perdaPragasPct,
            resumo: `Pressão média no plantio: ${numero(pressao(s), 2)} de 1`,
            acao: pragaAcao, quando: `Rever as culturas anteriores a ${s.nome}`
        });
    }
    if (soloEstado !== 'good') alertas.push({
        id: 'solo-rotacao', icone: 'i-leaf', titulo: 'Intervalos com solo descoberto', estado: soloEstado,
        resumo: `${diasAno}, em média`, impactoPct: null,
        acao: soloAcao, quando: 'Planejar a cobertura entre todas as culturas'
    });
    alertas.sort((a, b) => ordem[b.estado] - ordem[a.estado] || (b.impactoPct ?? 0) - (a.impactoPct ?? 0));
    return {
        id: ind.id, nome: ind.nome, contexto,
        culturas: safras.map(s => s.nome).join(' → '),
        preservado: safras.some(s => s.grao) ? ind.resumo.produtividadePct : null,
        // Produtividade estimada por cultura, na unidade dela (sc/ha, @/ha ou t/ha de massa seca).
        producao: safras.map(s => ({
            posicao: s.posicao, nome: s.nome, grao: s.grao, unidade: s.unidade, potencial: s.potencial,
            p10: s.produtividade.p10, p50: s.produtividade.p50, p90: s.produtividade.p90,
            pctPotencial: s.produtividadePct.p50
        })),
        sinais, alertas, acoes: acoesPorParametro(safras, alertas, diasAno)
    };
}

// Uma ação por parâmetro para o plano da rotação, juntando as culturas afetadas.
// Perdas continuam por cultura: mostra a maior, sem somar potenciais distintos.
const PARAMETROS = [['agua', 'Água', 'i-drop'], ['solo', 'Solo', 'i-leaf'], ['pragas', 'Pragas', 'i-bug'], ['temperatura', 'Temperatura', 'i-temp']];
const lista = nomes => nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
const pragaDominante = s => Object.entries(s.pressaoPragasMedia ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];

function acoesPorParametro(safras, alertas, diasAno) {
    const acoes = [], semAjuste = [];
    for (const [id, nome, icone] of PARAMETROS) {
        // Pragas em cobertura não pedem ação: a cultura não é colhida.
        const grupo = alertas.filter(a => a.id.startsWith(`${id}-`)
            && (id !== 'pragas' || safras.find(s => a.id === `pragas-${s.posicao}`)?.grao));
        if (!grupo.length) { semAjuste.push(nome); continue; }
        const afetadas = safras.filter(s => grupo.some(a => a.id === `${id}-${s.posicao}`));
        const culturas = lista(afetadas.map(s => s.nome));
        const estado = grupo.some(a => a.estado === 'risk') ? 'risk' : 'warn';
        const perdaMax = Math.max(0, ...grupo.map(a => a.impactoPct ?? 0));
        const perdaTxt = perdaMax > 0.45 ? ` · perda média de até ${numero(perdaMax, perdaMax >= 10 ? 0 : 1)}%` : '';
        let acao, motivo;
        if (id === 'agua') {
            acao = `Ajuste o plantio de ${culturas} para a fase crítica cair no período mais chuvoso`;
            motivo = `Seca na fase crítica em até ${percentual(Math.max(...afetadas.map(s => s.fracAnosSeca)))} dos anos${perdaTxt}`;
        } else if (id === 'temperatura') {
            const geada = afetadas.some(s => s.anosGeada >= 0.1), calor = afetadas.some(s => s.diasCalorCritico >= 1);
            acao = `Mude a data de plantio de ${culturas} para a fase sensível fugir ${geada && !calor ? 'da geada' : calor && !geada ? 'do calor' : 'do calor e da geada'}`;
            motivo = [calor && `até ${numero(Math.max(...afetadas.map(s => s.diasCalorCritico)), 1)} dias de calor crítico por ciclo`,
                geada && `geada em até ${percentual(Math.max(...afetadas.map(s => s.anosGeada)))} dos anos`].filter(Boolean).join(' · ') || 'Perda por extremos térmicos';
            motivo = motivo[0].toUpperCase() + motivo.slice(1) + perdaTxt;
        } else if (id === 'pragas') {
            const nematoide = afetadas.filter(s => pragaDominante(s) === 'nematoide').map(s => s.nome);
            const percevejo = afetadas.filter(s => pragaDominante(s) !== 'nematoide').map(s => s.nome);
            acao = [nematoide.length && `Antes de ${lista(nematoide)}, use uma cultura que não multiplique nematoide`,
                percevejo.length && `${nematoide.length ? 'm' : 'M'}onitore percevejo desde a emergência de ${lista(percevejo)}`].filter(Boolean).join('; ');
            motivo = `Pressão no plantio de até ${numero(Math.max(...afetadas.map(pressao)), 2)} de 1${perdaTxt}`;
        } else {   // solo: um único alerta da rotação ('solo-rotacao')
            acao = 'Semeie uma cobertura logo após cada colheita';
            motivo = `${diasAno[0].toUpperCase()}${diasAno.slice(1)} de solo descoberto, em média`;
        }
        acoes.push({ id, nome, icone, estado, acao, motivo });
    }
    acoes.sort((a, b) => ordem[b.estado] - ordem[a.estado]);
    return { itens: acoes, semAjuste };
}
