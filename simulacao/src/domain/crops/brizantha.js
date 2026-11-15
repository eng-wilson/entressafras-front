import { criarCultura } from './base.js';
const base = {
    id: 'brizantha', archetype: 'graminea_touceira', cicloDias: 130, folhasFinal: 7, comprFolha: .4, largFolha: .024,
    inflorescencia: 'racemo', raizProfMax: 1.15, morfologia: { perfilhos: 8, toleranciaAl: 1 },
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2, perfilhos: 2 }, { id: 'PER', t: .13, nome: 'Perfilhamento', folhas: 4, perfilhos: 5 },
        { id: 'TOU', t: .28, nome: 'Touceira estabelecida', folhas: 6, perfilhos: 8 }, { id: 'AL', t: .43, nome: 'Alongamento', folhas: 7, perfilhos: 8 },
        { id: 'FL', t: .57, nome: 'Florescimento', folhas: 7, perfilhos: 8, inflorescencia: 1 }, { id: 'SEM', t: .72, nome: 'Sementes', folhas: 7, perfilhos: 8, inflorescencia: 1, maturacao: .2 },
        { id: 'DES', t: .88, nome: 'Dessecação', folhas: 7, perfilhos: 8, inflorescencia: 1, maturacao: .75 }, { id: 'PAL', t: .97, nome: 'Palhada', folhas: 6, perfilhos: 8, maturacao: 1 }
    ]
};
export const variantesBrizantha = {
    marandu: criarCultura({ ...base, id: 'brizantha_marandu', nome: 'Braquiária Marandu', plantio: { linhas: 7, plantasPorLinha: 8, margem: .35, semente: 6101 }, alturaMax: [.78, 1.02] }),
    piata: criarCultura({ ...base, id: 'brizantha_piata', nome: 'Braquiária Piatã', plantio: { linhas: 7, plantasPorLinha: 8, margem: .35, semente: 6102 }, alturaMax: [.66, .88], comprFolha: .34, largFolha: .018 }),
    paiaguas: criarCultura({ ...base, id: 'brizantha_paiaguas', nome: 'Braquiária Paiaguás', plantio: { linhas: 7, plantasPorLinha: 8, margem: .35, semente: 6103 }, alturaMax: [.7, .92], folhasFinal: 8, paleta: { folha: [78, 153, 48], folhaClara: [155, 194, 65] } })
};
export default variantesBrizantha.marandu;
