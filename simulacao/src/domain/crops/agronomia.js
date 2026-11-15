// Dados agronômicos de resultado, por cultura: o que a safra produz, o que deixa no solo para a próxima
// e quanto hospeda e sofre com pragas. Lidos por simulation/impacto.js, simulation/solo/entressafra.js e simulation/pragas.js.
// Valores de referência para comparar rotações, não para previsão agronômica.
//
// produto.tipo: 'grao' (unidade comercial por ha) ou 'cobertura' (massa seca, t/ha, sem venda).
// produto.potencial: teto com manejo bom e sem estresse, sequeiro no Cerrado.
// residuo.palhada: cobertura do solo (0..1) deixada pela safra com biomassa cheia.
// residuo.meiaVidaDias: meia-vida da palhada na entressafra (leguminosa some rápido, braquiária dura).
// residuo.creditoN: N (escala 0..1 do estado) deixado para a próxima safra com biomassa cheia.
// residuo.descompacta: fração da compactação desfeita nas camadas onde a raiz chegou.
// hospedeiro: quanto a cultura multiplica cada praga (0 não hospeda, 1 boa hospedeira).
// sensPragas: perda máxima de produtividade com pressão 1.

const graoPadrao = { nematoide: 0.08, percevejo: 0.03 };

export const AGRONOMIA = {
    milho: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 190 },
        residuo: { palhada: 0.6, meiaVidaDias: 110, creditoN: 0, descompacta: 0.06 },
        hospedeiro: { nematoide: 0.9, percevejo: 0.6 }, sensPragas: { nematoide: 0.12, percevejo: 0.12 }
    },
    sorgo: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 95 },
        residuo: { palhada: 0.55, meiaVidaDias: 110, creditoN: 0, descompacta: 0.12 },
        hospedeiro: { nematoide: 0.6, percevejo: 0.4 }, sensPragas: { nematoide: 0.06, percevejo: 0.04 }
    },
    milheto: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 9 },
        residuo: { palhada: 0.7, meiaVidaDias: 100, creditoN: 0, descompacta: 0.2 },
        hospedeiro: { nematoide: 0.4, percevejo: 0.2 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    trigo: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 70 },
        residuo: { palhada: 0.45, meiaVidaDias: 90, creditoN: 0, descompacta: 0.05 },
        hospedeiro: { nematoide: 0.5, percevejo: 0.5 }, sensPragas: { nematoide: 0.06, percevejo: 0.1 }
    },
    arroz: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 75 },
        residuo: { palhada: 0.4, meiaVidaDias: 90, creditoN: 0, descompacta: 0.05 },
        hospedeiro: { nematoide: 0.5, percevejo: 0.2 }, sensPragas: graoPadrao
    },
    soja: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 75 },
        residuo: { palhada: 0.25, meiaVidaDias: 40, creditoN: 0.06, descompacta: 0.04 },
        hospedeiro: { nematoide: 0.8, percevejo: 0.9 }, sensPragas: { nematoide: 0.25, percevejo: 0.08 }
    },
    feijao: {
        produto: { tipo: 'grao', unidade: 'sc/ha', potencial: 50 },
        residuo: { palhada: 0.15, meiaVidaDias: 35, creditoN: 0.04, descompacta: 0.03 },
        hospedeiro: { nematoide: 0.7, percevejo: 0.3 }, sensPragas: { nematoide: 0.25, percevejo: 0.05 }
    },
    brizantha_marandu: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 9 },
        residuo: { palhada: 0.85, meiaVidaDias: 150, creditoN: 0, descompacta: 0.3 },
        hospedeiro: { nematoide: 0.5, percevejo: 0.3 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    brizantha_piata: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 8 },
        residuo: { palhada: 0.8, meiaVidaDias: 150, creditoN: 0, descompacta: 0.28 },
        hospedeiro: { nematoide: 0.5, percevejo: 0.3 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    brizantha_paiaguas: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 8.5 },
        residuo: { palhada: 0.82, meiaVidaDias: 150, creditoN: 0, descompacta: 0.28 },
        hospedeiro: { nematoide: 0.5, percevejo: 0.3 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    ruziziensis: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 8 },
        residuo: { palhada: 0.8, meiaVidaDias: 130, creditoN: 0, descompacta: 0.25 },
        hospedeiro: { nematoide: 0.7, percevejo: 0.3 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    crotalaria_juncea: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 10 },
        residuo: { palhada: 0.6, meiaVidaDias: 50, creditoN: 0.2, descompacta: 0.2 },
        hospedeiro: { nematoide: 0.2, percevejo: 0.1 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    crotalaria_spectabilis: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 6 },
        residuo: { palhada: 0.45, meiaVidaDias: 45, creditoN: 0.15, descompacta: 0.12 },
        hospedeiro: { nematoide: 0, percevejo: 0.1 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    crotalaria_ochroleuca: {
        produto: { tipo: 'cobertura', unidade: 't/ha MS', potencial: 8 },
        residuo: { palhada: 0.5, meiaVidaDias: 45, creditoN: 0.18, descompacta: 0.15 },
        hospedeiro: { nematoide: 0.05, percevejo: 0.1 }, sensPragas: { nematoide: 0, percevejo: 0 }
    },
    algodao: {
        produto: { tipo: 'grao', unidade: '@/ha', potencial: 320 },
        residuo: { palhada: 0.15, meiaVidaDias: 60, creditoN: 0, descompacta: 0.04 },
        hospedeiro: { nematoide: 0.8, percevejo: 0.3 }, sensPragas: { nematoide: 0.2, percevejo: 0.05 }
    }
};

export function agronomiaDe(crop) {
    const a = AGRONOMIA[crop.id];
    if (!a) throw new Error(`sem dados agronômicos para a cultura ${crop.id} (domain/crops/agronomia.js)`);
    return a;
}
