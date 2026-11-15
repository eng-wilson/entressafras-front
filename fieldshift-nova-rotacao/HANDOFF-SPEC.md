# Handoff Spec: Adicionar rotação (editor de rotação)

> **Fonte da verdade:** canva "Nova rotação" (Field Shift Simulador, versão publicada em 15/11/2026).
> **Referência executável:** `public/reference/NovaRotacao.dc.html`. Com `pnpm dev` rodando, abra `http://localhost:5173/reference/NovaRotacao.dc.html`. Usa o mesmo `support.js` da tela principal.
> **Telas de referência:** `screenshots/01…08` nesta pasta (1440×900 @2x).
> **Escopo:** só o fluxo de criar e editar uma rotação: botão `+`, linha de rascunho, barras arrastáveis, menu de culturas, menu Trocar/Remover, painel direito do rascunho e o estado salvo. A barra lateral esquerda desse canva é de uma versão antiga ("Maior lucro", "Limitações"). **Não implemente essa barra:** use a da tela principal (`fieldshift-clima-do-mes/HANDOFF-SPEC.md`).
> Itens marcados **[proposta]** não estão no canva: são decisões recomendadas para lacunas encontradas ao testar a referência.

---

## 1. Overview

**O que faz:** o agricultor monta a própria rotação para a safra 2026/27 e vê, enquanto edita, como ela se compara às 4 rotações sugeridas. Ele:

1. clica em `+` ("Criar minha rotação");
2. adiciona culturas em sequência (cada uma entra logo depois da anterior);
3. arrasta as barras no calendário: as pontas mudam plantio e colheita, o meio move a cultura inteira;
4. vê na hora o status de cada cultura (dentro ou fora da janela de plantio do ZARC), os dias de solo descoberto, o alerta de pragas e a posição que a rotação ficaria no ranking;
5. salva ou cancela.

**Por que importa para o desafio:** atende a "comparar pelo menos três estratégias, incluindo a atual" e "permitir que o agricultor informe prioridades e restrições". O agricultor não fica limitado às sugestões: ele testa a ideia dele contra os mesmos critérios.

**Onde fica:** dentro do card "Rotações" da tela principal. O `+` já existe na `.mstrip` da tela "Clima do mês" (`aria-label="Criar minha rotação"`), hoje sem ação. Este componente é a ação dele.

---

## 2. Layout

Quando o rascunho está aberto, ele entra como **primeira linha do board**, logo abaixo do calendário e acima das rotações sugeridas. O painel direito troca para o painel do rascunho.

```
┌ .board ─────────────────────────────────────────────────────────────┐
│ meses · decêndios (janela boa da cultura selecionada em verde)       │
├ .row.draft (fundo azul 6%, ocupa a largura toda do board) ───────────┤
│ +  Soja depois sorgo  [Ficaria em 3º]   ● Bom  [+ Cultura][Cancelar][Salvar] │
│    [====== Soja ======][▌===== Sorgo =====▐]                         │
│                        ┌ Trocar │ Remover ┐  ← menu sob a cultura selecionada │
├──────────────────────────────────────────────────────────────────────┤
│ 1 Soja depois crotalária + milheto …   (rotações sugeridas)          │
└──────────────────────────────────────────────────────────────────────┘
```

| Elemento | Classe | Medidas (renderizado @1440×900) |
|---|---|---|
| Linha de rascunho | `.row.draft` | 808×131; `margin: 0 -16px` + `padding: 12px 16px 14px` (sangra até as bordas do board); `z-index:50`; com cultura selecionada ganha `.withmenu` (`padding-bottom:58px`) para abrigar o menu |
| Cabeçalho da linha | `.rh` | altura 28; flex, gap 8, `white-space:nowrap` |
| Selo de ranking | `.rankb` | 90×19; padding `1px 7px`; radius 6 |
| Ações | `.acts` | 231×28; gap 6; `margin-left:12px`; ficam à direita do status |
| Botão da barra | `.tb` | altura 28; padding `0 10px`; radius 7; "Salvar" 60×28 |
| Trilho de edição | `.tl.dtl` | 776×24; 36 colunas (decêndios), largura de cada uma = 100%/36 |
| Bloco de cultura | `.cb` | `position:absolute`; `left = s/36`; `width = (e−s)/36`; a barra interna (`.b`) tem `width: calc(100% − 2px)` |
| Alças | `.hd.l` / `.hd.r` | 12×30 visual (`top/bottom:-3px`); área de toque 36×46 via `::before` (−8 vertical, −12 horizontal); esquerda `left:-6px`, direita `right:-4px` |
| Lacuna | `.gap` | `left = e/36`, `width = g/36`; altura 24; radius 6 |
| Dica de arrasto | `.tip` | 32px acima do trilho, centralizada no ponto que está sendo arrastado |
| Menu Trocar/Remover | `.callout` | 184×36; 34px abaixo do topo do trilho, centralizado no meio da cultura selecionada; seta de 6px para cima |
| Menu de culturas | `.picker` | 280 de largura (altura conforme o conteúdo, ~403–420); **adicionar:** `right:16px; top:44px` (abaixo de "+ Cultura"); **trocar:** `top:100px; left = min(s/36, 62%)` (o limite de 62% evita que ele saia pela direita) |
| Painel direito | `.insp` | mesmo container da tela principal (320 de largura, padding `28px 22px`) |

---

## 3. Design Tokens

Usa os tokens de `fieldshift-clima-do-mes/HANDOFF-SPEC.md` §3. Estes são **novos neste componente**:

| Token proposto | Valor | Uso |
|---|---|---|
| `--draft-bg` | `rgba(0,122,255,.06)` | fundo da linha de rascunho |
| `--saved-bg` | `rgba(52,199,89,.08)` | fundo da linha salva |
| `--accent` | `#007AFF` | botão "Salvar" (`.tb.pri`) |
| `--chip-info-bg` / `--chip-info-text` | `#E3EEFD` / `#0A5BC4` | selo "Ficaria em 3º" |
| `--rankcard-text` | `#0A3D80` | cartão "Posição no ranking" (fundo `#E3EEFD`) |
| `--ink` | `#1D1D1F` | contorno da cultura selecionada (2px), alças, dica de arrasto, menu Trocar/Remover |
| `--danger-on-dark` | `#FF6961` | "Remover" no menu escuro |
| `--limit-bg` | `#A35200` | dica de limite ("Limite: colheita de soja") |
| `--gap-stripe` | `repeating-linear-gradient(135deg, rgba(255,149,0,.10) 0 6px, rgba(255,149,0,.18) 6px 12px)` | lacuna sem cobertura; texto `#7A4100` |
| `--zone-bg` / `--zone-text` | `#DDF3E3` / `#14672F` | decêndios da janela boa no calendário (`.dec i.z`, peso 700, radius 4) |
| `--btn-ring` | `0 0 0 1px rgba(60,60,67,.18)` | contorno dos botões secundários `.tb` |
| `--shadow-popover` | `0 10px 30px rgba(0,0,0,.18), 0 0 0 .5px rgba(0,0,0,.08)` | menu de culturas |
| `--shadow-callout` | `0 6px 18px rgba(0,0,0,.22)` | menu Trocar/Remover |
| `--shadow-tip` | `0 4px 12px rgba(0,0,0,.18)` | dica de arrasto |

**Tipografia:** botões 13/500 ("Salvar" 13/600); selo 12/600; dica 12/600; itens do menu 14/400 com nota 12 `--label2`; títulos de grupo do menu 12/600 em caixa alta com ls .04em; título do menu 14/700 com subtítulo 12; cartão de ranking 13 com o valor em 15/700.

---

## 4. Components

| Componente | Classe(s) | Props / estado | Notas |
|---|---|---|---|
| `AddRotationButton` | `.add` | `onClick → openDraft` | Já existe na tela principal. Com o rascunho aberto, foca o rascunho em vez de abrir outro |
| `DraftRow` | `.row.draft` | `crops[]`, `sel`, `pickerOpen`, `pickerMode` | Linha número "+"; título; selo de ranking; chip "Mais pragas" (condicional); status; ações |
| `RotationTitle` | `.nm` + `.then` | `crops[]` | "Soja **depois** sorgo": 1ª cultura com maiúscula, as demais em minúscula, unidas por "depois" (peso 400, `--label2`). Sem culturas: "Nova rotação" |
| `CropTrack` | `.tl.dtl` | `crops[]`, `onChange` | Trilho de 36 decêndios; mede o próprio retângulo no início de cada arrasto |
| `CropBar` | `.cb .b` (+ `.sel`) | `crop`, `status`, `selected` | Cor pelo status (`.b.good/.warn/.risk`; sem dado = `.b.none`, branco com contorno); `cursor:grab`; `touch-action:none`; `user-select:none` |
| `ResizeHandle` | `.hd.l` / `.hd.r` | `side` | Só aparece na cultura selecionada. Grip branco 2×10 |
| `CoverageGap` | `.gap` | `fromDec`, `toDec` | Texto "20 dias sem cobertura" (lacuna ≥ 2 decêndios) ou "10d" (1 decêndio) |
| `DragTip` | `.tip` (+ `.limit`) | `text`, `x`, `isLimit` | Só durante o arrasto |
| `CropActionsCallout` | `.callout` | `x`, `onReplace`, `onRemove` | Visível quando há cultura selecionada, nada sendo arrastado e menu de culturas fechado |
| `CropPicker` | `.picker .pk-h .pk-g .pk-i .pk-s` | `mode: 'add' \| 'replace'`, `catalog`, `onPick` | `role="dialog"`; itens agrupados em "Grãos" e "Cobertura" |
| `DraftInspector` | `.insp` | `draft` | Eyebrow "Nova rotação · rascunho"; título; veredito; `.rankcard`; lista "Culturas"; legenda da janela; "Suas limitações"; rodapé de ajuda |
| `CropListItem` | `.ci .ci-main .ci-t .ci-s` | `crop`, `selected`, `onSelect` | Botão de 52px de altura mínima: ponto de status + nome + "Plantio 21–31 out · colheita 11–20 fev" + rótulo do status. Selecionado: fundo `rgba(0,122,255,.08)`, radius 10 |
| `SavedRow` | `.row.saved` + `.tag` "Nova" | `draft`, `rank` | Somente leitura |

### 4.1 Catálogo de culturas (mock)

Unidade: **decêndio** (índice 0 = 1–10 set … 35 = 21–31 ago). Uma barra vai de `s` (decêndio do plantio) até `e` (exclusivo); a colheita é mostrada como `e − 1`.

| Chave | Nome | Grupo | Ciclo mín–máx (padrão), em decêndios | Janela **boa** de plantio | Janela de **atenção** |
|---|---|---|---|---|---|
| `soja` | Soja | Grãos | 10–14 (12) | 11–20 out → 21–30 nov | 1–10 out → 1–10 dez |
| `milho` | Milho safrinha | Grãos | 10–14 (12) | 11–20 jan → 11–20 fev | 1–10 jan → 21–28 fev |
| `sorgo` | Sorgo | Grãos | 9–12 (11) | 21–31 jan → 21–28 fev | 11–20 jan → 1–10 mar |
| `caupi` | Feijão-caupi | Grãos | 7–9 (8) | **sem dado** | **sem dado** |
| `crot` | Crotalária + milheto | Cobertura | 9–13 (11) | 21–31 jan → 1–10 mar | 11–20 jan → 11–20 mar |
| `milheto` | Milheto | Cobertura | 7–10 (9) | 1–10 fev → 11–20 mar | 21–31 jan → 21–31 mar |
| `braq` | Braquiária | Cobertura | 9–14 (12) | **sem dado** | **sem dado** |

Na versão real, as janelas vêm do ZARC (MAPA) por município, solo e cultivar. Fora do Brasil não há ZARC: a cultura fica "Sem dado" (ver §6).

**Rascunho inicial (mock):** Soja (plantio 21–31 out, colheita 11–20 fev) → Sorgo (plantio 21–28 fev, colheita 1–10 jun), com Sorgo selecionado. **[proposta]** No produto, abrir o rascunho já preenchido com a rotação atual do talhão. O agricultor costuma partir do que já faz.

---

## 5. States and Interactions

### 5.1 Regras de cálculo

| Regra | Especificação |
|---|---|
| Status da cultura | Pelo decêndio de plantio `s`: dentro da janela boa → `good` "Bom"; dentro da de atenção → `warn` "Atenção"; fora → `risk` "Risco"; cultura sem janela → `none` "Sem dados" |
| Status da rotação | O pior entre as culturas **com dado** (ordem: risk > warn > good). As "Sem dados" não entram. Se todas forem "Sem dados", ou não houver cultura: `none` |
| Veredito (painel) | Sem culturas: "Adicione uma cultura" · good: "Todas as culturas na melhor época de plantio" · warn: "{Cultura} no limite da época de plantio" · risk: "{Cultura} fora da época de plantio" · none: "Sem dados de clima para {Cultura}" (a cultura citada é a primeira com o pior status) |
| Ranking | As 4 rotações sugeridas têm status fixo `[good, good, warn, risk]`. Posição = (quantas têm status igual ou melhor) + 1. Textos: "Ficaria em 3º" (selo) e "3º de 5" (cartão). Empate fica atrás das existentes |
| Lacunas | Entre culturas vizinhas, `g = próxima.s − atual.e`. Se `g > 0`, mostra a faixa listrada com "{g×10} dias sem cobertura" (g ≥ 2) ou "{g×10}d" (g = 1) |
| "Mais pragas" | Chip aparece quando a rotação tem `soja` **e** `milho` |
| Suas limitações | 1) "Só 1 plantadeira": sempre ok no mock ("Cada plantio cai num período diferente."). 2) "Evitar solo exposto": com lacuna → alerta "{N} dias sem cobertura entre as culturas."; sem lacuna → ok "Uma cultura entra logo depois da outra.". 3) "Safra anterior": soja + milho → alerta de pragas "Repete soja e milho: mais pragas e mais defensivos."; senão ok "Troca as culturas do ano passado." |
| Janela no calendário | Os decêndios da janela **boa** da cultura selecionada ficam verdes na linha 1-2-3 do calendário. Legenda no painel: "Verde no calendário: melhor época de plantio de {cultura} (ZARC)". Sem cultura selecionada: "cada cultura" |

### 5.2 Edição por arrasto (ponteiro)

Todas as posições encaixam no decêndio mais próximo: `índice = round((x − trilho.left) / trilho.width × 36)`.

| Gesto | Comportamento | Limites |
|---|---|---|
| Pressionar o meio da barra | Seleciona a cultura, fecha o menu de culturas, esconde o menu Trocar/Remover e começa a mover. Mantém a duração; desloca pelo Δx | `s ≥ fim da anterior` (ou 0); `e ≤ início da próxima` (ou 36) |
| Arrastar a alça esquerda | Muda o plantio; a colheita fica fixa | `s ∈ [max(fim da anterior, e − ciclo máx), e − ciclo mín]` |
| Arrastar a alça direita | Muda a colheita; o plantio fica fixo | `e ∈ [s + ciclo mín, min(início da próxima, s + ciclo máx)]` |
| Durante o arrasto | Dica escura: mover/alça esquerda → "Plantio: 21–31 out"; alça direita → "Colheita: 11–20 jun". A dica acompanha o ponto arrastado | — |
| Bater numa cultura vizinha | Dica laranja (`.tip.limit`): "Limite: colheita de soja" (vizinha anterior) ou "Limite: plantio de sorgo" (vizinha seguinte) | As culturas **nunca se sobrepõem** |
| Bater no ciclo mín/máx | A barra para sem aviso. **[proposta]** dica laranja "Ciclo mínimo da soja: 100 dias" / "Ciclo máximo…" | — |
| Soltar (`pointerup`/`pointercancel`) | Some a dica; reaparece o menu Trocar/Remover; tudo recalcula (status, lacunas, ranking, painel) | — |
| Captura | `setPointerCapture` no início: o arrasto continua mesmo com o ponteiro fora da barra | — |

Durante o arrasto, status, ranking e painel já se atualizam a cada decêndio cruzado.

### 5.3 Estados dos elementos

| Elemento | Estado | Comportamento |
|---|---|---|
| Barra | normal | cor do status; `cursor:grab` |
| Barra | selecionada | contorno `0 0 0 2px --ink` + alças visíveis |
| Barra | arrastando | **[proposta]** `cursor:grabbing` (o canva mantém `grab`) |
| Alça | hover | `cursor:ew-resize` |
| `.tb` | normal / foco | branca com contorno; foco = anel 3px `rgba(0,122,255,.5)`, offset 2 |
| "+ Cultura" | clique | alterna o menu no modo **adicionar** (`aria-expanded`) |
| "Cancelar" | clique | fecha o rascunho. **No canva o rascunho fica guardado** e volta igual no próximo `+`. **[proposta]** descartar e, se houve edição, pedir confirmação ("Descartar esta rotação?") |
| "Salvar" | clique | fecha o rascunho e mostra a linha salva (ver 5.5) |
| Menu Trocar/Remover | "Trocar" | abre o menu de culturas no modo **trocar** |
| Menu Trocar/Remover | "Remover" | remove a cultura selecionada; a seleção passa para a anterior (ou para a primeira). As vizinhas **não se reposicionam**: pode surgir uma lacuna |
| Menu de culturas | item habilitado / hover | linha de 40px; hover `#F2F2F7` |
| Menu de culturas | item desabilitado | texto `#6E6E73`, `cursor:not-allowed`, nota explicando o motivo |
| Item do painel "Culturas" | clique | seleciona a cultura (mesmo efeito de clicar na barra, sem mover) |

### 5.4 Menu de culturas

| Modo | Título / subtítulo | Regra de cada item | Ao escolher |
|---|---|---|---|
| Adicionar (`.pk-add`) | "Adicionar cultura" / "Entra depois de {última cultura}"; sem culturas: "Entra depois de outubro"; safra cheia: "A safra está cheia" | Desabilitado com "Não cabe na safra" se `fim da última + ciclo mín > 36`. Nota "Sem dados" se a cultura não tem janela | Entra em `s = fim da última` (sem culturas: decêndio 4 = 11–20 out) com `e = min(36, s + ciclo padrão)`; fica selecionada; o menu fecha |
| Trocar (`.pk-rep`) | "Trocar {cultura}" / "Mantém o plantio e ajusta ao ciclo da nova cultura" | A própria cultura: desabilitada, nota "Atual". Desabilitada com "Não cabe aqui" se `s + ciclo mín > início da próxima`. Nota "Sem dados" se não tem janela | Mantém `s`; duração = a atual limitada a [mín, máx] da nova e ao espaço até a próxima; o menu fecha |

### 5.5 Salvar

- **No canva:** a linha salva (`.row.saved`, fundo verde 8%, tag "Nova") aparece **acima** da rotação 1, com o número da posição calculada. As sugeridas mantêm 1–4. O painel direito continua no rascunho.
- **Problemas confirmados na referência:**
  - os números se repetem (ex.: duas linhas "3") ou ficam fora de ordem ("5" acima do "1");
  - clicar `+` depois de salvar **apaga a linha salva** e reabre o rascunho.
- **[proposta]** Ao salvar:
  1. inserir a rotação na lista **na posição do ranking** e renumerar todas (1–5);
  2. incluí-la também no modo Comparação, com "Sem dado" onde não houver valor;
  3. selecioná-la no painel direito;
  4. anunciar "Rotação salva. Ficou em 3º." (ver §7);
  5. o `+` abre um rascunho **novo**, sem apagar as salvas.
- Persistência **[proposta]:** `localStorage` por talhão + safra no MVP.

---

## 6. Edge Cases

| Caso | Comportamento |
|---|---|
| Rascunho vazio (removeu tudo) | Título "Nova rotação"; status "Sem dados"; veredito "Adicione uma cultura"; selo "Ficaria em 5º"; sem menu Trocar/Remover. **[proposta]** "Salvar" desabilitado e mensagem no trilho "Adicione a primeira cultura" com botão "+ Cultura" |
| Só culturas sem dado (caupi, braquiária) | Barras brancas com contorno (`.b.none`); status "Sem dados"; veredito "Sem dados de clima para Feijão-caupi". Nunca inventar status |
| Safra cheia | Itens do menu desabilitados com "Não cabe na safra"; subtítulo "A safra está cheia" |
| Muitas culturas (4+) | O título pode estourar a linha (`.rh` é `nowrap`). **[proposta]** `text-overflow:ellipsis` no `.nm` com o nome completo em `title`; selo, status e ações nunca encolhem |
| Barra estreita (ciclo curto) | O nome é cortado pela barra (`overflow:hidden`). O nome completo está no painel |
| Menu de trocar perto da borda direita | `left` limitado a 62% do trilho |
| Decêndio ≠ 10 dias | Os decêndios têm 8 a 11 dias (fev 21–28 e meses com 31). "N dias sem cobertura" usa ×10, então é aproximado. **[proposta]** calcular pelos dias reais |
| Fora do Brasil (sem ZARC) | Todas as culturas "Sem dados"; a edição continua funcionando (datas, lacunas, pragas). **[proposta]** janelas derivadas do clima histórico (NASA POWER) com selo "Estimado" |
| Dados carregando / erro **[proposta]** | Catálogo e janelas vêm do backend. Enquanto carrega, "+ Cultura" mostra spinner no menu e as barras ficam sem cor (`.b.none`). Se falhar, a cultura fica "Sem dados" e aparece "Não foi possível carregar as janelas de plantio. Tentar de novo" |
| Clima dos meses | Os ícones de clima dos meses neste canva são outro mock e diferem da tela principal. **Use os da tela principal** |

---

## 7. Accessibility Notes

**Ordem de foco no canva:** `+` → "+ Cultura" → "Cancelar" → "Salvar" → "Trocar" → "Remover" → itens do painel "Culturas".

**Lacunas encontradas na referência** (precisam de solução na implementação):

| Problema | Impacto | Correção **[proposta]** |
|---|---|---|
| Barras e alças **não recebem foco** (alças com `aria-hidden`) | Impossível mudar datas sem mouse | Cada cultura vira um grupo focável com dois `role="slider"`: "Plantio de soja" e "Colheita de soja" (`aria-valuetext="21–31 out"`, min/max pelos limites de 5.2). ←/→ ±1 decêndio; Shift+←/→ move a cultura inteira; Delete remove. Como alternativa mais simples, use campos de data no item do painel "Culturas" |
| Menu de culturas **não fecha com Esc nem com clique fora**, e o foco não entra nele | Armadilha para teclado e para mouse | Comportamento de popover/menu: abrir move o foco para o 1º item habilitado; ↑/↓ navegam; Enter escolhe; Esc e clique fora fecham e devolvem o foco ao botão que abriu |
| Mudanças não são anunciadas | Quem usa leitor de tela não percebe status, ranking nem lacunas | Região `aria-live="polite"`: "Soja: plantio 1–10 out, Atenção. Ficaria em 4º." (com debounce de 500ms após soltar ou após a tecla) |
| Alvos < 44px | `.tb` 28px; menu Trocar/Remover 36px; itens do menu 40px | Área clicável de 44px (padding/pseudo-elemento) sem mudar o visual. As alças já têm 36×46 |
| Status só por ponto colorido | O ponto (`.dot`) acompanha texto ("Bom/Atenção/Risco"), então passa | **[proposta]** alinhar ao padrão da tela principal: ícone + "Clima favorável / arriscado / desfavorável" + tooltip |

| Elemento | Papel / ARIA |
|---|---|
| Linha de rascunho | `role="group" aria-label="Nova rotação, rascunho"` |
| "+ Cultura" | `aria-expanded`, `aria-haspopup="menu"` (ou `dialog`) |
| Menu de culturas | `role="dialog" aria-label="Adicionar cultura"` / "Trocar sorgo" (como no canva) ou `role="menu"` com `menuitem`; itens indisponíveis com `aria-disabled="true"` e o motivo no nome acessível |
| "Trocar" | `aria-haspopup="dialog"` (como no canva) |
| Lacuna | texto visível; **[proposta]** `role="note"` |
| Painel | `<aside aria-label="Detalhe da nova rotação">` |

---

## 8. Responsive Behavior

Mesmos breakpoints da tela principal (`fieldshift-clima-do-mes/HANDOFF-SPEC.md` §8). Específico deste componente:

| Largura do board | Mudança |
|---|---|
| ≥ 776px (viewport ≥ 1330) | como o canva |
| < 776px | os botões "+ Cultura / Cancelar / Salvar" disputam espaço com título, selo e status. **[proposta]** as ações descem para uma linha própria abaixo do título |
| Toque (tablet) | as áreas de 36×46 das alças funcionam; manter `touch-action:none` nas barras para o arrasto não rolar a página |

---

## 9. Animation / Motion

O canva não tem animação: tudo é instantâneo. **[proposta]** para um acabamento mais Apple, respeitando `prefers-reduced-motion`:

| Elemento | Gatilho | Animação | Duração | Easing |
|---|---|---|---|---|
| Linha de rascunho | abrir com `+` | surge de cima com fade (altura 0 → auto) | 220ms | `cubic-bezier(.2,.8,.2,1)` |
| Menu de culturas | abrir / fechar | fade + scale 0.98 → 1, a partir do botão | 160ms / 120ms | `ease-out` / `ease-in` |
| Menu Trocar/Remover | aparecer após soltar | fade | 120ms | `ease-out` |
| Barra | arrastar | **sem animação**: segue o ponteiro, encaixando por decêndio | 0 | — |
| Linha salva | salvar | entra na posição do ranking (FLIP) e fica destacada por 1,2s | 250ms | spring |

---

## 10. Questões abertas

1. **Ranking:** o rascunho é ranqueado só pelo status de clima, enquanto a tela principal ordena pelas prioridades marcadas em "O que importa". **Usar um motor só** (cada critério calculado para a rotação do agricultor).
2. **Vocabulário de status:** aqui é "Bom/Atenção/Risco" pela janela de plantio (ZARC); na tela principal é "Clima favorável/arriscado/desfavorável" por "N de 10 anos". Definir um modelo para os dois (ex.: janela do ZARC para o plantio + frequência histórica para o ciclo).
3. **"Só 1 plantadeira"** está sempre ok no mock. Validar de verdade? (Ex.: duas culturas com plantio no mesmo decêndio, o que hoje é impossível porque elas não se sobrepõem.)
4. **Consórcios** ("Crotalária + milheto", "Milho + braquiária") entram como uma cultura só. Manter assim no MVP?
5. **Cancelar:** descartar ou guardar o rascunho? (O canva guarda.)

---

## 11. Critério de pronto

- `/` com o rascunho aberto fica visualmente igual a `/reference/NovaRotacao.dc.html` nos estados das imagens 01–08 (descontando a barra lateral antiga e os ícones de clima).
- Com as mesmas ações nos dois lados, ficam iguais: datas ("Plantio … · colheita …"), status, lacunas, chip de pragas, "Ficaria em Nº", veredito e "Suas limitações". Ações:
  - arrastar o meio da barra e as duas alças, incluindo bater nas vizinhas (dica de limite);
  - adicionar até encher a safra (itens desabilitados);
  - trocar a cultura (ajuste do ciclo; "Atual" e "Não cabe aqui");
  - remover até esvaziar.
- Lacunas de acessibilidade da §7 resolvidas: edição de datas por teclado, menu com Esc e foco, anúncios por `aria-live`.
- Salvar segue a proposta de 5.5, ou outra decisão registrada nas questões abertas.
