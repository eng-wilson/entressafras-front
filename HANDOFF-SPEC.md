# Handoff Spec: Clima do mês · talhão centralizado

> Fonte da verdade: canva "Clima do mês · talhão centralizado" (Field Shift Simulador, versão publicada em 13/11/2026).
> Referência executável: `public/reference/ClimaMes2.dc.html`. Com `pnpm dev` rodando, abra `http://localhost:5173/reference/ClimaMes2.dc.html`: é o canva "em play", com todos os comportamentos.
> Estilo: `src/canvas/canvas.css` (CSS do canva, sem alterações). Ícones: `public/canvas-icons.svg` (35 símbolos).
> Itens marcados **[proposta]** não existem no canva: são decisões recomendadas para lacunas. Todo o resto descreve o canva como ele é.

---

## 1. Overview

**O que é:** tela principal do Field Shift (NASA Space Apps 2026, desafio "Field Shift: Adapting Farms with NASA Data"). Para um talhão (T-07, Sorriso/MT), o agricultor:

1. arrasta uma linha do tempo de 36 decêndios (set → ago) e vê o talhão "crescer" com a rotação selecionada, junto com a chuva do mês, a umidade do solo e a faixa de temperatura daquele período;
2. compara 4 rotações (incluindo a atual), ordenadas pelas prioridades que ele marca;
3. vê, na lateral direita, as datas e os motivos da posição da rotação selecionada.

**Usuário:** produtor rural com pouca experiência técnica. Por isso: linguagem simples, status sempre com ícone e texto, números arredondados, nenhum jargão sem explicação.

**Dados:** todos ilustrativos (mock), em `renderVals()` do arquivo de referência. Na versão real virão de ZARC/MAPA, NASA POWER, GPM, SMAP etc. A UI precisa mostrar "Sem dado" ou "-" quando faltar dado (padrão já usado na tabela).

---

## 2. Layout

Viewport de referência: **1440 × 1120**. Layout de aplicativo desktop, sem scroll da página (cada coluna rola por conta própria).

```
┌──────────────────────────── .bar 52px ─────────────────────────────┐
├─ .side 248px ─┬────────── .main 1fr (872px @1440) ──┬─ .insp 320px ─┤
│ Talhão        │ Simulando {período}                 │ Selecionada   │
│ O que importa │ [chuva] [talhão iso] (132|1fr|132)  │ Datas         │
│ (4 switches)  │ [Umidade do solo] [Temperatura]     │ Por que Nº    │
│               │ ┌ .board ───────────────────────┐   │ Ver dados     │
│               │ │ Rotações  [+] [Cal|Comp]      │   │ disclaimer    │
│               │ │ meses · decêndios · slider    │   │               │
│               │ │ 4 linhas OU tabela            │   │               │
│               │ └───────────────────────────────┘   │               │
└───────────────┴─────────────────────────────────────┴───────────────┘
```

| Região | Classe | Medidas (renderizado @1440) |
|---|---|---|
| App | `.app` | grid `248px minmax(0,1fr) 320px` / `52px 1fr`; `height:100vh`; `min-width:1024px`; `min-height:640px`; `overflow:hidden` |
| Header | `.bar` | 1440×52; padding `0 20px`; gap 16; borda inferior `--sep` |
| Sidebar esq. | `.side` | 248 de largura; padding `20px 14px`; fundo `--side`; borda direita `--sep`; `overflow:auto` |
| Main | `.main` | padding `28px 32px`; `overflow:auto`; conteúdo útil 808 |
| Inspector | `.insp` | 320 de largura; padding `28px 22px`; flex coluna; borda esquerda `--sep`; `overflow:auto`; o `.foot` vai para o fim (`margin-top:auto`) |
| Simulação | `.trio` | 808×433 (y=80); `margin-bottom:16px` |
| Grade do talhão | `.fgrid` | `132px minmax(0,1fr) 132px`, gap 8; talhão `.isow` limitado a 420px, centralizado |
| Pílulas | `.pills` | flex centralizado, gap 24, padding `28px 0 4px`; cada `.pl` 336×90 |
| Board | `.board` | 808×526 (y=529); radius 12; contorno `0 0 0 1px --sep`; padding `0 16px` |
| Faixa de título | `.mstrip` | 776×58; padding `16px 0 4px`; gap 12 |
| Calendário | `.cal` | 776×137; padding `16px 0 46px` (os 46px abrigam o slider absoluto) |
| Linhas | `.row` | 776×80; padding `12px 0 14px`; barra `.tl` com 24 de altura |

**Responsividade:** o canva só desenha desktop. Abaixo de 1280px o layout quebra: ver seção 8.

---

## 3. Design Tokens

### 3.1 Tokens que já existem (`:root` em `canvas.css`)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FFFFFF` | fundo do app, main, inspector |
| `--side` | `#F5F5F7` | sidebar; fundo dos grupos do inspector (`.why .list`) |
| `--group` | `#FFFFFF` | listas agrupadas da sidebar (`.list`) |
| `--sep` | `rgba(60,60,67,.14)` | divisórias, bordas, contorno do board |
| `--label` | `#1D1D1F` | texto principal |
| `--label2` / `--label3` | `#6E6E73` | texto secundário, eyebrows, títulos de seção |
| `--fill` | `#E9E9EE` | fundo de tag "Atual" |
| `--track` | `#F2F2F5` | fundo do botão `+` |
| `--tint` | `#1E7A3C` | ações de texto ("Como funciona", "Ver todos os dados", `+`) |
| `--blue` | `#0A84FF` | (legado) |
| `--good` | `#34C759` | barra de cultura favorável; switch ligado |
| `--warn` | `#FF9F0A` | barra de cultura arriscada |
| `--risk` | `#D70015` | barra de cultura desfavorável; ponto do veredito |
| `--none` | `#C7C7CC` | contorno de barra sem status |

### 3.2 Valores fixos no CSS que devem virar token **[proposta]**

O canva repete estes valores em várias classes. No React, crie os tokens e troque os literais (o visual não muda):

| Token proposto | Valor | Onde aparece |
|---|---|---|
| `--status-good-text` | `#1B7F3A` | `.stw.good`, `.gs.good`, `.pl-s.good`, `.ct-pst.ct-lo` |
| `--status-warn-text` | `#A35200` | `.stw.warn`, `.gs.warn`, `.pl-s.warn`, `.ct-pst.ct-hi` |
| `--status-risk-text` | `#C4000F` | `.stw.risk`, `.gs.risk`, `.pl-s.risk` |
| `--status-good-icon` | `#1B9E3E` | `.ct-wi.good` |
| `--status-warn-icon` | `#E07A00` | `.ct-wi.warn` |
| `--accent` | `#007AFF` | slider (fill, número do decêndio, foco) |
| `--accent-strong` | `#0A64D6` | ícone da chuva, gradiente da chuva, chip "Muita chuva" |
| `--focus-ring` | `rgba(0,122,255,.5)` (3px) / `.4` em ícones | `:focus-visible` |
| `--text-tertiary` | `#8E8E93` | rótulos pequenos (`.dt-k`, `.ct-dep`, `.cfoot`, `.vtag small`, `.prh`). **Reprova contraste: ver seção 7** |
| `--bg-grouped` | `#F2F2F7` | cartões cinza (`.gb`, `.period`, `.stg-l`) |
| `--segment-bg` | `#E9E9EE` | fundo do controle segmentado |

### 3.3 Tipografia

| Token proposto | Valor | Uso |
|---|---|---|
| `--font-ui` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif` | todo o texto |
| `--font-num` | `ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif` | números de destaque (`.vg-v`, `.pl-v`, `.vtag`, `.gv`) |
| base | 13px / line-height 1.38 / `-webkit-font-smoothing: antialiased` | `body` |
| `font-title-section` | 17px / 700 / lh 1.2 | "Rotações" (`.ms-title .h2r`) |
| `font-title-insp` | 18px / 700 / ls -.01em / lh 1.25 | nome da rotação selecionada |
| `font-period` | 15px / 700 | "11 a 20 de dezembro" (`.trio-t`) |
| `font-row-name` | 14px / 600 | nome da rotação (`.nm`); "depois" em 400 + `--label2` |
| `font-value-lg` | 20px / 700 / `--font-num` / tabular | "230 mm" (`.vg-v`) |
| `font-eyebrow` | 12px / 600 / uppercase / ls .04em / `--label3` | "SIMULANDO", "TALHÃO", "DATAS DA ROTAÇÃO" |
| `font-caption` | 12px / 400–500 | legendas, unidades |
| `font-micro` | 11px | dígitos dos decêndios (`.dec`); único texto abaixo de 12px **(viola a regra ≥12px: ver seção 7)** |

Todo número usa `font-variant-numeric: tabular-nums`.

### 3.4 Espaçamento e raios

| Token proposto | Valor | Uso |
|---|---|---|
| `space-1` | 4px | gap ícone↔texto do status |
| `space-2` | 6px | gap dos chips |
| `space-3` | 8px | gap padrão |
| `space-4` | 12px | padding de linha da lista, gap da `.mstrip` |
| `space-5` | 16px | padding do board, entre seções |
| `space-6` | 24px | gap das pílulas e das colunas da tabela |
| `space-7` | 28px | padding vertical do main |
| `space-8` | 32px | padding horizontal do main |
| `radius-sm` | 6px | tags, barras do calendário, status com foco |
| `radius-md` | 9–10px | segmentado (9 externo / 7 interno), listas, tooltip |
| `radius-lg` | 12px | board, cartões do inspector |
| `radius-xl` | 14px | pílulas |
| `radius-full` | 50% | switch, `+`, knob |

Sombras: tooltip `0 0 0 .5px rgba(0,0,0,.10), 0 4px 14px rgba(0,0,0,.14)`; callout `.vtag` `0 0 0 .5px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.12)`; knob `0 .5px 3px rgba(0,0,0,.16), 0 3px 8px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.06)`.

---

## 4. Components

Cada componente reaproveita as classes de `canvas.css`. Não renomeie as classes: a referência e os testes usam os mesmos seletores.

| Componente | Classe(s) | Props | Notas |
|---|---|---|---|
| `AppShell` | `.app .bar .side .main .insp` | `children` | "Como funciona" (`.tbtn`) **sem ação no canva** |
| `FieldInfoList` | `.sec .list .item` | `items: {label, value}[]` | T-07 42 ha · Solo Argiloso · Safra anterior Soja, milho · Umidade hoje Úmido · Local Sorriso, MT |
| `PriorityToggles` | `.prh .pil .sw` | `value: {risco,agua,solo,prod}`, `onChange` | 4 `role="switch"`; default `{risco:true, agua:false, solo:true, prod:false}`; ícones `i-shield`, `i-drop`, `i-leaf`, `n-seed` |
| `PeriodHeader` | `.trio-h .trio-k .trio-t` | `idx` | "SIMULANDO" + `periodLabel` (ex.: "11 a 20 de dezembro") |
| `RainGauge` | `.vg .vg-l .vg-v .ms-h .vg-w .vg-tr .vg-sc` | `mm`, `class` | Trilho vertical 8×150; preenchimento `height = min(mm,400)/400`; marcas fixas em 60/150/300 (15%, 37.5%, 75%); badge pela classe (tabela 5.4) |
| `IsoField` | `.isow .iso .fpill .fsw` | `stage` | SVG `viewBox 0 0 360 200`; losango + 2 faces laterais; 11 linhas de plantio; 63 plantas (grade 7×9) por estágio; pílula flutuante "Soja · floração". **Memorize o SVG por `crop:stage`** (o protótipo faz cache em `this._pc`) |
| `SoilMoistureBar` | `.pl .pl-r .pl-s .pl-b .mk .vtag` | `value 0–1`, `hasCrop` | Barra `viewBox -8 0 284 16`, trilho 268×6; marcador circular r=5.5 com contorno branco 2px; callout `.vtag` com o valor ("0,48"); marcas em 0,45 e 0,55 só com cultura |
| `TempRangeBar` | `.pl … .vtag` | `tmin`, `tmax`, `crop`, `stage` | Trilho de 0–45 °C (opacidade .4) + cápsula mín–máx (altura 11, contorno branco); marcas fixas em 2°, 10°, 30°, 40°; 2 callouts "mín 21°"/"máx 29°", que viram 1 callout quando a distância entre eles é < 19% |
| `RotationsHeader` | `.mstrip .ms-title .add .segc` | `mode`, `onModeChange` | Título "Rotações" + "Safra 2026/27 · ordenadas para o clima previsto"; `+` (32×32, **sem ação**); segmentado 208×34 |
| `MonthStrip` | `.months .mo .wx-wrap .wx .dec` | `idx`, `onPickMonth` | 12 botões (Set…Ago); ícone de clima pela chuva do mês; Set e Out com `.past` (opacidade reduzida); mês ativo `.hi` (anel azul + texto 700) |
| `DecadeSlider` | `.selnum .scrub .track .fill .knob input[type=range]` | `idx 0–35`, `onChange`, `valueText` | `<input type=range>` nativo invisível sobre trilho/knob desenhados. Ver 5.1 |
| `RotationRow` | `.row .rh .rk .nm .then .tag .pest .st.stw .tl .b` | `rotation`, `rank`, `status`, `isCurrent`, `isLast` | Linha atual tem `.sel` (fundo verde 10%), tag "Atual" e chip "Mais pragas" |
| `StatusBadge` | `.st.stw.{good|warn|risk}` + `.ct-tip.ct-tip2.tip-r` | `level`, `n`, `crop` | Ícone + "Clima favorável/arriscado/desfavorável"; tooltip "Histórico {nível}" / "Água suficiente em N de 10 anos (cultura)" |
| `CompareTable` | `.ctab .ct-h .ct-c .ct-rot .ct-wv .ct-wi .ct-pst .ct-tip` | `rows`, `order` | `role="table"`; grid `minmax(0,1.5fr) repeat(3,minmax(0,1fr))`, gap 24; 2 sublinhas por rotação (cultura 1 / "depois" cultura 2) |
| `Inspector` | `.eyebrow h2 .verdict .why.dt .dt-i .why .wi .link .foot` | `rotation`, `rank` | Conteúdo fixo da rotação "Soja depois milho safrinha"; só o "Nº" muda com o ranking. "Ver todos os dados" **sem ação** |
| `Icon` | `.ic` + `<use href="/canvas-icons.svg#id">` | `id`, `className` | Traço 2px, `currentColor`, 16×16 padrão |

---

## 5. States and Interactions

### 5.1 Slider de decêndios (o comportamento mais importante)

| Item | Especificação |
|---|---|
| Domínio | `idx` inteiro 0–35 (0 = 1–10 set … 35 = 21–31 ago); default **10** (11–20 dez) |
| Geometria | Trilho de 4px de altura, de `left: 100%/72` a `right: 100%/72` (meia coluna de decêndio em cada ponta); `.fill` = `idx/35` do trilho; knob 18×18 em `left = (idx+0.5)/36` |
| Número | `.selnum` mostra o decêndio (1/2/3) em azul sobre a linha de dígitos, na posição do knob |
| Arrastar | `pointerdown` → foco + `setPointerCapture` → `idx = round((x − left − 14) / (width − 28) × 35)`, limitado a 0–35. Atualiza a cada `pointermove` enquanto pressionado; solta em `pointerup`/`pointercancel`. Arrasto fora do trilho continua funcionando (captura) |
| Clicar | clicar em qualquer ponto pula para o decêndio mais próximo |
| Teclado | setas ←/→ e ↓/↑ ±1; Home/End = 0/35; PageUp/PageDown = passo nativo do navegador |
| Clicar no mês | vai para o mesmo decêndio dentro do mês clicado: `idx = mês×3 + (idx % 3)` |
| Foco | `.scrub:focus-within .knob` → anel `0 0 0 3px rgba(0,122,255,.5)` |
| Desempenho | arrasto a 60 fps: nada de recriar as 63 plantas a cada passo (cache por estágio, ver `IsoField`) |
| A11y | `aria-label="Arraste para simular um período"`; `aria-valuetext="{período}, {classe da chuva}, {mm} milímetros no mês, de {tmin} a {tmax} graus"` |

### 5.2 O que muda com `idx`

| Elemento | Regra |
|---|---|
| Período | `{1 a 10 | 11 a 20 | 21 a <último dia>} de {mês}`; fevereiro = 28 |
| Mês ativo | `m = floor(idx/3)`: anel no ícone, texto em 700 |
| Estágio (rotação "Soja → milho safrinha") | Tabela `STAGES`: Pousio 0–3 · Solo pronto 4 · Soja: semeadura 5, emergência 6, crescimento 7–8, floração 9–10, enchimento 11–12, pronta 13–14, colheita 15 · Milho: semeadura 16, emergência 17, crescimento 18–20, floração 21–22, enchimento 23–25, pronto 26–27, colheita 28 · Palhada 29–31 · Pousio 32–35 |
| Talhão iso | Cor do solo e linhas por estágio (`FILL`); plantas desenhadas só em semeadura → pronta |
| Pílula do talhão | "Soja · floração", "Milho · crescimento", "Pronto para o plantio", "Palhada", "Pousio" |
| Chuva do mês | `THIS[m]` mm (set 45, out 150, nov 180, dez 230, jan 200, fev 280, mar 250, abr 120, mai 40, jun 10, jul 5, ago 15) |
| Umidade do solo | Com cultura: `WAT2[idx]` (padrão 0,5); < 0,45 Crítico · < 0,55 Atenção · senão Bom; gradiente vermelho→laranja→verde. Sem cultura: tabela `SOIL`; status Protegido (palhada) / Secando (< 0,45) / Sem cultura; gradiente azul; sem marcas |
| Temperatura | `TMIN[idx]`, `TMAX[idx]`. Soja: calor Atenção > 30, Risco > 40; frio Atenção < 10 (< 13 na floração); Geada ≤ 2. Milho: sem limite de calor. Prevalece o lado pior. Rótulos: Bom · Frio · Atenção · Geada · Risco · Calor · Atenção · Calor · Risco. Sem cultura: Protegido / Exposto (máx ≥ 32) / Sem cultura |

### 5.3 Demais elementos

| Elemento | Estado | Comportamento |
|---|---|---|
| Switch (`.sw`) | off / on | `#E1E1E6` / `--good`; bolinha 18px em `left` 2px → 16px. **Troca instantânea** (sem transição no canva) |
| Switch | clique | inverte a prioridade, destaca o quadrante no mapa e **pede a nova ordem à API** (`priorities`); a lista anterior fica na tela até a resposta. Economia de água não existe na API e não reordena |
| Ordenação | regra | A ordem é o `rank` de `POST /api/rotations/recommendations`, calculado pelas prioridades enviadas; o front não reordena (regra: o que a API resolve não é calculado no front). Detalhes em `docs/INDICADORES.md`. Linha `.rlast` perde a borda inferior |
| Ranking | números | `.rk` mostra a posição (1–4); inspector mostra "Por que ficou em {posição da rotação atual}º" |
| Segmentado | Calendário / Comparação | ativo: fundo branco + sombra + 600; `aria-pressed`; troca o conteúdo abaixo do slider (calendário e slider sempre visíveis) |
| Mês (`button.mo`) | hover | fundo `rgba(0,0,0,.04)` no círculo do ícone |
| Mês | ativo | `.hi`: fundo `rgba(10,132,255,.12)` + anel 1.5px `rgba(10,132,255,.5)` |
| Mês | foco | contorno 3px `rgba(0,122,255,.5)`, offset 2 |
| Mês | tooltip nativo | `title="Dezembro: chuva boa · 230 mm"` |
| Status (`.stw`) | hover / foco de teclado | tooltip **sem atraso** (CSS `display:flex`), alinhado à direita (`.tip-r`), seta 10px girada 45°; largura máx. do texto 240px |
| Ícones da tabela (`.ct-wi`) | hover / foco | mesmo tooltip, centralizado |
| Barras do calendário (`.b`) | — | `left = s/12`, `width = (e−s)/12 − 2px`; texto 12/600 cortado com `overflow:hidden` |
| Pílulas (`.pl`) | — | São `<button>` no canva, mas **não fazem nada** (`cursor:default`). **[proposta]** usar `<div role="img">` com o mesmo `aria-label` |
| `+`, "Como funciona", "Ver todos os dados" | — | **Sem ação no canva.** **[proposta]** ver seção 8 |

### 5.4 Classes e textos de dados

| Regra | Valores |
|---|---|
| Chuva do mês | < 60 mm **Seco** (`dry`) · 60–149 **Pouca chuva** (`low`) · 150–300 **Chuva boa** (`good`) · > 300 **Muita chuva** (`wet`) |
| Ícone do mês | seco → `w-sun`; pouca → `w-drizzle`; boa/muita → `w-mixed` (nov–jan) ou `w-rain` |
| Status da rotação | `n` = pior cultura em `FREQ` (anos com água suficiente em 10): ≥ 7 favorável (`i-okc`), 4–6 arriscado (`i-alert`), ≤ 3 desfavorável (`i-xc`) |
| FREQ (mock) | r1 soja 8 · r2 soja 7, sorgo 7 · r3 soja precoce 8, milho 5 · r4 soja 3, milho safrinha 5 |
| Tabela (mock) | ver `CT` na referência: umidade necessária, histórico por cultura, pragas (Menor/Maior risco + motivo), produção sc/ha (`-` quando não se colhe) |

---

## 6. Edge Cases

| Caso | Comportamento |
|---|---|
| Dado ausente (texto) | "Sem dado" em `--text-tertiary`, peso 500 (`.ct-nd`). Ex.: umidade necessária de crotalária + milheto |
| Valor que não existe | "-" (ex.: produção da crotalária, que não se colhe). Não usar "0" |
| Histórico ausente | o ícone de status some (`mk-off`); nunca mostrar ícone sem dado |
| Callouts de temperatura muito próximos | distância < 19% da barra → um callout só: "mín 21° máx 29°" |
| Chuva > 400 mm | o trilho satura em 100% e o número mostra o valor real |
| Nome longo de rotação | `.rh` é `white-space:nowrap`. **[proposta]** `text-overflow:ellipsis` no `.nm` + `title` com o nome completo; o status nunca encolhe |
| Texto longo em barra | cortado pela barra (`overflow:hidden`); o nome completo está no título da linha |
| Tooltip na borda direita | `.tip-r` ancora à direita para não sair da tela |
| Loading **[proposta]** | quando os dados forem reais: skeleton nas pílulas e nas linhas, com a mesma altura (90 e 80px) para não pular layout; slider desabilitado até carregar |
| Erro **[proposta]** | falha de uma fonte (ex.: NASA POWER) → "Sem dado" no campo afetado + aviso discreto no topo do main ("Alguns dados não carregaram. Tentar de novo"). Nunca esconder a tela |
| Conexão lenta **[proposta]** | cachear por talhão e safra (TanStack Query); mostrar o último dado com "Atualizado em…" |
| Internacionalização | a UI é pt-BR (vírgula decimal "0,48", "°", datas "11 a 20 de dezembro"). Use `Intl.NumberFormat('pt-BR')`. Nada de strings concatenadas em inglês |

---

## 7. Accessibility Notes

**Ordem de foco (Tab):** Como funciona → 4 switches → 12 meses → slider → `+` → Calendário → Comparação → status das 4 linhas (na ordem visual) **ou** ícones da tabela → Ver todos os dados.

> A ordem visual das linhas usa CSS `order`, mas a ordem de Tab segue o DOM. **No React, renderize as linhas já ordenadas** (não use `order`) para que foco e leitor de tela sigam o ranking.

| Elemento | Papel / ARIA |
|---|---|
| Sidebar | `<aside aria-label="Ajustes">` |
| Switches | `<button role="switch" aria-checked aria-label="Menor risco">` |
| Simulação | `<section aria-label="Resumo do período simulado">` |
| Chuva | `role="img" aria-label="Chuva do mês: 230 milímetros, Chuva boa"` |
| Talhão iso | `role="img" aria-label="Talhão em 11 a 20 de dezembro: Soja · floração"` |
| Segmentado | `role="group" aria-label="Modo de visualização"` + `aria-pressed` |
| Slider | `aria-label` + `aria-valuetext` (5.1) |
| Status | `tabindex="0"` + `aria-label="Clima arriscado. Água suficiente em 5 de 10 anos (milho), para estas culturas e datas."`; tooltip `role="tooltip"` |
| Tabela | `role="table" aria-label="Comparação das rotações"`. **[proposta]** usar `<table>` semântica ou `role="row"/"cell"` (hoje só há `role="table"` em uma grid de divs) |
| Inspector | `<aside aria-label="Detalhe da rotação selecionada">` |

**Anúncios [proposta]:** região `aria-live="polite"` invisível que anuncia "Rotações reordenadas: 1º Soja depois sorgo…" ao mudar uma prioridade. O slider já anuncia pelo `aria-valuetext`.

**Pendências de acessibilidade encontradas no canva** (corrigir na implementação sem mudar o visual):

| Problema | Onde | Correção |
|---|---|---|
| Alvo de toque < 44px | switch 36×22, `+` 32×32, segmentado 30 de altura, status 18 de altura, ícones da tabela 22×22 | aumentar a área clicável com padding ou pseudo-elemento transparente até 44×44, mantendo o tamanho visual |
| Contraste < 4.5:1 em texto pequeno | `#8E8E93` em branco = 3.26:1; no `--side` = 2.99:1 (`.prh`, `.dt-k`, `.ct-dep`, `.cfoot`, "Sem dado") | escurecer `--text-tertiary` para `#6E6E73` (5.07:1) |
| Contraste do número do decêndio | `#007AFF` 12px = 4.02:1 | usar `#0A64D6` |
| Texto < 12px | dígitos dos decêndios 11px | subir para 12px (cabe: 3 dígitos por 64px de coluna) |
| Status só por cor | nenhum caso: todos têm ícone e texto | manter |

---

## 8. Responsive Behavior

Comportamento medido na referência (as larguras se referem à viewport):

| Breakpoint | O que acontece hoje | Spec |
|---|---|---|
| ≥ 1330px | layout do canva; as duas pílulas lado a lado | implementar igual |
| 1280–1329px | 3 colunas ok; as pílulas quebram em 2 linhas (main útil 648 < 696) e o talhão fica com 368px | aceitar |
| 1024–1279px | **quebra:** main útil cai para 392px, o segmentado Calendário/Comparação é cortado (`.mstrip{overflow:hidden}`) e o talhão encolhe para 112px | **[proposta]** abaixo de 1280, o inspector vira painel recolhível (botão no header) e o main ganha os 320px |
| < 1024px | não desenhado; rolagem horizontal (`min-width:1024px`) | fora do escopo do MVP |

---

## 9. Animation / Motion

O canva quase não tem animação. Para paridade, as trocas são instantâneas. As melhorias opcionais estão marcadas.

| Elemento | Gatilho | Animação | Duração | Easing |
|---|---|---|---|---|
| Tooltip | hover/foco | aparece sem atraso | 0 | — |
| Switch | clique | troca instantânea · **[proposta]** deslizar a bolinha | 0 · 200ms | `cubic-bezier(.3,.7,.4,1)` |
| Reordenar rotações | switch | troca instantânea · **[proposta]** FLIP das linhas | 0 · 250ms | spring (ex.: `cubic-bezier(.2,.8,.2,1)`) |
| Slider/knob | arrasto | segue o ponteiro, sem easing | 0 | — |
| Talhão iso | mudança de estágio | troca instantânea do desenho | 0 | — |
| Segmentado | clique | troca instantânea | 0 | — |

Com `prefers-reduced-motion: reduce`, desligar todas as animações propostas.

---

## 10. Questões abertas (decidir antes ou durante a implementação)

1. **Cor das barras × status:** na linha atual, a barra do milho safrinha é verde, mas o status do milho é 5/10 (arriscado). O status da linha usa a pior cultura; as barras não seguem a mesma regra. Definir uma regra única.
2. **Chip "Mais pragas"** só aparece na linha atual. Na tabela, pragas já têm coluna própria. Manter ou remover?
3. **Inspector fixo:** sempre mostra "Soja depois milho safrinha". Clicar numa linha deveria selecioná-la?
4. **Ações vazias:** `+` (criar rotação), "Como funciona", "Ver todos os dados" — definir destino ou esconder no MVP.
5. **CSS legado:** `canvas.css` traz classes de versões anteriores do canva sem uso nesta tela (`.gb`, `.mcard`, `.now`, `.hero`, `.stg*`, `.mall`, `.ms-*` exceto `.ms-h`). Pode limpar depois de a paridade visual passar.

---

## 11. Critério de pronto

- Em 1440×1120, `/` fica visualmente igual a `/reference/ClimaMes2.dc.html` nos modos Calendário e Comparação (diferença de pixels < 1%).
- Mesmas ações nos dois lados → mesmo período, mesma ordem de rotações, mesmos status e mesmos textos de tooltip:
  - arrastar o slider; teclado (setas, Home, End); clicar em 3 meses diferentes;
  - ligar e desligar cada switch (16 combinações → ordem idêntica);
  - Calendário ↔ Comparação.
- Pendências de acessibilidade da seção 7 corrigidas; nenhum erro no console.
