import { criarCultura } from './base.js';
export default criarCultura({
    id: 'milheto', nome: 'Milheto', archetype: 'graminea_colmo', cicloDias: 95, arte: true, adaptarArte: true,
    plantio: { linhas: 8, plantasPorLinha: 8, margem: .35, semente: 3203 }, alturaMax: [.9, 1.22], folhasFinal: 8, comprFolha: .46,
    inflorescencia: 'vela',
    raizProfMax: 1.3, morfologia: { espigasMax: 0, probSegundaEspiga: 0, ramosPendao: 16, palhasPorEspiga: 0, nosColmo: 7 },
    fases: [
        { id: 'E', t: .03, nome: 'Emergência', folhas: 2 }, { id: 'PER', t: .13, nome: 'Perfilhamento', folhas: 4 },
        { id: 'AL', t: .28, nome: 'Alongamento', folhas: 7 }, { id: 'EMB', t: .43, nome: 'Emborrachamento', folhas: 8 },
        { id: 'VELA', t: .54, nome: 'Panícula em vela', folhas: 8, pendao: 1 }, { id: 'G', t: .7, nome: 'Grão', folhas: 8, pendao: 1, maturacao: .25 },
        { id: 'M', t: .84, nome: 'Maturação', folhas: 8, pendao: 1, maturacao: .7 },
        { id: 'DES', t: .93, nome: 'Dessecação', folhas: 8, pendao: 1, maturacao: 1 }, { id: 'PAL', t: .98, nome: 'Palhada', folhas: 7, pendao: 1, maturacao: 1 }
    ]
});
