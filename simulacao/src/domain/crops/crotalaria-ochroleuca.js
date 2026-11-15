import { criarCultura } from './base.js';
export default criarCultura({
    id: 'crotalaria_ochroleuca', nome: 'Crotalária ochroleuca', archetype: 'leguminosa_arbustiva', cicloDias: 120,
    plantio: { linhas: 6, plantasPorLinha: 6, margem: .45, semente: 7103 }, alturaMax: [.9, 1.2], folhasFinal: 13, comprFolha: .2,
    tipoFolha: 'trifoliolada', tipoFruto: 'vagem_inflada', tamFruto: .055, raiz: 'pivotante', raizProfMax: 1.2, fixaN: true, ramosMax: 6, vagensMax: 14,
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, ramos: 1 }, { id: 'V', t: .22, nome: 'Vegetativo', folhas: 10, ramos: 4 },
        { id: 'FL', t: .51, nome: 'Floração plena', folhas: 13, ramos: 6, flores: 1 }, { id: 'VAG', t: .7, nome: 'Vagens', folhas: 12, ramos: 6, vagem: 1, maturacao: .2 },
        { id: 'ROL', t: .88, nome: 'Corte/rolagem', folhas: 10, ramos: 6, vagem: 1, maturacao: .8 }, { id: 'PAL', t: .97, nome: 'Palhada', folhas: 7, ramos: 6, maturacao: 1 }
    ], paleta: { flor: [247, 219, 91], fruto: [92, 143, 49] }
});
