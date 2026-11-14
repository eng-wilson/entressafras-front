# Field Shift · "Clima do mês · talhão centralizado" → React + Vite

Pacote de handoff do protótipo para implementação. Desafio: NASA Space Apps 2026 "Field Shift: Adapting Farms with NASA Data".


> **Atualização:** a especificação completa (tokens, medidas, estados, regras de dados, acessibilidade, responsividade, critério de pronto) está em **`HANDOFF-SPEC.md`**. Ela prevalece sobre este resumo.
>
> **Canva executável dentro do projeto:** com `pnpm dev` rodando, abra `http://localhost:5173/reference/ClimaMes2.dc.html`. É o canva "em play", com slider, switches, segmentado e tooltips funcionando. Use-o como oráculo visual e de comportamento (inclusive com Playwright).
>
> - Estilo do canva: `src/canvas/canvas.css` (importe e reutilize as mesmas classes)
> - Ícones do canva: `public/canvas-icons.svg` → `<svg class="ic"><use href="/canvas-icons.svg#i-drop"/></svg>`
> - Não edite `public/reference/`: é a cópia fiel do canva.

## Conteúdo

| Arquivo | Para quê |
|---|---|
| `design/snapshot-calendario.html` | DOM renderizado (modo Calendário), CSS completo inline. **Referência visual e de markup.** Abre em qualquer navegador, sem interatividade. |
| `design/snapshot-comparacao.html` | Mesmo, no modo Comparação (tabela). |
| `design/ClimaMes2.dc.html` | Fonte original do protótipo. **Referência de lógica e dados** (classe `Component extends DCLogic`, método `renderVals()`). A sintaxe de template (`{{x}}`, `<sc-if>`, `<sc-for>`, `onClick="{{fn}}"`) é de um runtime proprietário: **não copiar**, traduzir para JSX. |
| `screenshots/*.png` | Estado esperado (1440×1120 @2x). |

## Stack

- React 18 + Vite + TypeScript
- CSS Modules (ou CSS puro) com as variáveis de `:root` do snapshot. **Sem Tailwind.**
- Libs: `@radix-ui/react-slider`, `@radix-ui/react-tooltip`, `lucide-react` (só se faltar ícone; os SVG do `<defs>` do protótipo podem ser reaproveitados como componentes).
- Medidores, talhão isométrico, linha do tempo e tabela: **SVG/CSS nativos** (não usar libs de gráfico).

## Layout

Grid `248px | minmax(0,1fr) | 320px`, linhas `52px | 1fr`, altura 100vh, min-width 1024px.

1. **Header** (`.bar`): "Field Shift" + botão "Como funciona" (sem ação por enquanto).
2. **Sidebar esquerda** (`.side`): lista "Talhão" (T-07 42 ha, solo, safra anterior, umidade, local) e "O que importa": 4 switches (`risco`, `agua`, `solo`, `prod`) que **reordenam as rotações**.
3. **Main** (`.main`):
   - Simulação: "Simulando {período}", medidor vertical de chuva (esquerda), talhão isométrico SVG (centro; plantas mudam por estágio), 2 medidores horizontais (Umidade do solo, Temperatura com faixa mín–máx).
   - Card "Rotações": botão `+`, segmentado Calendário | Comparação, faixa de meses (set→ago) com ícones de clima, decêndios 1/2/3, **slider de 36 posições (decêndios)**.
   - Modo Calendário: 4 linhas de rotação ordenadas, barras por cultura, status com ícone + texto + tooltip.
   - Modo Comparação: tabela `Rotação | Umidade necessária | Risco de pragas | Produção (sc/ha)`.
4. **Inspector direito** (`.insp`): rotação selecionada, "Datas da rotação" (plantio/colheita + risco), "Por que ficou em Nº", "Ver todos os dados", disclaimer.

## Estado

```ts
type State = {
  idx: number;          // decêndio 0..35 (0 = 1–10 set). Default 10
  mode: 'cal' | 'cmp';  // default 'cal'
  pr: { risco: boolean; agua: boolean; solo: boolean; prod: boolean }; // default { risco:true, agua:false, solo:true, prod:false }
};
```

Tudo derivado de `idx` e `pr` (ver `renderVals()`):

- `TMIN`/`TMAX` (36 valores), `WAT` (umidade por decêndio), `USUAL`/`THIS` (chuva mensal), `STAGES` (estágios fenológicos) → simulação.
- `tempGauge()`: soja ideal ≤30 °C, risco >40 °C, frio <10 °C (13 °C na floração), geada ≤2 °C. Rótulos: Bom / Frio · Atenção / Geada · Risco / Calor · Atenção/Risco.
- **Ordenação:** `SCORE` por prioridade; cada prioridade ativa soma a posição de rank; empate desempata por `risco`. Default sem nada ativo = `['risco']`.
- **Status climático:** `FREQ` = em quantos dos últimos 10 anos a água foi suficiente. `n ≥ 7` favorável (✓), `4–6` arriscado (!), `< 4` desfavorável (✕). Texto: "Clima favorável"; tooltip: "Água suficiente em N de 10 anos (cultura)".
- Tabela de comparação: array `CT`.

## Interações obrigatórias

- **Slider:** arrastar, clicar e teclado (setas). O protótipo usa pointer capture; com Radix Slider isso já vem pronto. O arrasto precisa ser fluido: memorizar o SVG do talhão por estágio (`useMemo`).
- Switches reordenam as linhas, idealmente com animação de posição (FLIP ou CSS `order`).
- Tooltips aparecem sem atraso, ao passar o mouse **e** no foco do teclado; não podem ser cortados na borda (Radix faz isso).
- Segmentado alterna Calendário/Comparação.

## Regras de design (não negociáveis)

- Visual Apple/SwiftUI minimalista: fonte do sistema (`-apple-system, "SF Pro Text", Inter`), cantos 10–14px, sombras sutis, sem bordas pesadas.
- Acessibilidade: texto ≥ 12px; **status nunca só por cor** (sempre ícone + texto); alvos de toque ≥ 44px; `role="switch"`/`aria-checked` nos toggles; foco visível.
- Interface em português (pt-BR).
- Todos os dados são **ilustrativos (mock)**. Manter o disclaimer. Não inventar números "reais"; dado ausente aparece como "Sem dado" ou "-".

## Estrutura sugerida

```
src/
  data/mock.ts            // TMIN, TMAX, WAT, USUAL, THIS, STAGES, FREQ, CT, SCORE
  logic/                  // rank.ts, tempGauge.ts, status.ts (funções puras + testes)
  components/
    AppShell.tsx  Sidebar.tsx  Inspector.tsx
    Simulation/ RainGauge.tsx  IsoField.tsx  SoilMoistureBar.tsx  TempRangeBar.tsx
    Rotations/  MonthStrip.tsx  DecadeSlider.tsx  CalendarRows.tsx  CompareTable.tsx  StatusBadge.tsx
  icons/                  // SVGs do <defs> do protótipo
```

Separar dados e lógica pura da UI, para depois trocar o mock por NASA POWER, ZARC, SMAP etc.

## Critério de pronto

A tela em 1440×1120 bate com `screenshots/01-calendario.png` e `02-comparacao.png`; slider, switches, segmentado e tooltips funcionam por mouse e teclado; nenhum erro no console.
