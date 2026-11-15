// Dados da cultura: milho. Nenhuma lógica aqui; o arquétipo e o simulador leem estes valores.
// t = fração do ciclo (0 = plantio, 1 = maturação). Curvas [[t, valor], ...] são interpoladas linearmente.

export default {
    id: 'milho',
    nome: 'Milho',
    archetype: 'graminea_colmo',
    cicloDias: 120,

    // 7 x 7 plantas no talhão: menos sobreposição, cada planta e cada raiz da borda ficam legíveis.
    plantio: { linhas: 7, plantasPorLinha: 7, margem: 0.42, semente: 1337 },

    morfologia: {
        alturaMax: [1.05, 1.40],      // unidades do diorama
        folhas: 6,
        espigasMax: 2,
        probSegundaEspiga: 0.35,
        ramosPendao: 7,
        palhasPorEspiga: 3,
        nosColmo: 7.5,
        raiz: 'fasciculada',
        raizProfMax: 1.0,             // m
        raizRamos: 12,
        fixaN: false
    },

    fases: [
        { ate: 0.03, codigo: 'S', nome: 'Plantio (semente no solo)' },
        { ate: 0.20, codigo: 'VE–V4', nome: 'Emergência / Germinação' },
        { ate: 0.50, codigo: 'V6–V12', nome: 'Crescimento vegetativo' },
        { ate: 0.62, codigo: 'VT–R1', nome: 'Pendoamento e floração' },
        { ate: 0.85, codigo: 'R2–R5', nome: 'Enchimento de grãos' },
        { ate: 1.01, codigo: 'R6', nome: 'Maturação completa (pronto p/ colheita)' }
    ],

    // Sprites por fase notável (seção 4 e 5 do plano). t = início da fase no ciclo.
    // Entre duas fases, o sprite da fase atual é escalado pela altura simulada.
    // folhas: folhas visíveis; pendao, espiga: tamanho relativo (0..1); estigma: 0 verde .. 1 seco;
    // maturacao: 0 verde .. 1 seco; palhaAberta: palha aberta mostrando a espiga.
    sprites: {
        pintor: 'graminea_colmo',
        arte: true,              // true quando existir assets/sprites/milho/manifest.json (arte final)
        resolucao: 170,          // pixels por unidade do diorama
        folhasFinal: 12,
        comprFolha: 0.62,        // comprimento da maior folha (unidades)
        fases: [
            { id: 'VE', t: 0.03, folhas: 2 },
            { id: 'V2', t: 0.08, folhas: 3 },
            { id: 'V4', t: 0.13, folhas: 5 },
            { id: 'V6', t: 0.19, folhas: 7 },
            { id: 'V9', t: 0.27, folhas: 9 },
            { id: 'V12', t: 0.37, folhas: 11 },
            { id: 'VT', t: 0.51, folhas: 12, pendao: 1 },
            { id: 'R1', t: 0.58, folhas: 12, pendao: 1, espiga: 0.55, estigma: 0, maturacao: 0.05 },
            { id: 'R3', t: 0.68, folhas: 12, pendao: 1, espiga: 0.85, estigma: 0.55, maturacao: 0.25 },
            { id: 'R5', t: 0.8, folhas: 12, pendao: 1, espiga: 1, estigma: 1, maturacao: 0.6 },
            { id: 'R6', t: 0.93, folhas: 12, pendao: 1, espiga: 1, estigma: 1, maturacao: 1, palhaAberta: true }
        ]
    },

    // Janelas [início, fim] em t para cada processo visual.
    janelas: {
        altura: [0.0, 0.42],
        espiga: [0.55, 0.85],
        palhaAbre: [0.8, 1.0],
        pendao: [0.5, 0.62],
        corColmo: [0.55, 1.0],
        corFolha: [0.3, 1.0],
        corPalha: [0.65, 1.0],
        corEstigma: [0.6, 1.0],
        corPendao: [0.55, 1.0],
        corGrao: [0.6, 0.9],
        folhaSurge: { inicio: 0.04, passo: 0.40, duracao: 0.08 },
        floracao: [0.5, 0.68]
    },

    paleta: {
        stalkLo: [150, 125, 60], stalkHi: [190, 160, 85],
        stalkGreenLo: [68, 108, 52], stalkGreenHi: [92, 138, 68],
        leafDry: [196, 163, 59], leafGreen: [120, 128, 62], leafYoung: [58, 118, 48],
        husk: [217, 201, 140], huskGreen: [86, 124, 60],
        silk: [74, 54, 37], silkFresh: [196, 204, 128],
        tassel: [138, 107, 59], tasselYoung: [150, 152, 76]
    },

    // Coeficiente de cultura (transpiração relativa à ET0).
    kc: [[0, 0.3], [0.15, 0.4], [0.45, 1.2], [0.75, 1.15], [1.0, 0.6]],

    // Cobertura do dossel sobre o solo (sombra, proteção contra impacto da chuva).
    cobertura: [[0, 0], [0.1, 0.05], [0.4, 0.75], [0.8, 0.85], [1.0, 0.6]],

    // Demanda relativa de nutrientes ao longo do ciclo.
    demanda: [[0, 0.2], [0.2, 0.6], [0.5, 1.0], [0.8, 0.6], [1.0, 0.2]],

    limites: { tCalor: 35, tFrio: 10, tGeada: 2, tSoloQuente: 50 },

    // Peso do estresse por fase. Canais ausentes usam peso 1.
    sensibilidade: {
        agua_deficit: [[0, 0.5], [0.4, 0.7], [0.5, 1.0], [0.62, 1.0], [0.75, 0.7], [1.0, 0.3]],
        agua_excesso: [[0, 1.0], [0.2, 0.9], [0.5, 0.6], [1.0, 0.3]],
        calor: [[0, 0.4], [0.48, 1.0], [0.64, 1.0], [0.75, 0.5], [1.0, 0.3]],
        frio: [[0, 1.0], [0.6, 1.0], [1.0, 0.4]]
    },

    // Padrão de sintoma por canal (o shader de gramínea implementa estes padrões).
    sintomas: {
        N: 'vChlorosis',        // amarelo em "V" da ponta pela nervura central, folhas velhas
        P: 'purpleMargin',      // arroxeado nas margens, folhas velhas
        K: 'marginScorch',      // necrose da margem a partir da ponta, folhas velhas
        Mg: 'interveinal',      // estrias internervais, folhas velhas
        S: 'uniformPale',       // palidez uniforme, folhas novas
        Zn: 'basalBands',       // faixas esbranquiçadas na base, folhas novas
        FeMn: 'interveinalYoung'
    }
};
