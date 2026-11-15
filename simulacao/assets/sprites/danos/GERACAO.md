# Pinturas de danos

Geradas com `image_gen` integrado, usando `../soja/soja_fases_progresso.png`
como referência de pintura e iluminação. Arquivo final: `atlas.png`.

Seis pinturas de tecido em uma grade 3×2: seca, deficiência de N, queima por K,
lesões de sucção, clorose associada a dano radicular e calor. O arquivo original
é preservado. O compositor amostra as pinturas pela máscara e mescla a intensidade
com os estados calculados. Alfa e silhueta dos crops não mudam.

Isso adiciona pinturas de superfície compartilhadas entre as 15 culturas;
não são 15 conjuntos independentes de plantas inteiras danificadas. As posturas
de enrolamento/murcha e perdas reprodutivas continuam com a adaptação geométrica
existente. Órgãos verdes ainda podem ser confundidos com folhas pela máscara
automática; a aplicação nova exclui tecidos originalmente creme, rosa e marrom.

Percevejo/nematoide vêm das frações de perda do motor de rotação, com ganho
visual de 5×, crescente conforme a fase. Não acrescentam outra penalidade à
produção. São representações didáticas: clorose não identifica nematoide e não
se desenham insetos onde existe apenas uma pressão calculada. Não há lagartas,
doenças ou mastigação modeladas neste lote.

`node simulacao/test/danos-pintados.mjs` verifica atlas, cache, mudanças de cor
e preservação do alfa em 105 combinações, uma fase de cada cultura com sete
condições. Galeria: `simulacao/scratch/danos/galeria.png` (a partir da raiz).

## Prompt final

Production texture atlas for painted botanical farming game, match reference softly shaded hand-painted leaves warm light and natural dark contours. ONE 1536x1024 image, exact 3 columns by2rows of edge-to-edge rectangular close-up LEAF SURFACE TEXTURES, no white margins no labels no text no insects no plant silhouettes. Each tile512x512, leaves fill entire tile, central vein vertical with detailed organic branching veins. Top left drought: grey olive tissue dry brown curling/crinkled margins and irregular tan scorched patches. Top middle nitrogen deficiency: diffuse pale yellow chlorosis with subtle veins and old tissue. Top right potassium damage: irregular brown necrotic edges fading into yellow then green center. Bottom left stink bug sucking injury: green leaf tissue with sparse tiny corky dark punctures each with pale yellow halo, no chewed holes. Bottom middle root stress associated chlorosis: dull yellow-green interveinal mottling, no holes or insects, nonspecific root injury signal. Bottom right heat injury: bleached irregular ivory tan lesions amid healthy green tissue. These six painted tiles will be sampled through existing leaf masks; avoid anything outside the tissue. Match game illustration not photograph, no grunge black borders. Tile layout exact, all equal square cells.
