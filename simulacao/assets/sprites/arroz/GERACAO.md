# Arte do arroz — lote inicial

Gerado em 11/11/2026 com ferramenta integrada `image_gen` (sem CLI/API externa). Prancha original preservada como `arroz_fases_progresso.png`. Os cinco pares PNG = recortes mecânicos da prancha. Sem repintura procedural da arte.

## Integração e limites

- `manifest.json` habilita 21 combinações: sete fases × três variantes normais, estado cheio quando reprodutivo.
- Variantes compartilham os cinco recortes. Escala, direção e balanço continuam variando por planta no talhão.
- IP reutiliza EMB, resolução ajustada à altura da fase. GP reutiliza FL, com maturação da fase. Evita misturar arte e desenho procedural só por sorteio de variante ou troca para IP/GP.
- Posturas e estados reprodutivos adaptados da própria arte sob demanda (`adaptarArte` em `mask.js`). Mesma deformação na cor e na máscara, colo fixo.
  - Enrolamento estreita planta. Murcha também abaixa extremidades.
  - Parcial e abortado comprimem região superior da panícula. Aproximação geométrica, sem pintura anatômica própria.
- As 117 combinações mantêm estilo pintado, inclusive a partir do dia 63 no veranico.

`.dados.png` usam `spriteDeImagens`: mesma aproximação de máscara pela cor do carregador. Não são máscaras anatômicas pintadas à mão: idade pela altura, coordenadas aproximadas, classificação por cor. Máscara da floração ainda pode classificar espiguetas verdes como folhas. Pendente: refinamento anatômico e medição de desempenho em navegador interativo.

Reprodução: `node scripts/preparar-arroz.mjs`. Requer Edge local; não instala dependências. Sobrescreve só derivados deste lote. Gera capturas em `scratch/arroz/`.

Script verifica:

- carregamento das 21 entradas;
- obtenção das 117 combinações válidas;
- arte em todas as plantas saudáveis do talhão nas sete fases;
- alteração visual pelos sintomas de N, S, K e déficit hídrico;
- imagens e máscaras adaptadas para posturas e aborto;
- 3.528 estados de planta nas sete fases;
- cena real no dia 63.

Terceiro argumento escolhe dia da captura (ex.: `node scripts/preparar-arroz.mjs "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" 120`). Calibração de resolução usa altura média e janela de crescimento da cultura.

## Prompt de geração

Use case: stylized-concept. Create a production sprite sheet for Farmatro, a painted 2D isometric farming game. TRUE TRANSPARENT background. Landscape 1536x1024 canvas. Exactly FIVE isolated rice plants (Oryza sativa) in FIVE equal-width columns from left to right, all bases aligned at y=940, no overlap, generous transparent gutters. Whole plants, nothing cut off. Column 1: very small seedling 2-3 bright green narrow leaves, plant height about 180px. Column 2: vegetative tillering clump with five basal shoots and slim arching pointed leaves, height about 440px. Column 3: booting rice clump seven erect slender culms, many narrow sword leaves, swollen flag-leaf sheaths, NO emerged panicles, height about 710px. Column 4: flowering rice clump, seven culms with distinct OPEN BRANCHING rice panicles, delicate hanging oval green spikelets and tiny pale anthers, mostly upright/slightly arching green panicles, height 850px. Column 5: mature golden rice clump, heavy OPEN BRANCHING panicles bending downward with many elongated gold grains, straw gold stems and leaves with a little green at base, height 850px. Important botanics: rice bears open loose drooping branched panicles, NEVER compact wheat ears, NEVER corn cobs. Painted polished casual game art, dimensional leaves with bright upper-right highlights, olive shadows, warm saturated healthy greens becoming gold only on last plant, fine organic dark green contours, coherent scale and same lighting, slight overhead isometric view. No labels, no text, no soil, no roots, no cast shadow, no scenery, no decorative elements. Each plant within its own column and completely separated by transparent space.

## Prompt de transparência

Background extraction edit ONLY. Remove the entire background INCLUDING ALL GREEN AND GOLD GLOW / HALO around these five rice plants. Output true RGBA transparent pixels between and around every plant and between leaves. Preserve EXACT original canvas dimensions, all five plants, positions, scale, all leaves stems and rice grains, colors and lighting. No new painting, no shadows, no glow, no black or green backdrop, no checkerboard painted into image. Clean crisp alpha cutout of the five plants only.
