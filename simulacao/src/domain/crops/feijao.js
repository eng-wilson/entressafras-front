import { criarCultura } from './base.js';
export default criarCultura({
    id: 'feijao', nome: 'Feijão', archetype: 'leguminosa_baixa', cicloDias: 95, arte: true,
    plantio: { linhas: 7, plantasPorLinha: 7, margem: .4, semente: 5103 }, alturaMax: [.55, .78], folhasFinal: 11, comprFolha: .25,
    tipoFolha: 'trifoliolada', tipoFruto: 'vagem', tamFruto: .075, raiz: 'pivotante', raizProfMax: .85, fixaN: true, ramosMax: 5, vagensMax: 16,
    fases: [
        { id: 'V0', t: .03, nome: 'Emergência', folhas: 2, cotiledone: true }, { id: 'V1', t: .08, nome: 'Cotilédones', folhas: 2, cotiledone: true },
        { id: 'V2', t: .14, nome: 'Folhas primárias', folhas: 2, ramos: 1 }, { id: 'V3', t: .23, nome: 'Primeira trifoliolada', folhas: 4, ramos: 2 },
        { id: 'V4', t: .36, nome: 'Terceira trifoliolada', folhas: 7, ramos: 4 }, { id: 'R5', t: .5, nome: 'Botões florais', folhas: 10, ramos: 5, flores: .5 },
        { id: 'R6', t: .59, nome: 'Floração', folhas: 11, ramos: 5, flores: 1 }, { id: 'R7', t: .69, nome: 'Formação de vagens', folhas: 11, ramos: 5, vagem: .65 },
        { id: 'R8', t: .82, nome: 'Enchimento', folhas: 10, ramos: 5, vagem: 1, maturacao: .25 }, { id: 'R9', t: .94, nome: 'Maturação', folhas: 4, ramos: 5, vagem: 1, maturacao: 1 }
    ],
    paleta: { flor: [226, 224, 218], fruto: [72, 145, 54], frutoSeco: [178, 135, 72] }
});
