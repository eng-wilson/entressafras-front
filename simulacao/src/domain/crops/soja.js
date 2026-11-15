// Dados da cultura: soja (Glycine max). Arquétipo C: leguminosa baixa.
// Fases fenológicas: VE, VC, V2, V4, R1 (floração), R3 (vagens), R5 (enchimento), R7 (amarelecimento), R8 (maturação/colheita).

export default {
    id: 'soja',
    nome: 'Soja',
    archetype: 'leguminosa_baixa',
    cicloDias: 115,

    // 7 x 7 plantas no talhão: espaçamento equilibrado para o dossel arbustivo
    plantio: { linhas: 7, plantasPorLinha: 7, margem: 0.42, semente: 2024 },

    morfologia: {
        alturaMax: [0.72, 0.95],      // unidades do diorama (porte menor que o milho)
        folhas: 12,
        ramosMax: 5,
        vagensMax: 18,
        probSegundaVagem: 0.7,
        nosColmo: 9,
        raiz: 'pivotante',            // pivotante profunda com nódulos radiculares
        raizProfMax: 1.2,             // m
        raizRamos: 16,
        fixaN: true,                  // fixação biológica de Nitrogênio (FBN)
        toleranciaAl: 0.8             // menos sensível ao Al do subsolo que o milho (simulation/solo/raiz.js; calibrado em test/sim-faixas.mjs)
    },

    fases: [
        { ate: 0.05, codigo: 'VE–VC', nome: 'Emergência (cotilédones e unifolioladas)' },
        { ate: 0.20, codigo: 'V2–V4', nome: 'Crescimento vegetativo (trifolioladas)' },
        { ate: 0.45, codigo: 'V5–V8', nome: 'Ramificação e fechamento de entrelinha' },
        { ate: 0.60, codigo: 'R1–R2', nome: 'Florescimento pleno (flores axilares)' },
        { ate: 0.80, codigo: 'R3–R5', nome: 'Desenvolvimento e enchimento de vagens' },
        { ate: 0.92, codigo: 'R7', nome: 'Início da maturação (amarelecimento e desfolha)' },
        { ate: 1.01, codigo: 'R8', nome: 'Maturação completa (vagens secas para colheita)' }
    ],

    sprites: {
        pintor: 'soja',
        arte: true,
        resolucao: 170,              // pixels por unidade do diorama
        folhasFinal: 14,
        comprFolha: 0.28,            // comprimento da folha trifoliolada (unidades)
        tipoFolha: 'trifoliolada',
        tipoFruto: 'vagem',
        tamFruto: 0.055,
        paleta: {
            folhaBase: [42, 96, 34], folhaMeio: [88, 153, 51], folhaClara: [158, 194, 72], folhaLuz: [211, 216, 91],
            folhaInferior: [126, 151, 105], folhaAmarela: [220, 191, 61], folhaSeca: [190, 143, 66],
            hasteEsc: [52, 91, 38], haste: [89, 133, 54], hasteLuz: [154, 174, 78], hasteSeca: [165, 124, 67],
            cotiledone: [147, 181, 72], flor: [184, 137, 211], florLuz: [235, 211, 244], florCentro: [113, 70, 143],
            vagemVerde: [91, 145, 54], vagemLuz: [161, 183, 81], vagemSeca: [171, 126, 66], vagemEsc: [91, 67, 39],
            contorno: [28, 58, 19]
        },
        fases: [
            { id: 'VE', t: 0.04, folhas: 2, cotiledone: true },
            { id: 'VC', t: 0.08, folhas: 2, cotiledone: true, unifoliolada: true },
            { id: 'V2', t: 0.15, folhas: 4, ramos: 2 },
            { id: 'V4', t: 0.26, folhas: 7, ramos: 3 },
            { id: 'V6', t: 0.38, folhas: 10, ramos: 4 },
            { id: 'R1', t: 0.50, folhas: 13, ramos: 5, flores: 1 },
            { id: 'R3', t: 0.62, folhas: 14, ramos: 5, flores: 0.4, vagem: 0.5 },
            { id: 'R5', t: 0.74, folhas: 14, ramos: 5, vagem: 1.0, maturacao: 0.1 },
            { id: 'R6', t: 0.84, folhas: 12, ramos: 5, vagem: 1.0, maturacao: 0.35 },
            { id: 'R7', t: 0.92, folhas: 6, ramos: 5, vagem: 1.0, maturacao: 0.75, desfolha: 0.6 },
            { id: 'R8', t: 0.97, folhas: 0, ramos: 5, vagem: 1.0, maturacao: 1.0, desfolha: 1.0 }
        ]
    },

    janelas: {
        altura: [0.0, 0.45],
        floracao: [0.45, 0.62],
        espiga: [0.55, 0.85],
        vagem: [0.55, 0.85],
        desfolha: [0.85, 1.0],
        corHaste: [0.65, 1.0],
        corFolha: [0.4, 0.95],
        corVagem: [0.65, 1.0],
        folhaSurge: { inicio: 0.04, passo: 0.35, duracao: 0.08 }
    },

    paleta: {
        stalkLo: [90, 130, 60], stalkHi: [135, 175, 80],
        stalkGreenLo: [65, 105, 45], stalkGreenHi: [88, 132, 60],
        leafDry: [195, 160, 65], leafGreen: [110, 155, 55], leafYoung: [145, 190, 65],
        flower: [180, 140, 210],
        podGreen: [95, 148, 52], podDry: [175, 130, 70]
    },

    // Coeficiente de cultura (transpiração relativa à ET0)
    kc: [[0, 0.35], [0.2, 0.5], [0.5, 1.15], [0.75, 1.1], [1.0, 0.5]],

    // Cobertura do dossel sobre o solo
    cobertura: [[0, 0], [0.15, 0.1], [0.45, 0.85], [0.8, 0.9], [1.0, 0.4]],

    // Demanda relativa de nutrientes
    demanda: [[0, 0.15], [0.2, 0.45], [0.5, 1.0], [0.8, 0.7], [1.0, 0.15]],

    limites: { tCalor: 36, tFrio: 12, tGeada: 2, tSoloQuente: 48 },

    // Sensibilidade ao estresse por fase
    sensibilidade: {
        agua_deficit: [[0, 0.4], [0.35, 0.6], [0.5, 1.0], [0.72, 1.0], [0.85, 0.6], [1.0, 0.2]],
        agua_excesso: [[0, 1.0], [0.25, 0.8], [0.5, 0.6], [1.0, 0.3]],
        calor: [[0, 0.3], [0.48, 1.0], [0.65, 1.0], [0.8, 0.4], [1.0, 0.2]],
        frio: [[0, 1.0], [0.5, 0.9], [1.0, 0.3]]
    },

    // Sintomas de dicotiledônea
    sintomas: {
        N: 'uniformPale',       // clorose uniforme (em leguminosa com FBN falhada)
        P: 'purpleMargin',      // arroxeado nas margens e folhas opacas
        K: 'marginScorch',      // queima de borda das folhas velhas
        Mg: 'interveinal',      // clorose internerval em folhas velhas
        S: 'uniformPale',       // folhas novas pálidas
        Zn: 'basalBands',       // folhas pequenas (moteadas)
        FeMn: 'interveinalYoung'// clorose internerval acentuada no ápice
    }
};
