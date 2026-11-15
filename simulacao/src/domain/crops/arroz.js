import { criarCultura } from './base.js';
export default criarCultura({
    id: 'arroz', nome: 'Arroz', archetype: 'graminea_touceira', cicloDias: 120, arte: true, adaptarArte: true,
    plantio: { linhas: 8, plantasPorLinha: 9, margem: .34, semente: 4201 }, alturaMax: [.62, .84], folhasFinal: 6, comprFolha: .34, largFolha: .014,
    inflorescencia: 'panicula', morfologia: { perfilhos: 7 },
    fases: [
        { id: 'PL', t: .03, nome: 'Plântula', folhas: 2, perfilhos: 2 }, { id: 'PER', t: .14, nome: 'Perfilhamento', folhas: 4, perfilhos: 5 },
        { id: 'IP', t: .32, nome: 'Iniciação da panícula', folhas: 5, perfilhos: 7 }, { id: 'EMB', t: .45, nome: 'Emborrachamento', folhas: 6, perfilhos: 7 },
        { id: 'FL', t: .56, nome: 'Floração', folhas: 6, perfilhos: 7, inflorescencia: .7 },
        { id: 'GP', t: .72, nome: 'Grão leitoso/pastoso', folhas: 6, perfilhos: 7, inflorescencia: 1, maturacao: .3 },
        { id: 'M', t: .92, nome: 'Maturação', folhas: 6, perfilhos: 7, inflorescencia: 1, maturacao: 1 }
    ],
    sensibilidade: { agua_deficit: [[0, .5], [.45, 1], [.8, .7], [1, .3]], agua_excesso: [[0, .15], [1, .15]], calor: [[0, .3], [.5, 1], [.7, .6], [1, .2]], frio: [[0, 1], [1, .4]] }
});
