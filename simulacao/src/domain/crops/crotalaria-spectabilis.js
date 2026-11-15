import { criarCultura } from './base.js';
export default criarCultura({
    id: 'crotalaria_spectabilis', nome: 'Crotalária spectabilis', archetype: 'leguminosa_arbustiva', cicloDias: 115, arte: true, adaptarArte: true,
    plantio: { linhas: 6, plantasPorLinha: 6, margem: .45, semente: 7102 }, alturaMax: [.72, .98], folhasFinal: 12, comprFolha: .23,
    tipoFolha: 'simples', tipoFruto: 'vagem_inflada', tamFruto: .065, raiz: 'pivotante', raizProfMax: 1.1, fixaN: true, ramosMax: 7, vagensMax: 15,
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, ramos: 1 }, { id: 'V', t: .22, nome: 'Vegetativo', folhas: 9, ramos: 5 },
        { id: 'FL', t: .5, nome: 'Floração plena', folhas: 12, ramos: 7, flores: 1 }, { id: 'VAG', t: .69, nome: 'Vagens', folhas: 11, ramos: 7, vagem: 1, maturacao: .2 },
        { id: 'ROL', t: .87, nome: 'Corte/rolagem', folhas: 10, ramos: 7, vagem: 1, maturacao: .8 }, { id: 'PAL', t: .97, nome: 'Palhada', folhas: 7, ramos: 7, maturacao: 1 }
    ], paleta: { flor: [242, 190, 32], fruto: [80, 132, 43] }
});
