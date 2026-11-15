// Classes de solo. Cores no formato original do diorama (hex para horizontes, RGB 0-255 para o topo).
// Água em fração volumétrica: saturação, capacidade de campo (cc) e ponto de murcha (pmp).
// Valores típicos aproximados, para visualização; calibrar com análise do solo real.
//
// perfil: sequência de horizontes, em metros (o bloco mostra 0 a 1,2 m).
//   temB   : false = perfil A-C (sem horizonte B).
//   baseB  : profundidade onde começa o C. Maior que 1,2 m = C fora do bloco.
//   transA : largura da transição A -> B (ou A -> C, sem B).
//   transB : largura da transição B -> C.
// Larguras seguem as classes de transição do Manual de Descrição e Coleta de Solo:
//   abrupta < 2,5 cm, clara 2,5-7,5 cm, gradual 7,5-12,5 cm, difusa > 12,5 cm.
// Raízes: as culturas do plano concentram raízes em 0-40 cm e a zona efetiva vai até ~1 m
// (FAO-56, tabela 22). Por isso o bloco tem 1,2 m e não mostra o C dos Latossolos (> 2 m).

export const CLASSES_SOLO = {
    latossolo_vermelho: {
        nome: 'Latossolo Vermelho (argiloso)',
        argila: 0.6,
        horizontes: { A: 0x3b2314, B: 0x7c3f1d, C: 0xb5885c },
        perfil: { temB: true, baseB: 3.0, transA: 0.18, transB: 0.4 },   // Bw muito profundo, transição difusa
        topo: [[24, 15, 9], [58, 36, 20]],
        claro: [128, 74, 46],      // superfície com pouca matéria orgânica
        crosta: [150, 104, 78],    // película de selamento
        agua: { sat: 0.52, cc: 0.38, pmp: 0.24 },
        infiltracao: 70,           // mm/dia com solo bem estruturado
        drenagem: 0.8,             // fração da água gravitacional drenada por dia
        propensaoCrosta: 0.55
    },
    latossolo_vermelho_amarelo: {
        nome: 'Latossolo Vermelho-Amarelo (textura média)',
        argila: 0.35,
        horizontes: { A: 0x3e2a1a, B: 0x9a5a2a, C: 0xc49a68 },
        perfil: { temB: true, baseB: 2.5, transA: 0.14, transB: 0.4 },   // Bw profundo, transição gradual a difusa
        topo: [[34, 24, 15], [72, 52, 32]],
        claro: [150, 108, 70],
        crosta: [176, 140, 100],
        agua: { sat: 0.46, cc: 0.28, pmp: 0.15 },
        infiltracao: 90,
        drenagem: 0.85,
        propensaoCrosta: 0.8
    },
    neossolo_quartzarenico: {
        nome: 'Neossolo Quartzarênico (arenoso)',
        argila: 0.1,
        horizontes: { A: 0x5a4632, C: 0xdcc497 },                          // sem B: perfil A-C
        perfil: { temB: false, baseB: 0, transA: 0.08, transB: 0 },      // areia até > 1,5 m, transição clara a gradual
        topo: [[70, 56, 40], [120, 100, 72]],
        claro: [186, 160, 118],
        crosta: [200, 180, 140],
        agua: { sat: 0.40, cc: 0.14, pmp: 0.05 },
        infiltracao: 200,
        drenagem: 0.95,
        propensaoCrosta: 0.3
    }
};
