import { criarCultura } from './base.js';
export default criarCultura({
    id: 'ruziziensis', nome: 'Braquiária ruziziensis', archetype: 'graminea_touceira', cicloDias: 120, arte: true, adaptarArte: true,
    plantio: { linhas: 7, plantasPorLinha: 8, margem: .32, semente: 6201 }, alturaMax: [.45, .65], folhasFinal: 8, comprFolha: .42, largFolha: .022,
    inflorescencia: 'racemo', raizProfMax: 1, morfologia: { perfilhos: 9, decumbente: true, toleranciaAl: 1 },
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, perfilhos: 2 }, { id: 'PER', t: .12, nome: 'Perfilhamento', folhas: 4, perfilhos: 5 },
        { id: 'TAP', t: .26, nome: 'Fechamento em tapete', folhas: 7, perfilhos: 9 }, { id: 'AL', t: .42, nome: 'Alongamento', folhas: 8, perfilhos: 9 },
        { id: 'FL', t: .58, nome: 'Florescimento', folhas: 8, perfilhos: 9, inflorescencia: 1 }, { id: 'SEM', t: .72, nome: 'Sementes', folhas: 8, perfilhos: 9, inflorescencia: 1, maturacao: .2 },
        { id: 'DES', t: .88, nome: 'Dessecação', folhas: 8, perfilhos: 9, maturacao: .8 }, { id: 'PAL', t: .97, nome: 'Palhada', folhas: 7, perfilhos: 9, maturacao: 1 }
    ], paleta: { folha: [96, 166, 62], folhaClara: [170, 204, 82] }
});
