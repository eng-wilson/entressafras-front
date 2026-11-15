# Simulação agrícola portátil

## Organização por propósito

```text
index.js                  API pública
src/simulation/           motor diário, safras, rotação, estresses e produtividade
src/climate/              clima sintético, séries observadas e cenários
src/domain/crops/         catálogo e características das culturas
src/domain/soil/          classes e condições iniciais do solo
src/domain/               canais de estresse e distribuição das plantas
src/render/iso/           câmera e desenho isométrico
src/render/field/         desenho das culturas
src/render/soil/          skins, perfil e raízes do solo
src/render/sprites/       sprites, máscaras, sintomas e pintores procedurais
src/decision/             indicadores e avaliação das rotações
src/components/           cena, HUD, retratos e componente de integração
src/utils/                matemática, ruído, cores e geometria
assets/sprites/           PNGs e manifestos por cultura
assets/crops/             referências de arte
assets/onboarding/        fotos usadas pelos metadados de textura do solo
styles/                   cena, indicadores e tema do componente isolado
exemplo/                  integração independente com clima sintético
scripts/                  servidor de exemplo e preparação de arte
test/                     referência numérica, agronomia e portabilidade
docs/                     arquitetura, interpretação e contrato dos sprites
```

Os caminhos dos assets são resolvidos com `import.meta.url`. A pasta pode ser renomeada ou hospedada em um subdiretório sem alterar o código. Publique os arquivos de `assets/` e `styles/` junto com o JavaScript; se usar um bundler, configure a cópia desses arquivos estáticos preservando a estrutura.

## Experimentar sem o projeto original


```sh
node scripts/servir.mjs
```

Abra `http://127.0.0.1:8081/`. A página usa apenas os arquivos desta pasta e clima sintético. Nenhuma chamada NASA é necessária. O exemplo mostra os indicadores existentes de água, solo, temperatura e pragas do dia selecionado; não inventa notas para indicadores diferentes.

## Integrar a cena pronta

```html
<div id="simulacao"></div>
<script type="module">
import {
    criarSimulacao, ROTACOES, CLASSES_SOLO, soloLocal, fonteSintetica
} from './simulacao/index.js';

const cena = criarSimulacao(document.querySelector('#simulacao'), {
    altura: 560,
    aoIndicador: id => console.log('Indicador selecionado:', id)
});
const classeId = 'latossolo_vermelho';
const fonte = fonteSintetica({ sementeBase: 2024, anos: 2 });
const safra = cena.mostrar({
    rotacao: { id: 'soja_milho', ...ROTACOES.soja_milho },
    ano: 2024,
    posicao: 0,
    classe: CLASSES_SOLO[classeId], classeId,
    solo: soloLocal(), soloChave: 'solo-inicial',
    fonte, fonteChave: 'clima-sintetico'
});
cena.dia(Math.round(safra.cicloDias / 2));

// No desmontar da página/componente:
// cena.destruir();
</script>
```

O componente cria o canvas, os controles de zoom e os espaços para indicadores. O CSS e os símbolos SVG ficam isolados em Shadow DOM. Zoom, arraste por mouse/toque e restauração do enquadramento estão incluídos. Podem existir várias instâncias na mesma página.

### Métodos da cena

| Método | Uso |
|---|---|
| `mostrar(opcoes)` | Simula a rotação e retorna a safra selecionada no segundo ciclo, após um ciclo de aquecimento. |
| `dia(numero)` | Mostra um dia entre zero e `safra.cicloDias`. |
| `zoom(fator)` | Ajusta o zoom entre 0,6 e 3; 1 é o enquadramento inicial. |
| `restaurar()` | Restaura posição e zoom. |
| `indicadores(sinais)` | Atualiza os modelos dos indicadores flutuantes; array vazio os oculta. |
| `medidores(...elementos)` | Mostra elementos DOM de medidores climáticos; sem argumentos, os oculta. |
| `redimensionar()` | Recalcula a câmera; normalmente o ResizeObserver já faz isso. |
| `destruir()` | Cancela a animação, os eventos e o observador; libera caches e remove o componente. |
| `lavoura` | Acesso de leitura à lavoura atual para inspeção de sprites. |

Atualize `soloChave` e `fonteChave` quando mudar as respectivas condições; elas participam da chave de cache. `posicao` é o índice da safra na rotação. `ano` é o início do ano agrícola, em julho. `altura` aceita pixels como número ou um tamanho CSS como string.

Os indicadores são fornecidos pelo integrador para respeitar o período e o significado de cada métrica. Use os adaptadores em `src/decision/` ou forneça modelos neste formato:

```js
cena.indicadores([{
    id: 'agua', nome: 'Água', icone: 'i-drop',
    estado: 'warn', estadoRotulo: 'No limite',
    medida: 'Atendimento da demanda no período', valor: '50%'
}]);
```

Estados: `good`, `warn`, `risk` ou `neu`. O callback `aoIndicador` permite abrir os detalhes no seu projeto. Veja `exemplo/main.js` para indicadores derivados da safra e os medidores de clima.

## Usar só o motor ou o canvas existente

`simulateSeason` e `simulateRotacao` não precisam de DOM e podem rodar em Node ou Web Worker. `CULTURAS`, `CLASSES_SOLO`, `soloLocal`, `CENARIOS`, `fonteSintetica`, `fontePower` e `comCenario` também são exportados por `index.js`.

`fontePower(serie)` recebe uma série já carregada no formato documentado em `src/climate/fonte-clima.js`. Download, credenciais, armazenamento e APIs externas ficam por conta do projeto hospedeiro. Dados históricos NASA do projeto original não fazem parte desta pasta.

Para uma interface própria, use `createTalhao(canvas)` e importe `styles/cena.css`. O canvas deve ter tamanho CSS definido; os botões opcionais ficam no mesmo pai, dentro de `.talhao-zoom`, com `data-zoom="in"`, `"out"` e `"reset"`. Essa API preserva os métodos `mostrar`, `dia`, `zoom`, `restaurar`, `redimensionar` e `destruir`. O hospedeiro deve desenhar os indicadores e fornecer seu tema; o componente `criarSimulacao` já faz isso de forma isolada.

## Verificar depois de copiar

### Leitura visual do clima

O dia selecionado controla um gradiente de céu: ocre com halo solar sob estresse de seca/calor e azul-acinzentado durante a chuva. A legenda informa a condição e os mm/dia. A intensidade visual da chuva satura em 30 mm/dia (régua de desenho, não classificação agronômica). Um dia sem chuva, sozinho, não indica seca. O céu usa os estresses agudos da série diária e dá prioridade à chuva atual.

O tratamento atmosférico tem como referência visual o [app Tempo da Apple](https://apps.apple.com/us/app/weather/id1069513131): cinco faixas de cor entre zênite e horizonte, luz solar difusa e massas suaves de nuvens na chuva. As paletas distinguem dia sem estresse, seca intensa, frio (Tmax abaixo de 18 °C), chuva leve e chuva intensa. São convenções visuais, sem inferir horário, trovoadas ou nebulosidade observada. A atmosfera converge para o novo dia em aproximadamente 0,6 segundo; movimento reduzido aplica a troca imediatamente. Solo, indicadores e sintomas permanecem no dia selecionado durante a transição.

Na chuva, duas camadas de nuvens procedurais recebem iluminação e relevo pré-calculados em um atlas reutilizável. A intensidade escurece os volumes e reforça cortinas distantes de precipitação; uma abertura lateral mantém luz filtrada. Três planos de gotas variam tamanho, opacidade e velocidade. O movimento das nuvens é lento e também congela com movimento reduzido. As nuvens e cortinas são desenhadas atrás do talhão para preservar a leitura do solo e das plantas.

O solo clareia e realça as rachaduras já simuladas na seca, escurece durante a chuva e mantém as poças calculadas pelo motor. As plantas mostram murcha por déficit, calor ou excesso de água, brilho/coloração de superfície molhada e clorose por encharcamento. Danos crônicos permanecem após a chuva; a maturação natural continua distinta do estresse. A preferência por movimento reduzido congela gotas e balanço. Esses efeitos são apenas visuais e não alteram produtividade ou indicadores.

```sh
node test/portabilidade.mjs
node test/clima-visual.mjs
node test/sim-referencia.mjs
node test/sim-impacto.mjs
node test/sim-faixas.mjs
```

O teste de portabilidade verifica imports e manifestos de imagens e executa uma rotação a partir de uma cópia temporária fora do repositório. Os testes de referência preservam os hashes da simulação original.
