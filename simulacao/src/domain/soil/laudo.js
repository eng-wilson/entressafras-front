// Do que o agricultor sabe do solo (textura no tato, análise de solo) para as entradas da simulação.
//   classeDaTextura(textura)        classe de solo (domain/soil/presets.js)
//   texturaDaArgila(argilaPct)      'argiloso' | 'medio' | 'arenoso' (Embrapa: arenosa < 15 %, média 15–35 %, argilosa > 35 %)
//   respostasDoLaudo(analise)       respostas de domain/soil/solo-local.js (acidez, fertilidade) a partir do laudo
//   lerNumero(texto)                aceita vírgula decimal
//
// Limites de interpretação para o Cerrado: Sousa & Lobato (eds.), "Cerrado: correção do solo e adubação",
// Embrapa, 2004. P (Mehlich-1) depende da argila; K para CTC a pH 7 ≥ 4 cmolc/dm³. A análise é da camada
// de 0–20 cm: usar a acidez dela para o subsolo é uma estimativa (o laudo de 20–40 cm é melhor).

export const TEXTURAS = {
    argiloso: { nome: 'Argiloso', dica: 'Molhada, faz uma fita na mão', classe: 'latossolo_vermelho', foto: new URL('../../../assets/onboarding/solo_argiloso.jpg', import.meta.url).href, alt: 'Mão segurando uma bola de terra avermelhada, lisa e firme' },
    medio: { nome: 'Médio', dica: 'Faz bolinha, mas quebra', classe: 'latossolo_vermelho_amarelo', foto: new URL('../../../assets/onboarding/solo_medio.jpg', import.meta.url).href, alt: 'Mão segurando terra marrom em torrões que se desfazem' },
    arenoso: { nome: 'Arenoso', dica: 'Esfarela e é áspera', classe: 'neossolo_quartzarenico', foto: new URL('../../../assets/onboarding/solo_arenoso.jpg', import.meta.url).href, alt: 'Mão segurando areia clara que escorre entre os dedos' }
};
export const CLASSE_PADRAO = 'latossolo_vermelho';   // "Não sei": o solo mais comum das lavouras do Cerrado

export const CAMPOS_LAUDO = [
    { k: 'ph', nome: 'pH', sub: 'em CaCl₂', unidade: '', exemplo: '5,5' },
    { k: 'mo', nome: 'Matéria orgânica', sub: 'MO', unidade: 'g/dm³', exemplo: '25' },
    { k: 'p', nome: 'Fósforo', sub: 'P (Mehlich)', unidade: 'mg/dm³', exemplo: '15' },
    { k: 'k', nome: 'Potássio', sub: 'K', unidade: 'cmolc/dm³', exemplo: '0,20' },
    { k: 'v', nome: 'Saturação por bases', sub: 'V', unidade: '%', exemplo: '50' },
    { k: 'arg', nome: 'Argila', sub: 'define a textura', unidade: '%', exemplo: '35' }
];

export function lerNumero(t) {
    if (t === null || t === undefined || t === '') return null;
    const n = parseFloat(String(t).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

export const classeDaTextura = textura => TEXTURAS[textura]?.classe ?? CLASSE_PADRAO;

export function texturaDaArgila(arg) {
    if (arg === null || arg === undefined) return null;
    return arg > 35 ? 'argiloso' : arg >= 15 ? 'medio' : 'arenoso';
}

// P (Mehlich-1, mg/dm³): limite superior das classes "baixo" e "médio" por faixa de argila (Sousa & Lobato, 2004).
function classeFosforo(p, arg) {
    const [baixo, medio] = arg === null ? [5, 8] : arg <= 15 ? [20, 30] : arg <= 35 ? [12, 18] : arg <= 60 ? [5, 8] : [3, 4];
    return p <= baixo ? 'baixa' : p <= medio ? 'media' : 'alta';
}
// K (cmolc/dm³), CTC ≥ 4: baixo ≤ 25 mg/dm³ (0,064), médio até 50 mg/dm³ (0,128).
const classePotassio = k => (k <= 0.064 ? 'baixa' : k <= 0.128 ? 'media' : 'alta');
const PIOR = { baixa: 0, media: 1, alta: 2 };

// Respostas para solo-local.js. Só responde o que o laudo permite: o resto fica como o agricultor deixou.
export function respostasDoLaudo(analise) {
    if (!analise) return {};
    const n = Object.fromEntries(CAMPOS_LAUDO.map(c => [c.k, lerNumero(analise[c.k])]));
    const out = {};
    // Acidez: V % e pH em CaCl₂. V < 35 ou pH < 4,6 indica alumínio alto; V < 50 ou pH < 5,0, médio.
    if (n.v !== null || n.ph !== null) {
        const alta = (n.v !== null && n.v < 35) || (n.ph !== null && n.ph < 4.6);
        const media = (n.v !== null && n.v < 50) || (n.ph !== null && n.ph < 5.0);
        out.acidez = alta ? 'alta' : media ? 'media' : 'baixa';
    }
    // Fertilidade: a pior entre fósforo e potássio.
    const fp = n.p !== null ? classeFosforo(n.p, n.arg) : null;
    const fk = n.k !== null ? classePotassio(n.k) : null;
    if (fp || fk) out.fertilidade = [fp, fk].filter(Boolean).sort((a, b) => PIOR[a] - PIOR[b])[0];
    return out;
}
