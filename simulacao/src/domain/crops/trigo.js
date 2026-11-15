import { criarCultura } from './base.js';
export default criarCultura({
    id: 'trigo', nome: 'Trigo', archetype: 'graminea_touceira', cicloDias: 125, arte: true,
    plantio: { linhas: 8, plantasPorLinha: 9, margem: .34, semente: 4101 }, alturaMax: [.58, .78], folhasFinal: 5, comprFolha: .31, largFolha: .015,
    inflorescencia: 'espiga', morfologia: { perfilhos: 6 }, limites: { tCalor: 30, tFrio: 4, tGeada: -2, tSoloQuente: 45 },
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, perfilhos: 2 }, { id: 'AF', t: .13, nome: 'Afilhamento', folhas: 3, perfilhos: 4 },
        { id: 'AL', t: .29, nome: 'Alongamento', folhas: 4, perfilhos: 6 }, { id: 'EMB', t: .43, nome: 'Emborrachamento', folhas: 5, perfilhos: 6 },
        { id: 'ESP', t: .53, nome: 'Espigamento', folhas: 5, perfilhos: 6, inflorescencia: .7 }, { id: 'ANT', t: .61, nome: 'Antese', folhas: 5, perfilhos: 6, inflorescencia: 1 },
        { id: 'GL', t: .72, nome: 'Grão leitoso', folhas: 5, perfilhos: 6, inflorescencia: 1, maturacao: .2 },
        { id: 'MAS', t: .83, nome: 'Grão em massa', folhas: 5, perfilhos: 6, inflorescencia: 1, maturacao: .55 },
        { id: 'M', t: .94, nome: 'Maturação', folhas: 5, perfilhos: 6, inflorescencia: 1, maturacao: 1 }
    ]
});
