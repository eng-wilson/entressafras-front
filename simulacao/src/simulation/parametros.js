// Parâmetros calibráveis da simulação, agrupados por processo.
// Todos os limiares e taxas que antes ficavam soltos no código estão aqui, com nome e unidade.
// Valores calibrados para visualização, não para previsão agronômica.
//
// Convenções:
//   - canais de solo (compactação, acidez, crosta...) vão de 0 a 1;
//   - profundidades em metros; água em mm por camada de 100 mm (= % do volume);
//   - t = fração do ciclo (0 = plantio, 1 = maturação).
// Mudar um valor muda o resultado: rode `node test/sim-referencia.mjs --gravar` só quando a mudança for intencional.

export const PARAMS = {
    // Estado inicial do solo.
    solo: {
        bioDecaimentoM: 0.4,           // biologia cai com exp(-prof / 0,4 m)
        fertMaxFolga: 0.1,             // teto do N = N inicial + 0,1
        // Peso do escoamento superficial: a enxurrada corre para células baixas e para os rastros.
        escoamento: { pesoTrafego: 0.5, base: 0.02, expoente: 3 }
    },

    // Fenologia (por fração do ciclo; graus-dia entram aqui depois).
    fenologia: {
        emergencia: 0.03,              // t a partir do qual a planta existe
        raizInicialM: 0.05,            // profundidade da raiz na emergência
        raizJanela: [0.0, 0.6],        // t em que a raiz vai de 0 ao máximo da cultura
        demandaBase: 0.35,             // exigência de nutriente = base + ganho * curva de demanda
        demandaGanho: 0.5
    },

    // Balanço de água por camada.
    agua: {
        secoFracPmp: 0.5,              // a superfície pode secar até 50 % do ponto de murcha
        infilCrosta: 0.7,              // crosta 1 corta 70 % da infiltração
        infilCompactacao: 0.6,         // compactação 1 na superfície corta 60 %
        retencaoBase: 0.35,            // fração da enxurrada que fica na própria célula
        retencaoTrafego: 0.5,          // rastro de pneu segura mais água
        bloqueioDrenagem: { de: 0.4, ate: 0.9, max: 0.95 },   // camada compactada abaixo segura a drenagem
        raizMinLixiviacaoM: 0.2,       // N abaixo desta profundidade (ou da raiz) é lixiviado
        evapPalhada: 0.65,             // palhada 1 corta 65 % da evaporação
        evapSubsuperficie: 0.3,        // fração da evaporação tirada da 2ª camada
        ksMeio: 0.5,                   // água disponível relativa abaixo disto reduz a transpiração
        quaseSaturado: 0.95,           // W >= 95 % da saturação conta como saturado
        diasSatExcesso: 2              // dias saturado para contar como excesso na zona de raiz
    },

    // Profundidade da raiz e motivo da parada.
    raiz: {
        taxaMaxM: 0.03,                // avanço máximo da frente (m/dia); a cultura pode trocar (morfologia.raizTaxaM)
        tBaseC: 10, tOtimaC: 26,       // temperatura média do dia: abaixo da base não cresce; acima da ótima, taxa cheia
        umidadeLivre: 0.3,             // água disponível relativa acima disto não freia a ponta
        compactacaoInicio: 0.5,        // resistência efetiva em que a ponta começa a frear
        compactacaoBloqueio: 0.78,     // resistência efetiva em que a ponta para
        resistenciaSeco: 0.35,         // solo seco: resistência efetiva = comp * (1 + 0,35 * (1 - água relativa))
        bioporos: 0.15,                // biologia 1 deixa a ponta passar a 15 % da taxa pela camada densa
        acidezInicio: 0.45, acidezBloqueio: 0.75,
        acidezTolerancia: 0.3,         // cultura com toleranciaAl 1 tem os dois limiares 0,3 acima
        diasSatBarreira: 3, camadaMinSat: 2,   // saturação só barra e mata a partir da 3ª camada
        morteSat: 0.25,                // fração da raiz viva que morre por dia em camada saturada
        densMinFrente: 0.05,           // camada com menos raiz viva que isto deixa de ser frente (a frente recua)
        taxaDens: 0.08,                // densidade sobe 8 % do alvo por dia
        decaimentoM: 0.3,              // densidade alvo cai com exp(-prof / 0,3 m); a cultura pode trocar
        decomposicao: 0.015,           // raiz morta some 1,5 % por dia
        densPlenaAbsorcao: 0.2,        // camada com esta densidade ou mais absorve água por inteiro
        fatorRestritivo: 0.9,          // fator de solo abaixo disto conta como causa da raiz atrasada
        minimaM: 0.04
    },

    gleizacao: { ganhoDia: 0.004 },

    superficie: {
        crosta: { chuvaMinMm: 8, chuvaEscalaMm: 120, protecaoBio: 0.5, recuperacaoBio: 0.002 },
        rachadura: { fatorPmp: 1.05, sobe: 0.07, chuvaFechaMm: 5, fecha: 0.5 },
        temperatura: { descobertoC: 20, efeitoUmidade: 0.6, dosselC: 3 }
    },

    nitrogenio: {
        lixiviacao: 0.0006,            // por mm drenado abaixo da raiz
        excessoLimiar: 0.3, perdaEncharcado: 0.006,   // desnitrificação
        mineralizacao: 0.0015, bioBase: 0.2
    },

    manejo: {
        adubacaoPadrao: { dia: 30, dose: 0.4 }   // N de cobertura em V4–V6
    },

    // Estresse da planta: agudo (o dia) e crônico (dano acumulado).
    estresse: {
        deficitMeio: 0.5, salDeficit: 0.5,
        calorFaixaC: 6,
        soloQuente: { ateT: 0.15, peso: 0.8, faixaC: 15 },
        frioFaixaC: 8, frioRelevoC: 3,             // baixada fica até 3 °C mais fria
        raizPotMinM: 0.1,
        nutInicioT: 0.06, nutGanho: 1.4,
        geada: { folgaC: 1.5, faixaC: 4 },
        // Fatores que reduzem a disponibilidade de cada nutriente, aplicados em ordem: [fator, coeficiente].
        disponibilidade: {
            N: [['seca', 0.45], ['ench', 0.4], ['raiz', 0.3]],
            P: [['acidez', 0.6], ['frio', 0.35], ['seca', 0.4], ['raiz', 0.3]],
            K: [['seca', 0.45], ['raiz', 0.3]],
            Mg: [['acidez', 0.4], ['seca', 0.3]],
            S: [['seca', 0.3]],
            Zn: [['seca', 0.3], ['frio', 0.3]],
            FeMn: []
        },
        // Velocidade com que o estresse de hoje vira dano visível (sobe) e se recupera (desce).
        taxaSobe: { agua_deficit: 0.15, agua_excesso: 0.15, calor: 0.3, frio: 0, raiz: 0.1 },
        taxaDesce: { agua_deficit: 0.01, agua_excesso: 0.02, calor: 0.004, frio: 0, raiz: 0.02 },
        taxaSobeNut: 0.07, taxaDesceNut: 0.015
    },

    crescimento: {
        // Quanto cada canal freia o crescimento.
        peso: {
            agua_deficit: 0.85, agua_excesso: 0.7, calor: 0.5, frio: 0.5,
            N: 0.6, P: 0.6, K: 0.4, Mg: 0.25, S: 0.35, Zn: 0.4, FeMn: 0.3, raiz: 0.3
        },
        freioAgudo: ['agua_deficit', 'agua_excesso', 'calor'],   // estes freiam pelo valor do dia; o resto pelo crônico
        espiga: { perdaFloracao: 0.05, pesoCalor: 0.8, perdaEnchimento: 0.015, minimo: 0.25 },
        senescencia: { inicioT: 0.55, maximo: 0.25, seca: 0.004, N: 0.003 },
        acamamento: {
            limiar: { base: 0.25, faixa: 0.65 },   // limiar por planta = base + faixa * aleatório
            inicioT: 0.6, pesoK: 0.7, pesoRaiz: 0.45, pesoExcesso: 0.5, desconto: 0.25,
            ganho: 2.2, base: 0.25, maximo: 1.3, taxa: 0.15
        }
    },

    // Produtividade no fim da safra (simulation/impacto.js), por planta:
    //   Y = potencial · espiga^expEspiga · (hAcc/hPot)^expBiomassa · (1 − kSenesc · senesc) · (1 − kAcama · acama/acamaMax)
    // Cobertura (sem grão) ignora a espiga e vale pela biomassa.
    produtividade: {
        expEspiga: 1.0,
        expBiomassa: 0.5,
        expBiomassaCobertura: 1.0,
        kSenesc: 1.2,                  // senescência máxima (0,25) tira 30 %
        kAcama: 0.35                   // acamamento máximo tira 35 % (perda na colheita)
    },

    // Série diária e eventos críticos (simulation/impacto.js).
    impacto: {
        ndviSolo: 0.15, ndviGanho: 0.75,   // NDVI = solo + ganho · verdor
        ndviEstresse: 0.5,                 // estresse agudo máximo tira até 50 % do verdor
        ndviSenesc: 1.5,
        eventoLimiarDia: 0.0015,           // perda do dia acima de 0,15 % do potencial conta como dia crítico
        eventoFolgaDias: 2,                // dias calmos que não quebram um evento
        eventoMinimoFrac: 0.01             // evento com menos de 1 % do potencial é descartado
    },

    // Entressafra: o que passa de uma safra para a próxima (simulation/solo/entressafra.js).
    entressafra: {
        retornoN: 0.5,                 // N inicial da safra = metade do que sobrou + metade da fertilidade de base
        imobilizacaoN: 0.05,           // palhada de gramínea (C/N alto) prende N no início: 0,05 · palhada
        compactacaoRastro: 0.04,       // colheita soma compactação nas camadas de cima, nos rastros
        rastroCamadas: 3,
        bioPalhada: 0.08,              // palhada alimenta a biologia
        bioDecaimento: 0.03,
        moResiduo: 0.01,
        crostaPalhada: 0.6,            // palhada desfaz crosta: crosta · (1 − 0,6 · palhada)
        densRaizMin: 0.05,             // camada com raiz da safra anterior acima disto recebe a descompactação
        aguaSecaEntressafra: 0.5,      // fração da água disponível que sobra depois de entressafra seca longa (> 60 dias)
        // Decomposição da palhada limitada pela umidade: dia seco da entressafra (chuva < 10 mm nos 10 dias
        // anteriores) decompõe a esta fração de um dia úmido. Suposição (D): a direção é consenso (palhada dura
        // mais na seca do Cerrado), o número não tem ensaio conferido.
        decomposicaoSeca: 0.25
    },

    // Pressão de pragas entre safras (simulation/pragas.js). Índice simplificado, 0..1.
    pragas: {
        inicial: { nematoide: 0.5, percevejo: 0.5 },
        nematoide: { base: 0.5, ganhoHospedeiro: 0.7, entrada: 0.05, pousio: 0.85 },
        percevejo: { memoria: 0.3, ganhoHospedeiro: 0.7 },
        pesoHospedeiroAtual: 0.4       // perda = sens · pressão inicial · (1 − peso + peso · hospedeiro)
    }
};
