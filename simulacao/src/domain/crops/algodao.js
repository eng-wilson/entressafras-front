import { criarCultura } from './base.js';
export default criarCultura({
    id: 'algodao', nome: 'Algodão', archetype: 'malvacea', cicloDias: 160,
    plantio: { linhas: 6, plantasPorLinha: 6, margem: .5, semente: 8101 }, alturaMax: [.9, 1.18], folhasFinal: 12, comprFolha: .25,
    tipoFolha: 'palmada', tipoFruto: 'capulho', tamFruto: .06, raiz: 'pivotante', raizProfMax: 1.3, ramosMax: 7, frutosMax: 12,
    fases: [
        { id: 'COT', t: .03, nome: 'Cotilédones', folhas: 2, cotiledone: true, ramos: 1 }, { id: 'VEG', t: .15, nome: 'Vegetativo', folhas: 6, ramos: 3 },
        { id: 'B1', t: .34, nome: 'Primeiro botão floral', folhas: 9, ramos: 5, flores: .25 }, { id: 'F1', t: .46, nome: 'Primeira flor', folhas: 11, ramos: 7, flores: 1 },
        { id: 'C1', t: .58, nome: 'Primeira maçã', folhas: 12, ramos: 7, fruto: .65 }, { id: 'CAP', t: .78, nome: 'Abertura de capulhos', folhas: 10, ramos: 7, capulho: 1, capulhoAberto: true, maturacao: .35 },
        { id: 'M', t: .94, nome: 'Maturação', folhas: 6, ramos: 7, capulho: 1, capulhoAberto: true, maturacao: 1 }
    ],
    paleta: { folha: [75, 139, 52], folhaClara: [142, 180, 68], flor: [244, 225, 173], fruto: [82, 132, 53], fibra: [250, 247, 232] },
    limites: { tCalor: 38, tFrio: 15, tGeada: 3, tSoloQuente: 52 }
});
