// Proporção raiz : parte aérea usada no desenho das raízes (profundidade efetiva da raiz / altura da planta,
// na planta adulta sem restrição). O desenho aplica a proporção à altura que o sprite tem no dia
// (medida no próprio sprite), então a raiz cresce junto com a planta.
// A simulação continua usando raizProfMax (metros reais) para água e barreiras; isto é só a leitura visual.
//
// Profundidade EFETIVA = onde fica ~80 % da raiz, não a ponta mais funda. É o que o olho compara com a
// planta: um pivô claro e grosso sobre solo escuro já parece maior do que é. O milho é a referência, 1 : 1.
//
// Valores aproximados (lavoura bem manejada, solo sem impedimento):
//   milho      2,0–2,5 m de altura; o grosso da raiz vai até ~0,6–1,0 m (referência visual)  -> 1,0
//   sorgo      porte parecido, raiz um pouco mais funda                                       -> 1,0
//   milheto    raiz agressiva, porte 1,5–2,5 m                                                -> 1,05
//   trigo      0,8–1,0 m de altura, 80 % da raiz até ~0,6–0,8 m                               -> 0,9
//   arroz      irrigado: raiz rasa (0,2–0,3 m) para 0,8–1,2 m de altura                       -> 0,35
//   braquiárias (brizantha) touceira 1,0–1,5 m, 80 % da raiz até ~0,8–1,0 m                  -> 0,9
//   ruziziensis decumbente e baixa (0,5–0,8 m), raiz ~0,6–0,8 m                               -> 1,0
//   soja       0,8–1,0 m de altura, 80 % da raiz até ~0,6–0,7 m                               -> 0,75
//   feijão     0,4–0,6 m de altura, 80 % da raiz até ~0,4 m                                   -> 0,75
//   crotalária juncea      2–3 m de altura, pivô efetivo ~1,0 m                               -> 0,45
//   crotalária spectabilis 1,0–1,5 m de altura, pivô efetivo ~0,8 m                           -> 0,7
//   crotalária ochroleuca  1,5–2 m de altura, pivô efetivo ~0,9 m                             -> 0,55
//   algodão    1,0–1,5 m de altura, pivô efetivo ~1,0–1,2 m                                   -> 0,9

// Padrão por arquétipo (usado quando a cultura não tem valor próprio).
export const PROPORCAO_ARQUETIPO = {
    graminea_colmo: 1.0,        // A: milho, sorgo, milheto
    graminea_touceira: 0.9,     // B: trigo, arroz, braquiárias
    leguminosa_baixa: 0.75,     // C: soja, feijão
    leguminosa_arbustiva: 0.55, // D: crotalárias
    malvacea: 0.9               // E: algodão
};

// Ajuste por cultura (ids de crops/*.js).
export const PROPORCAO_CULTURA = {
    milho: 1.0,
    sorgo: 1.0,
    milheto: 1.05,
    trigo: 0.9,
    arroz: 0.35,
    brizantha_marandu: 0.9,
    brizantha_piata: 0.9,
    brizantha_paiaguas: 0.9,
    ruziziensis: 1.0,
    soja: 0.75,
    feijao: 0.75,
    crotalaria_juncea: 0.45,
    crotalaria_spectabilis: 0.7,
    crotalaria_ochroleuca: 0.55,
    algodao: 0.9
};

export function proporcaoRaiz(crop) {
    return crop.morfologia?.raizParteAerea
        ?? PROPORCAO_CULTURA[crop.id]
        ?? PROPORCAO_ARQUETIPO[crop.archetype]
        ?? 1;
}
