// Cena do talhão com os estilos da simulação isolados num Shadow DOM: o CSS dela usa .fgrid, .isow e .vg,
// que também existem no app. Equivale a criarSimulacao (simulacao/src/components/simulacao.js) sem o painel
// de indicadores e os medidores, que o app desenha por conta própria. O CSS entra inline (?inline resolve os
// @import no build); o criarSimulacao original aponta um <link> que o bundle não consegue seguir.
import css from '../../simulacao/styles/componente.css?inline'
import { createTalhao, type Talhao } from './api.js'

export type Cena = Pick<Talhao, 'mostrar' | 'dia' | 'colhido' | 'restaurar' | 'pausar' | 'preparar' | 'destruir'>

/** A cena ocupa o container inteiro: a altura vem do CSS do app (.cena .iso-sim), e o canvas acompanha. */
export function montarCena(container: HTMLElement): Cena {
  const host = document.createElement('div')
  host.style.height = '100%'
  host.style.setProperty('--simulacao-altura', '0px')
  const raiz = host.attachShadow({ mode: 'open' })
  const estilo = document.createElement('style')
  // Ajuste do app: zoom no alto, à direita, com o mesmo material dos widgets da cena (canvas.css).
  estilo.textContent = css + `
    .fgrid, .fgrid > .isow { height: 100%; min-height: 0; }
    .talhao-zoom {
      top: 12px; bottom: auto; border-radius: 14px;
      background: rgba(255,255,255,.72); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 0 0 .5px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06);
    }
    .talhao-zoom button { color: #1D1D1F; }
    .talhao-zoom [data-zoom="reset"] { font-weight: 600; color: rgba(60,60,67,.6); }`
  const molde = document.createElement('template')
  molde.innerHTML = `
    <div class="fgrid">
      <div class="isow">
        <canvas id="talhao" role="img" tabindex="0" aria-label="Simulação do talhão. Arraste para mover, use mais e menos para zoom e zero para restaurar."></canvas>
        <div class="talhao-zoom" role="group" aria-label="Zoom da simulação">
          <button type="button" data-zoom="out" aria-label="Afastar">−</button>
          <button type="button" data-zoom="reset" aria-label="Restaurar enquadramento">100%</button>
          <button type="button" data-zoom="in" aria-label="Aproximar">+</button>
        </div>
      </div>
    </div>`
  raiz.append(estilo, molde.content)
  container.append(host)
  let talhao: Talhao
  try {
    // A etiqueta do estágio do app ocupa o topo: a etiqueta de clima do canvas ficaria atrás dela.
    talhao = createTalhao(raiz.querySelector('canvas')!, { rotuloClima: false, resolucao: 512 })
  } catch (e) {
    host.remove()
    throw e
  }
  return {
    mostrar: o => talhao.mostrar(o),
    dia: d => talhao.dia(d),
    colhido: c => talhao.colhido(c),
    restaurar: () => talhao.restaurar(),
    pausar: p => talhao.pausar(p),
    preparar: c => talhao.preparar(c),
    destruir() {
      talhao.destruir()
      host.remove()
    },
  }
}
