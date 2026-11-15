import { criarCultura } from './base.js';
export default criarCultura({
    id: 'crotalaria_juncea', nome: 'Crotalária juncea', archetype: 'leguminosa_arbustiva', cicloDias: 120,
    plantio: { linhas: 6, plantasPorLinha: 6, margem: .45, semente: 7101 }, alturaMax: [1.25, 1.62], folhasFinal: 14, comprFolha: .25,
    tipoFolha: 'simples', tipoFruto: 'vagem_inflada', tamFruto: .06, raiz: 'pivotante', raizProfMax: 1.35, fixaN: true, ramosMax: 6, vagensMax: 14,
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, ramos: 1 }, { id: 'V', t: .22, nome: 'Vegetativo', folhas: 10, ramos: 4 },
        { id: 'FL', t: .52, nome: 'Floração plena', folhas: 14, ramos: 6, flores: 1 }, { id: 'VAG', t: .7, nome: 'Vagens', folhas: 13, ramos: 6, vagem: 1, maturacao: .2 },
        { id: 'ROL', t: .88, nome: 'Corte/rolagem', folhas: 12, ramos: 6, vagem: 1, maturacao: .8 }, { id: 'PAL', t: .97, nome: 'Palhada', folhas: 8, ramos: 6, maturacao: 1 }
    ], paleta: { flor: [244, 194, 38], fruto: [86, 137, 45] }
});
