import { criarCultura } from './base.js';
export default criarCultura({
    id: 'sorgo', nome: 'Sorgo', archetype: 'graminea_colmo', cicloDias: 115,
    plantio: { linhas: 7, plantasPorLinha: 8, margem: .4, semente: 3101 }, alturaMax: [.95, 1.28], folhasFinal: 9, comprFolha: .5,
    inflorescencia: 'panicula_compacta',
    raizProfMax: 1.25, morfologia: { espigasMax: 0, probSegundaEspiga: 0, ramosPendao: 13, palhasPorEspiga: 0, nosColmo: 8 },
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2 }, { id: 'F3', t: .1, nome: '3 folhas', folhas: 3 },
        { id: 'F5', t: .18, nome: '5 folhas', folhas: 5 }, { id: 'FB', t: .38, nome: 'Folha bandeira', folhas: 8 },
        { id: 'EMB', t: .48, nome: 'Emborrachamento', folhas: 9 }, { id: 'FL', t: .57, nome: 'Floração', folhas: 9, pendao: .8 },
        { id: 'GL', t: .7, nome: 'Grão leitoso', folhas: 9, pendao: 1, maturacao: .15 },
        { id: 'GP', t: .82, nome: 'Grão pastoso', folhas: 9, pendao: 1, maturacao: .48 },
        { id: 'M', t: .94, nome: 'Maturação', folhas: 9, pendao: 1, maturacao: 1 }
    ],
    paleta: { pendao: [154, 58, 34], pendaoSeco: [117, 65, 39], folhaClara: [136, 176, 61] }
});
