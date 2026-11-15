# Plano de assets de culturas — Farmatro (2D isométrico com sprites por fase)

**Objetivo:** simular 13 culturas (6 plantas de cobertura + 7 culturas comerciais) em todas as fases notáveis do ciclo, em talhão mostrado como **diorama isométrico 2D**. Usuário deve **perceber visualmente** estresse hídrico, térmico, nutricional e de solo/raiz, nas plantas e no solo (superfície e perfil).

Referências visuais (em `assets/crops/`):

- **Planta isolada (Referência A):** [`assets/crops/referencia_a_milho.png`](file:///c:/Workspace/Farmatro/assets/crops/referencia_a_milho.png). Sprite pintado em alta definição, sombreamento suave com luz de topo/direita, contorno escuro orgânico, cores saturadas (milho com pendão dourado, espiga laranja de grãos visíveis na palha verde, estigmas âmbar).
- **Lavoura e canteiros (Referência B):** [`assets/crops/referencia_b_trigo_canteiros.jpg`](file:///c:/Workspace/Farmatro/assets/crops/referencia_b_trigo_canteiros.jpg). Diorama em vista isométrica casual, canteiros de terra marrom com torrões, variação intra-linha em 3 fases fenológicas (plântula verde viva, espigamento ereto, maturação dourada).
- **Diorama:** bloco de terreno isométrico, topo cultivado, duas faces de corte mostrando horizontes do solo (mesmo enquadramento do protótipo 3D).

---

## 1. Decisão: 2D isométrico com sprites por fase

Protótipo 3D (three.js, malhas instanciadas, shaders) provou modelo de simulação. Três problemas:

- **Acabamento:** órgãos procedurais 3D (vagens, capulhos, touceiras) com cara de geometria, longe da referência pintada.
- **Custo:** sombras, shaders de sintoma e centenas de instâncias pesam em celular e notebook sem GPU dedicada.
- **Pipeline:** exportar e compatibilizar malhas (Blender, glTF) desviava esforço da regra agronômica.

O que muda e o que fica:

| Parte | Antes (3D) | Agora (2D isométrico) |
|---|---|---|
| Simulação (`sim/`, `domain/soil/scenarios.js`, `domain/soil/presets.js`, `stress/`, `crops/`) | JS puro | **Igual.** Nenhuma mudança |
| Planta | Malha procedural + shader de sintomas | **Sprite por fase** (cor + máscara de dados) + sintomas pintados por pixel |
| Superfície do solo | Shader sobre plano deslocado | Textura em canvas recalculada por dia, projetada no losango do topo |
| Perfil do solo | Shader nas faces do bloco | Textura em canvas por face, projetada nas duas faces visíveis |
| Raízes | Atlas em canvas lido pelo shader | **Mesmo atlas**, desenhado direto sobre as faces |
| Câmera | Ortográfica com órbita livre | Projeção isométrica fixa, pan e zoom |

---

## 2. Camadas do sistema

| Camada | O que define | Onde mora |
|---|---|---|
| **Cultura** | Fases, morfologia, paleta, sensibilidades, lista de sprites | Dados: 1 arquivo por cultura (`src/domain/crops/`) |
| **Sprite set** | Imagem de cada fase notável, em posturas e variantes, com máscara de dados | Arte (`assets/sprites/<cultura>/`) ou pintor procedural do arquétipo |
| **Estado** | Fase `t` + vetor de estresse por planta (agudo e crônico) | Simulação diária (`src/simulation/season.js`) |
| **Solo** | Estado físico, químico e biológico por célula e por profundidade | Rasters da simulação (grade 32 × 32 × 12 camadas) |

Aparência da planta = `sprite(cultura, fase, postura, variante)` + `sintomas(máscara, estresse)` + `transformação(crescimento, acamamento, vento)`.

Aparência do solo = `solo(estado do dia)` pintado no topo e nas faces do bloco.

---

## 3. Vista isométrica

### 3.1 Projeção

Coordenadas de mundo em unidades do diorama: `x` e `z` no plano do talhão, `y` para cima.

- **Bloco:** topo 4,2 × 4,2 u, altura 0,9 u. Fatia fina: lavoura domina cena.
- **Sem bordadura de grama:** recorte corta lavoura. Canteiros vão de ponta a ponta. Plantas quase na beira (margem de cada cultura × 0,5, `margemPlantio` em `render/field/lavoura.js`).
- **Transição topo-face:** no alto de cada face, cor da beira do topo desce alguns pixels e dissolve no perfil. Sem contorno entre topo e face.
- **Arestas visíveis** (beira do topo, quina vertical da frente): arredondadas. Quarto de cilindro de 0,07 u, desenhado em faixas com textura da face e luz girando do topo para a face (`desenharArredondado` em `render/iso/diorama.js`).
- **Seis cantos da silhueta** (fundo do topo, laterais em cima e embaixo, quina de baixo da frente): arredondados por recorte em hexágono de cantos curvos, sombra suave por dentro da borda (`contornoArredondado`).
- **Profundidade:** simulação calcula 1,2 m de perfil. Bloco mostra só primeiros 0,30 m, escala vertical maior (3 u por metro). Nessa faixa aparecem consequências do clima e do manejo: crosta, horizonte A, pé-de-grade, topo do subsolo ácido, frente de molhamento, gleização superficial, grosso das raízes. Raiz além do fundo da fatia sai pela borda de baixo.
- **Talhão:** 7 × 7 plantas. Cada planta e cada raiz da borda ficam legíveis.

```
tela.x = origem.x + (x − z) · cos30° · escala
tela.y = origem.y + (x + z) · sin30° · escala − y · escala
```

- Câmera olha de `+x +z`: faces visíveis são **+X** (frente direita) e **+Z** (frente esquerda).
- Pan arrastando, zoom com roda ou pinça. Projeção é transformação afim: topo e faces são texturas comuns desenhadas com `setTransform`.
- Vista fixa na interface, conforme solicitado. O renderizador conserva suporte interno aos quatro ângulos e atlas de raízes nas quatro paredes.

### 3.2 Ordem de desenho

1. Sombra do bloco no chão.
2. Faces +X e +Z (perfil do solo, raízes, sombreamento da face).
3. Topo (superfície do solo, canteiros, palhada, poças, rachaduras).
4. Sombras das plantas sobre o topo.
5. Plantas ordenadas de trás para frente por `x + z` (algoritmo do pintor).
6. Destaque da seleção e rótulos.

Sem z-buffer. Plantas só ficam sobre o topo: ordenação por `x + z` basta.

### 3.3 Estilo do bloco

- Topo: canteiros (camalhões) de ponta a ponta ao longo das linhas de plantio, com torrões. Entrelinha mostra estado do solo. Sem bordadura: beira do topo continua na face por transição de cor.
- Faces: horizontes A, B e C com transição irregular, torrões, textura de corte. Face +X mais clara, +Z mais escura (luz da direita).
- Quina frontal com chanfro leve, sombra suave sob o bloco, como no diorama de referência.

---

## 4. Sprites por fase

### 4.1 Contrato do sprite

Cada sprite tem duas imagens do mesmo tamanho:

| Imagem | Conteúdo |
|---|---|
| `cor` | A planta pintada (RGBA). É o que o usuário vê sem estresse |
| `dados` | Máscara de dados que diz, por pixel, onde aplicar cada sintoma |

Canais da máscara `dados`:

| Canal | Significado | Faixa |
|---|---|---|
| R | `u`: posição ao longo do órgão (base → ponta) | 0..255 |
| G | `v`: distância da nervura central até a margem | 0..255 |
| B | `órgão × 32 + idade`: órgão em 3 bits, idade da folha em 5 bits | 0..255 |
| A | Cobertura (mesma silhueta da `cor`) | 0..255 |

Órgãos: 1 folha, 2 colmo/haste, 3 inflorescência masculina (pendão, panícula), 4 grão/fruto, 5 palha/bráctea, 6 estigma/flor, 7 vagem/capulho. Idade: 0 (folha mais nova, topo) a 31 (mais velha, baixeiro). Sem idade, regra de mobilidade dos nutrientes (seção 6.2) não funciona.

Metadados de cada sprite (no manifesto):

- `ancora`: pixel da base do colmo (onde planta toca solo).
- `alturaU`: altura de referência da planta naquele sprite, em unidades do diorama.
- `resolucao`: pixels por unidade (padrão 200 px/u, suficiente para zoom 2×).

### 4.2 Fases, posturas e variantes

- **Fase:** um sprite por fase notável da cultura (seção 5). Entre duas fases, sprite da fase atual escala pela altura simulada: crescimento contínuo dentro da fase.
- **Postura:** `normal`, `enrolada` (estresse hídrico ou calor moderado), `murcha` (severo). Gramíneas: folha estreita e sobe ("charuto"). Leguminosas: folíolos caem e mostram face inferior.
- **Variante:** 3 desenhos por fase e postura. Lavoura não parece carimbada.
- **Estado reprodutivo:** fase com órgão reprodutivo tem versões `cheia`, `parcial`, `abortada` (espiga falhada, vagens chochas, flores caídas).

Total por cultura: ~10 fases × 3 posturas × 3 variantes, mais versões reprodutivas. Para não pintar centenas de imagens à mão, sprite nasce do pintor procedural do arquétipo (seção 4.4).

### 4.3 Manifesto e arquivos

```
assets/sprites/milho/
  manifest.json
  milho_fases_progresso.jpg     prancha visual de referência da cultura
  VT_normal_0.png               cor
  VT_normal_0.dados.png         máscara de dados
  R3_enrolada_parcial_1.png     fases com espiga levam o estado da espiga no nome
  ...
```

Cada cultura pode ter prancha `<cultura>_fases_progresso.png` (ou `.jpg`) com cinco marcos visuais: emergência, vegetativo, florescimento, enchimento reprodutivo, maturação. Prancha guia pintura dos recortes. Não entra no `manifest.json`. Só pares `cor` + `dados` com silhueta compatível substituem sprites procedurais no jogo.

Nome do sprite: `<fase>_<postura>[_<espiga>]_<variante>`. `manifest.json` lista cada sprite com `cor`, `dados`, `ancora`. Carregador só procura arte quando `sprites.arte` é `true` nos dados da cultura. Usa PNG quando existe; senão, cai no pintor procedural. Cena funciona desde o primeiro dia. Arte final entra fase por fase, sem mudar código.

### 4.4 Pipeline de arte

1. Pintor procedural do arquétipo gera `cor` e `dados` para cada fase, postura e variante. Exportar pares como PNG ainda não implementado (pendente, seção 10).
2. Artista pinta por cima da `cor` (Krita, Photoshop, Aseprite), **mantendo silhueta**: alpha travado, mesmo enquadramento, mesma âncora.
3. Máscara `dados` continua válida: silhueta não mudou. Forma mudou muito: artista ajusta máscara de órgão (canal B) e gerador reconstrói `u` e `v`.
4. Exporte com mesmo nome. Carregador pega PNG automaticamente.
5. **Estado atual:** `.dados.png` da arte pintada (milho, soja, feijão) não acompanham silhueta (colmo e espiga em retângulo, idade em faixas). Geravam sintomas em blocos e listras. Por isso carregador ignora PNG de dados da arte e gera máscara da própria cor (`mascaraDaCor` em `src/render/sprites/mask.js`):
   - verde = folha (recebe sintoma);
   - branco / amarelo-laranja / roxo / marrom = flor, grão, pendão, palha (sem sintoma);
   - idade pela altura; `u` pela distância ao eixo; `v` pela distância à borda da folha.

   Também remove franja branca do recorte (`removerFranja`). Nas gramíneas (sem órgão branco), remove fundo branco preso entre folha e colmo (`removerBrancoPreso`). Canal de órgão perde colmo e pendão separados. Com máscaras pintadas na silhueta certa, basta voltar a lê-las em `spriteDeImagens`.

### 4.5 Pintores procedurais por arquétipo

Cada um dos 5 arquétipos tem pintor 2D. Desenha planta com props compartilhados (fita de gramínea, folha simples, trifoliolada, palmada, colmo, inflorescências, frutos). Pintor = fonte da máscara de dados e substituto da arte final.

| Arquétipo | Culturas | Props usados |
|---|---|---|
| **A. Gramínea de colmo** | Milho, Sorgo, Milheto | Colmo com nós, folha em fita, pendão / panícula / "vela", espiga na palha |
| **B. Gramínea de touceira** | Trigo, Arroz, B. brizantha (Marandu, Piatã, Paiaguás), B. ruziziensis | Coroa com perfilhos, folha estreita, espiga aristada, panícula pendente, racemos |
| **C. Leguminosa baixa** | Soja, Feijão | Haste com nós, cotilédones, folhas unifolioladas e trifolioladas, flores axilares, vagens |
| **D. Leguminosa arbustiva** | Crotalária juncea, spectabilis, ochroleuca | Haste ereta fibrosa, folha simples ou trifoliolada, racemo amarelo, vagem inflada |
| **E. Malvácea arbustiva** | Algodão | Haste monopodial, ramos simpodiais, folha palmada lobada, botão com brácteas, flor, maçã, capulho |

Características por espécie e cultivar que sprites precisam mostrar:

1. **Arquétipo A**
   - **Milho:** colmo grosso; folhas longas e arqueadas; pendão terminal ramificado; espigas axilares com palha e estigmas ("cabelo"); raízes adventícias de escora no colo.
   - **Sorgo:** colmo com cera esbranquiçada; nervura central branca conspícua; panícula compacta ou semiaberta com grãos vermelhos, creme ou marrons.
   - **Milheto:** perfilha na base; panícula cilíndrica ereta e compacta ("vela"); folhas estreitas; ciclo curto.
2. **Arquétipo B**
   - **Trigo:** vários perfilhos rente ao solo; folhas finas eretas; espiga com aristas; verde-azulado virando dourado.
   - **Arroz:** touceira com folhas ásperas eretas; panícula aberta que curva com o peso dos grãos; lâmina d'água no irrigado.
   - **Marandu:** touceira alta (até 1,5 m), folhas largas verde-escuras, bainhas pilosas, racemos unilaterais.
   - **Piatã:** porte médio, colmos e folhas mais finos, floresce mais cedo.
   - **Paiaguás:** muito folhosa, mantém folha verde na seca.
   - **Ruziziensis:** hábito decumbente; colmos deitam e enraízam nos nós; folhas verde-claras; forma "tapete" contínuo.
3. **Arquétipo C**
   - **Soja:** cotilédones, par de folhas unifolioladas opostas, depois trifolioladas ovais; flores pequenas roxas ou brancas nas axilas; vagens pilosas agrupadas; nódulos rosados na raiz.
   - **Feijão:** trifolioladas maiores, cordiformes; flores brancas ou violetas; vagens longas e lisas; hábito determinado ou com guias.
4. **Arquétipo D**
   - **C. juncea:** a mais alta (2–3 m); folha simples lanceolada; racemos longos amarelo-ouro; vagens infladas ("chocalho").
   - **C. spectabilis:** porte menor (1,0–1,5 m); folha simples obovada; flores amarelas com estrias escuras.
   - **C. ochroleuca:** porte intermediário; trifolioladas de folíolos estreitos; flores amarelo-claras.
5. **Arquétipo E**
   - **Algodão:** haste lenhosa com ramos frutíferos; folhas palmadas de 3 a 5 lobos; botão com 3 brácteas dentadas; flor creme no 1º dia e rosada no 2º; maçãs verdes; capulho branco aberto.

Três cultivares de brizantha ficam em arquivo de dados único, com 3 variantes.

---

## 5. Fases notáveis (lista de sprites por cultura)

Dias aproximados. Calibre com ciclo do cultivar usado.

| Cultura | Sprites de fase | Marcos visuais que não podem faltar |
|---|---|---|
| **Milho** | VE, V2, V4, V6, V9, V12, VT, R1, R3, R5, R6 | Pendão (VT); estigma verde → marrom (R1 → R3); espiga dobrando; palha secando |
| **Sorgo** | Emergência, 3 folhas, 5 folhas, folha bandeira, emborrachamento, floração, grão leitoso, pastoso, maturação | Panícula saindo da bainha; cor do grão |
| **Milheto** | Emergência, perfilhamento, alongamento, emborrachamento, "vela", grão, maturação, dessecação, palhada | Vela cilíndrica; perfilhos múltiplos |
| **Trigo** | Emergência, afilhamento, alongamento, emborrachamento, espigamento, antese, grão leitoso, massa, maturação | Espiga com ou sem aristas; verde → dourado |
| **Arroz** | Plântula, perfilhamento, iniciação da panícula, emborrachamento, floração, grão leitoso/pastoso, maturação | Panícula curva com o peso; lâmina d'água |
| **Soja** | VE, VC, V2, V4, R1–R2, R3–R4, R5, R6, R7, R8 | Flores; vagens; amarelecimento uniforme (R7); desfolha e vagens marrons (R8) |
| **Feijão** | V0, V1, V2 (folhas primárias), V3, V4, R5, R6, R7, R8, R9 | Folhas primárias simples opostas; flores; vagens |
| **Algodão** | Cotilédones, vegetativo, B1, F1, C1, abertura de capulhos, maturação | Flor creme → rosada; capulho branco aberto |
| **Braquiárias** | Emergência, perfilhamento, touceira, alongamento, florescimento, sementes, dessecação, palhada | Racemos; densidade da touceira; fechamento do dossel |
| **Crotalárias** | Emergência, vegetativo, floração plena, vagens, corte/rolagem, palhada | Racemos amarelos; floração plena = ponto de manejo |

**Plantas de cobertura têm 2 fases extras: dessecação e palhada.**

- **Dessecação:** 7–15 dias de verde → verde-acinzentado → palha. Feito por tinta sobre sprite da última fase viva, não por sprite novo.
- **Rolagem / acamamento:** sprite gira até deitar sobre o topo.
- **Palhada:** planta sai e entra na textura de palhada do topo (canal `palhada` do solo). Palhada protege contra crosta, esfria superfície, decompõe aos poucos. Cultura seguinte nasce atravessando essa camada.

---

## 6. Como estresse fica visível na planta

### 6.1 Vetor de estresse por planta

Cada planta tem 12 canais, de 0 (sem estresse) a 1 (severo): `agua_deficit`, `agua_excesso`, `calor`, `frio`, `N`, `P`, `K`, `Mg`, `S`, `Zn`, `FeMn`, `raiz`.

Cada canal tem dois valores:

- **agudo:** estresse de hoje. Controla sintomas reversíveis (postura enrolada, murcha, cor acinzentada).
- **crônico:** histórico. Controla danos permanentes (porte menor, necrose, aborto, senescência precoce).

Separação deixa usuário diferenciar "planta com sede agora" de "planta passou fome a safra inteira".

### 6.2 Regra da mobilidade dos nutrientes

- **Móveis (N, P, K, Mg):** sintoma nas **folhas velhas (baixeiro)**. Planta tira nutriente delas e manda para as novas.
- **Imóveis (S, Ca, B, Zn, Fe, Mn, Cu):** sintoma nas **folhas novas (ponteiro)**.
- Exceção: no algodão, deficiência tardia de K aparece nas folhas do topo.

Com severidade, sintoma avança da folha mais velha para mais nova (móveis) ou da mais nova para mais velha (imóveis). Idade vem do canal B da máscara.

### 6.3 Tabela de sintomas

| Canal | Onde | Padrão de cor | Forma (postura / transformação) |
|---|---|---|---|
| Déficit hídrico | Planta toda, topo primeiro | Verde-acinzentado; depois queima da ponta e baixeiras secas | Postura `enrolada` → `murcha`. Crônico: porte menor, aborto |
| Encharcamento | Folhas velhas → planta toda | Amarelecimento geral (parecido com falta de N) | Murcha mesmo com solo molhado; raiz escura no corte |
| Calor | Topo e órgãos florais | Queima de ponta, manchas esbranquiçadas | Postura `enrolada`; pendão seco; espiga falhada |
| Frio / geada | Folhas novas e expostas | Arroxeado (frio leve); placas necróticas palha (geada) | Concentra nas baixadas |
| N | Folhas velhas | Gramíneas: "V" amarelo da ponta pela nervura central. Dicotiledôneas: clorose uniforme | Planta baixa, poucos perfilhos |
| P | Folhas velhas, margens | Arroxeado, verde-escuro opaco | Planta pequena e atrasada |
| K | Folhas velhas, margens | Clorose e necrose da margem a partir da ponta | Colmo fraco → acamamento |
| Mg | Folhas velhas | Estrias internervais amarelas | — |
| S | Folhas novas | Palidez uniforme | Entrenós curtos |
| Zn | Folhas novas | Faixas esbranquiçadas na base da folha | Entrenós curtos |
| Fe / Mn | Folhas novas | Clorose internerval fina | — |
| Raiz / solo ruim | Planta toda | Déficit hídrico precoce mesmo com pouca seca | Plantas desiguais em faixas ou reboleiras; acamamento |

### 6.4 Implementação: operadores sobre a máscara de dados

Sintomas = funções de `u`, `v` e idade, lidas da máscara. Mesmos operadores do shader 3D, agora por pixel em JavaScript:

| Operador | Regra | Usado por |
|---|---|---|
| `tipBurn` | necrose se `u > 1 − s` | déficit hídrico crônico, calor |
| `marginScorch` | clorose e necrose se `v > 1 − s·(0,15 + 0,6u)` | K |
| `vChlorosis` | amarelo se `v < s·u` | N em gramíneas |
| `interveinal` | listras ao longo de `v` (nervuras paralelas) | Mg, Fe/Mn |
| `purpleMargin` | antocianina crescendo para a margem | P, frio leve |
| `uniformPale` | perda de saturação geral | S, encharcamento |
| `basalBands` | faixas claras entre nervura e margem na base | Zn |
| `necroticSpots` | manchas por ruído | geada, calor |
| `senescence` | verde → amarelo → palha pela idade | maturação, acelerada por estresse |

Custo e cache:

- Operadores rodam só nos pixels de folha, só quando dia, cenário ou modo mudam.
- Vetor de estresse quantizado (5 níveis por canal, após ganho do modo exagerado). Imagem resultante fica em cache pela chave `sprite + vetor quantizado`. Plantas vizinhas com estresse parecido reaproveitam mesma imagem.

Transformações por planta, aplicadas no desenho (custo zero):

| Transformação | Efeito | Usado por |
|---|---|---|
| Escala vertical | Altura simulada / altura de referência do sprite | crescimento, nanismo |
| Rotação pela âncora | Planta tomba para um lado | acamamento (raiz, K) |
| Cisalhamento | Balanço suave pelo vento | todas |

### 6.5 Modos de visualização

1. **Realista:** sintomas na intensidade real.
2. **Exagerado:** ganho de 1× a 3× na intensidade.
3. **Mapa:** falsa-cor (rampa viridis) por canal de estresse da planta ou por canal do solo, com legenda. No mapa do solo, plantas ficam translúcidas e cinza.

Clique em planta: inspetor com vetor de estresse. Clique no topo ou numa face: perfil daquela célula como gráfico por profundidade.

### 6.6 Padrões espaciais

Agricultor percebe estresse primeiro pelo padrão no talhão, não pela folha. Vista isométrica mostra:

- **Reboleiras:** manchas circulares (fertilidade, nematoides, encharcamento).
- **Faixas:** rastros de máquina com compactação.
- **Baixadas:** geada e encharcamento.
- **Topos:** déficit hídrico, solo raso.

---

## 7. Estresse do solo

Solo tem estado próprio. Degrada, se recupera (principalmente com plantas de cobertura), causa parte dos estresses das plantas.

### 7.1 Vetor de estado do solo

Grade 32 × 32 células sobre o talhão. Cada célula: valores de superfície e perfil de 12 camadas de 10 cm (0 a 1,2 m).

| Canal | Tipo | Faixa |
|---|---|---|
| `umidade` | por profundidade | ponto de murcha → capacidade de campo → saturado |
| `compactacao` | por profundidade | resistência à penetração (0–4 MPa) |
| `crosta` | superfície | 0 solto, 1 selado |
| `materia_organica` | por profundidade | define cor do horizonte A e agregação |
| `palhada` | superfície | % de cobertura |
| `acidez` | por profundidade | saturação por alumínio |
| `salinidade` | superfície e perfil | condutividade elétrica |
| `fertilidade` | por profundidade | N, P, K, Mg, S, Zn, Fe/Mn |
| `biologia` | por profundidade | minhocas, bioporos |
| `gleizacao` | por profundidade | dias saturado acumulados |
| `temperatura` | superfície | °C; solo descoberto esquenta mais |
| `poca` e `rachadura` | superfície | lâmina d'água (mm) e índice de rachadura |

Parâmetros fixos da classe de solo: argila, cores dos horizontes, sequência de horizontes (`perfil` em `presets.js`), água (saturação, capacidade de campo, ponto de murcha), infiltração, drenagem, propensão a crosta.

### 7.2 Representação visual

| Estresse | Topo (superfície) | Faces (perfil) |
|---|---|---|
| **Seca** | Mais claro e fosco; rachaduras poligonais (só argiloso) | Faixa úmida escura só no fundo; frente de molhamento descendo após chuva |
| **Encharcamento** | Escuro; poças nas baixadas e rastros | Lençol visível; mosqueados cinza-azulados (gleização) |
| **Compactação** | Rastros de pneu com garras; poças nos rastros; plantas menores em faixas | Camada laminar densa a 18–30 cm; raízes entortando em "L" |
| **Crosta** | Película lisa e clara | Primeiros milímetros mais densos |
| **Baixa matéria orgânica** | Solo claro, sem palhada | Horizonte A claro e fino |
| **Boa matéria orgânica** | Palhada, solo escuro e grumoso | A escuro e espesso, bioporos, minhocas |
| **Acidez / alumínio** | Sem cor própria | Raízes curtas e grossas paradas no subsolo |
| **Salinidade** | Eflorescências brancas | Faixa de sal perto da superfície |

Acidez, fertilidade e temperatura sem assinatura visual direta no solo. Aparecem pelas plantas, pelas raízes no corte e pelo modo mapa. Não invente cor para elas no modo realista.

### 7.3 Implementação 2D

- **Topo:** canvas 768 × 768 px para os 4,2 × 4,2 u. Camadas estáticas (ruído, canteiros, torrões, células de Voronoi das rachaduras, fios de palha, garras de pneu) calculadas uma vez por cenário. A cada dia, cada pixel combina essas camadas com estado da célula (interpolação bilinear das texturas `S0`, `S1`, `S2`). Canvas desenhado no losango do topo com transformação afim.
- **Faces:** um canvas por face (768 × 440 px). Cada pixel lê camada (`P0`, `P1`) da célula da borda e profundidade. Pinta horizonte com transição irregular, umidade, camada laminar, gleização, bioporos, sal. Atlas de raízes desenhado por cima, mesma escala métrica. Cada face mostra só camadas até profundidade visível (0,6 m); raízes mais fundas cortadas na borda inferior da face.
- **Raízes:** desenho mínimo, só para ler estresse.
  - Alcance: proporção profundidade efetiva da raiz (~80 % da raiz) : altura da planta de cada cultura (`src/domain/crops/proporcao-raiz.js`, padrão por arquétipo; milho 1 : 1). Proporção aplicada à altura visível do sprite no dia (medida nos pixels da imagem): raiz cresce com planta. Barreiras ficam na profundidade real do solo.
  - Plantas da linha de borda têm poucos eixos grossos na face mais próxima (nodais em guarda-chuva no milho, pivô com laterais curtas na soja), cada planta na sua faixa.
  - Raiz restrita ganha tracejado até profundidade potencial, só quando potencial cabe na parte visível. Potencial abaixo da borda de baixo não é marcado.
  - Compactação: "L" sobre camada densa (rente à superfície no rodado), ponta inchada. Acidez: eixo curto, ponta marrom. Camada com raiz morta por encharcamento: trecho marrom-escuro. Leguminosas: nódulos rosados (ativos) ou brancos (inativos).
- **Modo mapa:** topo pintado por célula com rampa; faces pintadas por camada.

### 7.4 Dinâmica: solo muda com manejo

| Evento | Efeito no estado | O que se vê |
|---|---|---|
| Chuva forte em solo descoberto | Crosta ↑, infiltração ↓ | Enxurrada, poças |
| Chuva com palhada | Infiltração ↑ | Água some; frente de molhamento desce na face |
| Tráfego com solo úmido | Compactação ↑ nos rodados | Rastros; faixa de plantas menores |
| Veranico | Umidade ↓, temperatura ↑ | Rachaduras; frente seca descendo |
| Calagem / gessagem | Acidez ↓ | Pó branco; raízes descem mais |
| Braquiária ou crotalária juncea por uma ou mais safras | Compactação ↓ (bioporos), MO ↑, biologia ↑ | Canais de raiz atravessando a camada densa; A escurece |
| Dessecação da cobertura | Palhada ↑, temperatura ↓, crosta ↓ | Palha cobrindo o topo |
| Revolvimento (grade / arado) | Crosta ↓; MO ↓; pé-de-grade abaixo da profundidade de trabalho | Solo solto em cima, camada densa embaixo |

### 7.5 Como solo gera estresse nas plantas

| Estado do solo | Canal de estresse da planta |
|---|---|
| Umidade baixa na zona de raiz | `agua_deficit` |
| Umidade saturada por 2 dias ou mais | `agua_excesso` |
| Compactação | `raiz` (limita a profundidade) e déficit hídrico mais cedo |
| Crosta | Falha de emergência (estande irregular) |
| Acidez | `raiz` + `P` |
| Fertilidade | `N`, `P`, `K`, `Mg`, `S`, `Zn`, `FeMn` |
| Temperatura alta | Dano no colo das plântulas; soma com `calor` |
| Salinidade | `agua_deficit` (efeito osmótico) + queima de margem |

---

## 8. Cálculo diário

Safra inteira roda uma vez por cenário, guarda retrato por dia. Slider de dias só escolhe qual retrato mostrar.

0. **Solo:** chuva, infiltração (reduzida por crosta e compactação), escoamento para células baixas e rastros, drenagem (impedida pela compactação), lençol na baixada, evaporação e transpiração (Kc), crosta, rachaduras, nitrogênio (lixiviação, desnitrificação, mineralização, cobertura no dia 30).
1. **Fase:** por soma térmica didática; modo por dias disponível para comparação histórica.
2. **Raiz:** frente avança por dia até teto da fase. Taxa = temperatura × pior fator de solo na ponta (umidade; resistência à penetração, que sobe com solo seco; acidez). Encharcamento mata raiz da camada e frente recua; depois volta a crescer devagar. Densidade por camada pesa absorção de água.
3. **Água:** balanço na zona de raiz. Raiz rasa = déficit chega antes.
4. **Estresse agudo** de cada canal = ambiente × sensibilidade da cultura naquela fase.
5. **Crescimento** = potencial × fator de estresse.
6. **Crônico** acumula agudo. Eventos de limiar: calor na floração → aborto; geada → necrose; K + raiz + encharcamento → acamamento.

Sensibilidade por fase é dado da cultura (`sensibilidade` em `crops/*.js`), não código.

---

## 9. Estrutura de código

```
index.html                 ferramenta de decisão (o talhão 2D fica no centro)
src/
  iso/
    camera.js              projeção isométrica, pan, zoom, conversão tela → mundo
    diorama.js             bloco: sombra, faces, topo, ordem de desenho, seleção
  sprites/
    manifest.js            lista de sprites por cultura; carrega PNG ou usa o pintor procedural
    mask.js                codificação da máscara de dados (u, v, órgão, idade)
    symptoms.js            operadores de sintoma por pixel + cache quantizado
    painters/
      graminea_colmo.js    pintor do arquétipo A (milho; sorgo e milheto pelos dados)
      ...                  um pintor por arquétipo (B a E)
  field/
    lavoura.js             posições das plantas, escolha de sprite por planta, transformações
  soil/
    presets.js             classes de solo
    scenarios.js           cenários didáticos (clima + solo inicial)
    surface2d.js           pintura do topo por dia
    profile2d.js           pintura das faces por dia
    roots.js               atlas de raízes por parede
    maps.js                camadas do modo mapa
  simulation/season.js            simulação diária (sem DOM)
  domain/channels.js       canais e layout do registro diário da planta
  crops/                   dados das culturas
  core/                    matemática, ruído, rampa de cores
assets/sprites/<cultura>/  arte final por fase (opcional; substitui o procedural)
```

---

## 10. Ordem de execução

| Etapa | Entrega | Resultado visível |
|---|---|---|
| **1** | Vista isométrica + bloco do solo em 2D (topo e faces) | Diorama 2D com horizontes, umidade, crosta, rachaduras, poças, rastros e raízes nas faces |
| **2** | Contrato de sprite + pintor do arquétipo A + milho | Milho por fase com posturas, variantes e espiga cheia / falhada |
| **3** | Sintomas por pixel sobre a máscara + modos realista, exagerado e mapa | Todos os padrões de nutriente, água e temperatura no milho |
| **4** | Arte final do milho (pintura por cima dos sprites procedurais) | Milho no estilo da referência pintada |
| **5** | Sorgo e milheto no arquétipo A | 3 culturas |
| **6** | Arquétipo C: soja e feijão | Trifolioladas, flores, vagens, nódulos. 5 culturas |
| **7** | Arquétipo B: trigo, arroz, braquiárias | Touceiras, panícula pendente, ruziziensis decumbente. Dessecação e palhada. 10 culturas |
| **8** | Arquétipos D e E: crotalárias e algodão | 13 culturas |
| **9** | Multissafra: sucessão e descompactação biológica | Cobertura melhora o solo da safra seguinte |
| **10** | Rotação da vista em 90°, graus-dia, erosão | Polimento |

### Estado da implementação

Feito:

- **Etapa 1:** `src/render/iso/` e `src/render/soil/surface2d.js`, `profile2d.js`, `roots.js`. Topo com canteiros, palhada, crosta, rachaduras, poças, rastros, sal. Faces com horizontes da classe de solo, umidade, camada compactada, gleização, bioporos, raízes da linha de borda.
- **Etapa 2:** contrato de sprite (`src/render/sprites/mask.js`). Pintor procedural do arquétipo A (`src/render/sprites/painters/graminea-colmo.js`): 11 fases do milho, 3 posturas, 3 variantes, espiga cheia / parcial / abortada. Carregador com fallback para PNG em `assets/sprites/`.
- **Etapa 3:** operadores de sintoma por pixel (`src/render/sprites/symptoms.js`) com cache quantizado; modos realista, exagerado, mapa; inspetor por clique em planta, topo ou face.
- Simulação, cenários, classes de solo e dados do milho reaproveitados sem mudança de comportamento.
- **Etapa 5:** sorgo e milheto reutilizam pintor de gramínea de colmo, com panícula compacta e vela próprias.
- **Etapa 6:** soja usa pintor dedicado de leguminosa baixa: cotilédones, unifolioladas, trifolioladas, flores axilares, vagens, desfolha. Feijão reutiliza mesmo arquétipo.
- **Etapa 7:** trigo, arroz, brizantha (arquivo com Marandu, Piatã, Paiaguás) e ruziziensis usam pintor de touceira. Dessecação e palhada nos dados das coberturas.
- **Etapa 8:** três crotalárias e algodão usam pintores de leguminosa arbustiva e malvácea, incluindo racemos, vagens, capulhos.
- Seletor de cultura no painel; `?cultura=<id>` abre cultura direto.
- **Arte de Sorgo, Milheto e Algodão:**
  - Pranchas de progressão de 5 fases geradas e salvas em `assets/sprites/<cultura>/`.
  - Recortes transparentes com colos calibrados e máscaras de dados automáticas via `spriteDeImagens` (`mascaraDaCor`).
  - Manifestos cobrindo todas as fases fenológicas da cultura e variantes normais, com adaptação geométrica contínua para estresses hídricos (`enrolada`, `murcha`) e estados reprodutivos (`parcial`, `abortada`).
  - Scripts de preparação e validação em `scripts/preparar-<cultura>.mjs`: verificados carregamento, combinações de postura/espiga/variante, visualização em lavoura 7x7 e resposta a sintomas por pixel.
- **Arte do arroz (parcial):**
  - Prancha de progressão e cinco recortes transparentes (`PL`, `PER`, `EMB`, `FL`, `M`) em `assets/sprites/arroz/`. Máscaras derivadas da própria cor; âncoras e resoluções calibradas por fase.
  - Manifesto cobre três variantes normais das sete fases (21 entradas). EMB reusado para IP, FL para GP. Sorteio de variante não mistura arte e procedural no talhão saudável.
  - Posturas e estados reprodutivos usam adaptações geométricas da própria arte. Cor e máscara alinhadas, âncora fixa. As 117 combinações conservam estilo pintado. Aborto da panícula ainda é aproximação por compressão da região superior.
  - `node scripts/preparar-arroz.mjs` reproduz recortes e verifica: carregamento, as 117 combinações, todas as plantas saudáveis em todas as fases, sintomas de N, S, K e déficit hídrico. Salva galeria e cena em `scratch/arroz/`.
  - Prompts e limites da entrega: `assets/sprites/arroz/GERACAO.md`.

- **Arte das coberturas (etapas 7 e 8, 15/11/2026):** Marandu, Piatã, Paiaguás, ruziziensis e as três crotalárias têm pranchas pintadas, cinco pares de recortes/máscaras por cultura e manifestos para todas as fases. Posturas e estados reprodutivos continuam usando a adaptação da arte existente. Reprodução, especificações dos prompts e limites: [COBERTURAS_GERACAO.md](../assets/sprites/COBERTURAS_GERACAO.md). Preparação e validação: `node simulacao/scripts/preparar-coberturas.mjs` na raiz do repositório.
- **Etapa 9 — motor multissafra existente, validado para as sete coberturas (15/11/2026):** `simulation/rotacao.js` encadeia safras e `simulation/solo/entressafra.js` transfere palhada, N, compactação, matéria orgânica e biologia. `node simulacao/test/sim-coberturas.mjs` verifica resíduos, descompactação restrita às camadas colonizadas, crédito de N das leguminosas, decomposição conforme intervalo/umidade e preservação do estado anterior. Também roda dois ciclos cobertura → soja para cada cobertura, verificando os estados herdados. `node simulacao/test/sim-impacto.mjs` mantém as nove verificações de impacto e comparação pareada. Os coeficientes didáticos existentes foram preservados; não se afirma aumento universal de produtividade.

Pendente:

- **Etapa 10, vista do talhão:** opção de rotação retirada da interface a pedido do usuário, incluindo botões, indicador de ângulo e atalhos. Zoom e deslocamento permanecem disponíveis. O suporte interno do renderizador aos quatro ângulos é preservado; `node simulacao/test/vista-rotacao.mjs` valida projeções/inversas, raízes e cliques. Graus-dia e erosão descritos abaixo permanecem implementados.
- **Etapa 10, graus-dia e erosão (15/11/2026):** a safra calcula soma térmica desde o plantio, com base por cultura (`termica.baseC`, fallback `limites.tFrio`), teto de temperatura média e alvo térmico. `termica.grausDiaCiclo` permite alvo específico; sem calibração, usa `(24,5 − base) × cicloDias`, explicitamente didático. Crescimento, demanda, sensibilidade, sprites e raízes usam o mesmo progresso. O horizonte de simulação e as datas de plantio continuam definidos por `cicloDias`; frio pode terminar esse intervalo sem maturidade térmica. Não se recalcula o calendário regional da API com esses coeficientes.
- **Erosão e transporte didáticos:** a enxurrada desprende horizonte A desprotegido e carrega uma fração dos sete índices de nutrientes. O material deposita parcialmente e segue para a célula vizinha mais baixa (`relevo` maior nesta malha); depressões retêm e bordas exportam. Cada dia move uma etapa, com entradas simultâneas. Nutrientes depositados voltam ao estoque disponível até sua capacidade; o excedente permanece em reserva. Espessura, sedimento móvel, reservas e exportações acumuladas são herdados pela safra seguinte. Série diária expõe erosão, deposição, sedimento móvel/exportado e nutrientes exportados. São unidades do diorama/índices de fertilidade, não toneladas ou kg/ha. Não há rede hidrodinâmica nem reordenação das camadas. `node simulacao/test/erosao-transporte.mjs` verifica conservação de sedimentos e sete nutrientes ao longo de 60 dias, deposição, exportação e proteção.
- **Pinturas de danos:** atlas de seis tecidos pintados, aplicado às folhas das 15 culturas conforme água, N, K, calor e perdas por percevejo/nematoide já calculadas. Sem penalidade duplicada de produtividade; posturas geométricas continuam existentes. Prompt, origem e limites em [danos/GERACAO.md](../assets/sprites/danos/GERACAO.md). `node simulacao/test/danos-pintados.mjs` valida 105 combinações e gera galeria.
- Validação da etapa 10: `node simulacao/test/sim-etapa10.mjs`. Os hashes históricos permanecem preservados em `sim-referencia.json`; `sim-referencia.mjs` roda explicitamente com modo por dias e erosão desligada para verificar compatibilidade. O padrão novo usa graus-dia e erosão ativa, testados separadamente.
- Salinidade existe no estado, mas nenhum cenário usa.
- Valores calibrados para visualização, não para previsão agronômica.
- Clima e solo ainda sintéticos. Troca por dados reais (NASA POWER, Open-Meteo, SoilGrids, laudo) em [INTEGRACAO_DADOS_EXTERNOS.md](INTEGRACAO_DADOS_EXTERNOS.md).
- Refinar máscaras anatômicas e substituir adaptações geométricas por pinturas específicas quando necessário; a arte por manifesto já cobre também as braquiárias e crotalárias. As limitações do arroz estão descritas em `assets/sprites/arroz/GERACAO.md`.
- Exportador procedural disponível em `scripts/exportar-base-sprites.mjs`; recortes pintados das coberturas são preparados separadamente por `scripts/preparar-coberturas.mjs`.
- Troca de dia leva ~150 ms no Edge headless sem GPU (pintura do topo e das faces). Imagens com sintomas e sprites novos calculados aos poucos, a cada quadro.
