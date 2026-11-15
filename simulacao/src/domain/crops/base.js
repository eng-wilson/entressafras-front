// Base comum para novas culturas. Mantém o contrato do simulador completo e
// deixa em cada arquivo apenas as diferenças agronômicas e visuais.
export function criarCultura(o) {
    const cobertura = o.cobertura ?? [[0, 0], [.15, .12], [.45, .82], [.82, .86], [1, .45]];
    return {
        id: o.id, nome: o.nome, archetype: o.archetype, cicloDias: o.cicloDias,
        plantio: o.plantio,
        morfologia: {
            alturaMax: o.alturaMax, folhas: o.folhasFinal, raiz: o.raiz ?? 'fasciculada',
            raizProfMax: o.raizProfMax ?? 1, raizRamos: o.raizRamos ?? 12, fixaN: o.fixaN ?? false,
            ramosMax: o.ramosMax ?? 4, vagensMax: o.vagensMax ?? 10, frutosMax: o.frutosMax ?? 8,
            ...o.morfologia
        },
        fases: o.fases.map((f, i) => ({ ate: i === o.fases.length - 1 ? 1.01 : o.fases[i + 1].t, codigo: f.id, nome: f.nome })),
        sprites: {
            pintor: o.archetype, arte: o.arte ?? false, adaptarArte: o.adaptarArte ?? false, resolucao: 170, folhasFinal: o.folhasFinal,
            comprFolha: o.comprFolha, largFolha: o.largFolha ?? .018,
            tipoFolha: o.tipoFolha, tipoFruto: o.tipoFruto, tamFruto: o.tamFruto,
            inflorescencia: o.inflorescencia, paleta: o.paleta, fases: o.fases
        },
        janelas: {
            altura: o.altura ?? [0, .45], floracao: o.floracao ?? [.48, .66],
            espiga: o.espiga ?? [.55, .88], vagem: o.espiga ?? [.55, .88],
            desfolha: [.85, 1], corHaste: [.65, 1], corFolha: [.4, .95], corVagem: [.65, 1],
            folhaSurge: { inicio: .04, passo: .35, duracao: .08 }
        },
        paleta: o.paleta3d ?? {},
        kc: o.kc ?? [[0, .3], [.2, .5], [.5, 1.1], [.78, 1], [1, .45]],
        cobertura,
        demanda: o.demanda ?? [[0, .15], [.2, .5], [.5, 1], [.8, .65], [1, .15]],
        limites: o.limites ?? { tCalor: 35, tFrio: 10, tGeada: 2, tSoloQuente: 50 },
        sensibilidade: o.sensibilidade ?? {
            agua_deficit: [[0, .45], [.4, .7], [.5, 1], [.75, .8], [1, .3]],
            agua_excesso: [[0, 1], [.3, .7], [1, .35]], calor: [[0, .4], [.48, 1], [.7, .7], [1, .25]],
            frio: [[0, 1], [.6, .8], [1, .35]]
        },
        sintomas: { N: 'uniformPale', P: 'purpleMargin', K: 'marginScorch', Mg: 'interveinal', S: 'uniformPale', Zn: 'basalBands', FeMn: 'interveinalYoung' }
    };
}
