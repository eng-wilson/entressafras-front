// Simulação diária da safra: orquestrador.
// Roda a safra inteira uma vez por cenário e guarda um retrato por dia; o slider de dias só escolhe
// qual retrato mostrar. Código puro (sem DOM, sem rede): roda no navegador, no Node e em Web Worker.
//
// Cada processo vive no seu arquivo e declara no cabeçalho o que lê e o que escreve no estado:
//   forcante.js          clima do dia (sintético hoje; dados reais depois)
//   fenologia.js         fase do ciclo, kc, cobertura, raiz potencial, demanda
//   solo/agua.js         infiltração, drenagem, lençol, evaporação, transpiração, poça
//   solo/raiz.js         profundidade da raiz e barreira
//   solo/gleizacao.js    dias saturado e gley
//   solo/superficie.js   crosta, rachadura, temperatura da superfície
//   solo/nitrogenio.js   adubação, lixiviação, mineralização
//   planta/estresse.js   agudo e crônico por canal
//   planta/crescimento.js altura, espiga, senescência, acamamento
//   retrato.js           texturas do solo e registro das plantas
// Parâmetros calibráveis: parametros.js. Estado e grade: estado.js.
// Mudou comportamento? `node test/sim-referencia.mjs` diz onde.

import { PARAMS } from './parametros.js';
import { criarEstado, inicializarEstado, limitesAgua } from './estado.js';
import { climaDaSafra, forcanteDoDia } from './forcante.js';
import { fenologia } from './fenologia.js';
import { entradaAgua, transpiracao, redistribuirPoca } from './solo/agua.js';
import { raiz } from './solo/raiz.js';
import { gleizacao } from './solo/gleizacao.js';
import { superficie } from './solo/superficie.js';
import { nitrogenio } from './solo/nitrogenio.js';
import { estresse } from './planta/estresse.js';
import { crescimento } from './planta/crescimento.js';
import { retratoSolo, registroPlantas, decodificador } from './retrato.js';
import { serieDoDia, resumoSafra, eventosCriticos } from './impacto.js';

export { GRID, CAMADAS, CAMADA_M, PROF_TOTAL_M, celulaDe, bilinear } from './estado.js';
export { perfilCelula } from './retrato.js';

// A receita do dia, em ordem. Inserir um processo novo (por exemplo, assimilação de umidade observada)
// é acrescentar uma linha aqui.
const PROCESSOS = [
    entradaAgua,        // água entra, drena e evapora
    raiz,               // até onde a raiz chega hoje
    transpiracao,       // a cultura tira água da zona de raiz
    gleizacao,
    superficie,
    nitrogenio,
    redistribuirPoca,
    estresse,
    crescimento
];

// Opções além do básico:
//   retratos: false pula as texturas diárias (corridas em lote: rotação, conjunto de anos, comparação);
//   herdar(E, ctx): chamado depois do estado inicial, para trazer o solo da safra anterior (solo/entressafra.js);
//   potencial: troca o teto de produtividade da cultura (ex.: milho safrinha).
// Saída extra: impacto { serie, resumo, eventos } e estadoFinal (o estado no último dia).
export function simulateSeason({ crop, classe, cenario, plants, width, depth, params = PARAMS, retratos = true, herdar = null, potencial }) {
    const dias = crop.cicloDias;
    const clima = climaDaSafra(cenario, dias);
    const agua = limitesAgua(classe, params);
    const manejo = { adubN: cenario.adubacaoN === undefined ? params.manejo.adubacaoPadrao : cenario.adubacaoN };

    const E = criarEstado(plants.length);
    inicializarEstado(E, { cenario, plants, width, depth, agua, par: params });
    if (herdar) herdar(E, { agua, par: params, crop, classe });

    const out = { dias, clima, superficie: [], perfil: [], plantas: [], relevo: E.relevo, trafego: E.trafego, celP: E.celP, classe };
    const serie = [];
    for (let dia = 0; dia <= dias; dia++) {
        const ctx = {
            dia, crop, classe, agua, manejo, par: params,
            clima: forcanteDoDia(clima, dia),
            fen: fenologia(dia, dias, crop, params)
        };
        for (const processo of PROCESSOS) processo(E, ctx);
        serie.push(serieDoDia(E, ctx));

        if (!retratos) continue;
        out.plantas.push(registroPlantas(E));
        const r = retratoSolo(E, agua);
        out.superficie.push(r.superficie);
        out.perfil.push(r.perfil);
    }
    out.decodificar = decodificador(agua);
    const resumo = resumoSafra(E, crop, serie, params, { potencial });
    out.impacto = { serie, resumo, eventos: eventosCriticos(serie, crop, resumo, params) };
    out.estadoFinal = E;
    return out;
}
