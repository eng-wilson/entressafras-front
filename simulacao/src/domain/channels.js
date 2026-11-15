// Canais de estresse da planta. Ordem fixa: a simulação grava e os sintomas leem os valores nesta ordem.
export const CANAIS = [
    'agua_deficit', 'agua_excesso', 'calor', 'frio',
    'N', 'P', 'K', 'Mg',
    'S', 'Zn', 'FeMn', 'raiz'
];

export const IDX = Object.fromEntries(CANAIS.map((c, i) => [c, i]));
export const NCANAIS = CANAIS.length;

export const ROTULO_CANAL = {
    agua_deficit: 'Déficit hídrico',
    agua_excesso: 'Encharcamento',
    calor: 'Calor',
    frio: 'Frio / geada',
    N: 'Nitrogênio (N)',
    P: 'Fósforo (P)',
    K: 'Potássio (K)',
    Mg: 'Magnésio (Mg)',
    S: 'Enxofre (S)',
    Zn: 'Zinco (Zn)',
    FeMn: 'Ferro / Manganês',
    raiz: 'Restrição de raiz'
};

// Layout do registro diário de cada planta (Float32Array com STRIDE valores por planta).
export const P = {
    AGUDO: 0,                  // 12 valores: estresse de hoje
    CRONICO: NCANAIS,          // 12 valores: histórico (danos visíveis e permanentes)
    CRESC: NCANAIS * 2,        // crescimento relativo ao potencial (0..1)
    ESPIGA: NCANAIS * 2 + 1,   // fator de espiga (aborto / grãos falhados)
    SENESC: NCANAIS * 2 + 2,   // antecipação da senescência (fração do ciclo)
    ACAMA: NCANAIS * 2 + 3,    // ângulo de acamamento (rad)
    RAIZ_M: NCANAIS * 2 + 4,   // profundidade efetiva da raiz (m)
    RAIZ_POT_M: NCANAIS * 2 + 5, // profundidade potencial da raiz (m)
    BARREIRA: NCANAIS * 2 + 6, // causa da parada da raiz: 0 nenhuma, 1 compactação, 2 acidez, 3 água
    CELULA: NCANAIS * 2 + 7,   // índice da célula de solo
    STRIDE: 32
};
