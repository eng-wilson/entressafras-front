// Adapta a cena ao decêndio. Não usa médias multianuais nem perdas do ciclo inteiro.
import { COBERTURA_MIN } from './indicadores.js';

export function estadoDecendio({ safra, datas, agua, temp, semCultura, periodo }) {
    const datasDoPeriodo = new Set(datas);
    const dias = safra.serie.map((x, dia) => ({ x, dia }))
        .filter(({ dia }) => datasDoPeriodo.has(safra.clima.datas[dia]));
    const coberturas = semCultura ? [] : dias.flatMap(({ x, dia }) => {
        const s1 = safra.sim?.superficie?.[dia]?.S1;
        if (!s1?.length) return [];
        let palha = 0;
        for (let c = 0; c < s1.length; c += 4) palha += s1[c] / 255;
        palha /= s1.length / 4;
        return [1 - (1 - x.cobertura) * (1 - palha)];
    });
    const cobertura = coberturas.length ? coberturas.reduce((a, b) => a + b, 0) / coberturas.length : null;
    const soloEstado = cobertura === null ? 'neu' : cobertura < 0.2 ? 'risk' : cobertura < COBERTURA_MIN ? 'warn' : 'good';
    const pressao = Math.max(0, ...Object.values(safra.pressaoPragas ?? {}));
    const praga = Object.entries(safra.pressaoPragas ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const nomePraga = praga === 'nematoide' ? 'Nematoide' : praga === 'percevejo' ? 'Percevejo' : 'Pragas';
    const referenciaPalha = Math.round(100 * (safra.soloInicial?.palhada ?? 0));
    // Uma ação direta por parâmetro, conforme o estado deste decêndio.
    const soloAcao = cobertura === null
        ? (referenciaPalha >= 100 * COBERTURA_MIN ? 'Mantenha a palhada até o plantio' : 'Semeie uma cobertura antes do próximo plantio')
        : soloEstado === 'good' ? 'Nada a fazer: solo protegido'
        : 'Evite máquinas com solo úmido e cubra o solo logo após a colheita';
    const frequencia = pressao >= 0.5 ? 'toda semana' : 'a cada 15 dias';
    const pragaAcao = praga === 'nematoide'
        ? (semCultura ? 'Amostre solo e raízes para nematoide antes do plantio' : 'Amostre solo e raízes nas manchas de plantas fracas')
        : praga === 'percevejo'
            ? (semCultura ? 'Elimine plantas voluntárias que abrigam percevejo' : `Faça pano de batida para percevejo ${frequencia}`)
            : `Monitore pragas no campo ${frequencia}`;
    return {
        contexto: periodo, cultura: semCultura ? `Entressafra · referência do próximo plantio de ${safra.nome}` : safra.nome,
        sinais: [
            {
                id: 'agua', nome: 'Água', icone: 'i-drop', estado: agua.k,
                estadoRotulo: agua.k === 'good' ? 'Suficiente' : agua.k === 'neu' ? 'Sem demanda' : agua.k === 'warn' ? 'No limite' : 'Em risco',
                medida: 'Necessidade no período', valor: agua.t, leitura: agua.p,
                criterio: semCultura ? 'Chuva e exposição à palhada estimada no próximo plantio; não há demanda de uma cultura neste intervalo.' : 'Água transpirada dividida pela necessidade da cultura, somada nos dias deste decêndio. Falta abaixo de 45%; atenção de 45% a menos de 55%; suficiente a partir de 55%.',
                acao: agua.a ?? 'Acompanhe a cultura nesta fase', momento: periodo
            },
            {
                id: 'solo', nome: 'Solo', icone: 'i-leaf', estado: soloEstado,
                estadoRotulo: cobertura === null ? 'Referência' : soloEstado === 'good' ? 'Coberto' : 'Exposto',
                medida: cobertura === null ? 'Próximo plantio' : 'Cobertura neste decêndio',
                valor: cobertura === null ? `${referenciaPalha}% de palhada no plantio` : `${Math.round(100 * cobertura)}% de cobertura média`,
                leitura: cobertura === null ? 'A cena de entressafra usa o solo estimado no próximo plantio. Não há uma série diária de solo para esta janela.' : `Proteção combinada da vegetação e da palhada nos ${coberturas.length} dias simulados desta janela. Não representa fertilidade nem uma nota geral do solo.`,
                criterio: 'Média da cobertura conjunta da vegetação e da palhada nos retratos diários do decêndio. Favorável a partir de 30%; atenção de 20% a menos de 30%; exposto abaixo de 20%. Sem retratos diários, a referência de plantio fica neutra.',
                acao: soloAcao, momento: semCultura ? 'Antes do próximo plantio' : periodo
            },
            {
                id: 'pragas', nome: 'Pragas', icone: 'i-bug', estado: 'neu', estadoRotulo: 'Base da safra',
                medida: 'Índice no plantio', valor: `${nomePraga}: pressão inicial ${pressao.toFixed(2).replace('.', ',')} de 1`,
                leitura: 'Referência da cultura exibida no ano da cena. O modelo calcula pressão por safra e não estima a evolução de pragas dentro do decêndio.',
                criterio: 'Maior índice de pressão no início desta cultura entre nematoide e percevejo. A barra neutra indica que não há previsão diária de infestação.',
                acao: pragaAcao, momento: periodo
            },
            {
                id: 'temperatura', nome: 'Temperatura', icone: 'i-temp', estado: temp.k,
                estadoRotulo: temp.k === 'good' ? 'Adequada' : temp.k === 'neu' ? 'Estável' : temp.k === 'warn' ? 'Atenção' : 'Em risco',
                medida: 'Extremos neste decêndio', valor: temp.t, leitura: temp.p,
                criterio: 'Extremos de temperatura nos dias desta janela, comparados com os limites da cultura exibida. Na entressafra, considera o calor e a referência de palhada do próximo plantio.',
                acao: temp.a ?? 'Acompanhe a cultura nesta fase', momento: periodo
            }
        ]
    };
}
