import { createTalhao } from './talhao.js';
import { sinalVital } from './impacto-talhao.js';
import { icones } from './icones.js';

/** Monta a cena com estilos isolados. Indicadores são modelos fornecidos pelo integrador. */
export function criarSimulacao(container, { altura = '520px', aoIndicador = () => {} } = {}) {
    if (!(container instanceof HTMLElement)) throw new TypeError('Informe um elemento HTML como container.');
    const host = document.createElement('div');
    host.style.setProperty('--simulacao-altura', typeof altura === 'number' ? `${altura}px` : altura);
    const raiz = host.attachShadow({ mode: 'open' });
    raiz.innerHTML = `<link rel="stylesheet" href="${new URL('../../styles/componente.css', import.meta.url).href}">
        ${icones}
        <div class="fgrid">
            <div class="painel-impacto" hidden></div>
            <div class="isow">
                <canvas id="talhao" role="img" tabindex="0" aria-label="Simulação agrícola. Arraste para mover, use mais e menos para zoom e zero para restaurar."></canvas>
                <div class="talhao-zoom" role="group" aria-label="Zoom da simulação">
                    <button type="button" data-zoom="out" aria-label="Afastar">−</button>
                    <button type="button" data-zoom="reset" aria-label="Restaurar enquadramento">100%</button>
                    <button type="button" data-zoom="in" aria-label="Aproximar">+</button>
                </div>
            </div>
            <div class="fcol" id="col-esq" hidden></div>
        </div>`;
    container.append(host);
    const talhao = createTalhao(raiz.querySelector('canvas'));
    const painel = raiz.querySelector('.painel-impacto');
    painel.addEventListener('click', e => {
        const botao = e.target.closest('[data-pi-periodo]');
        if (botao) aoIndicador(botao.dataset.piPeriodo);
    });
    let destruido = false;
    return {
        mostrar: opcoes => talhao.mostrar(opcoes),
        dia: dia => talhao.dia(dia),
        zoom: valor => talhao.zoom(valor),
        restaurar: () => talhao.restaurar(),
        redimensionar: () => talhao.redimensionar(),
        indicadores(sinais = []) {
            painel.hidden = !sinais.length;
            painel.innerHTML = `<div class="pi-sinais" role="group" aria-label="Indicadores da simulação">${sinais.map(s => sinalVital(s, null, 'decendio')).join('')}</div>`;
            // O componente informa o clique pelo callback, sem exigir um painel de detalhes externo.
            for (const botao of painel.querySelectorAll('button')) {
                botao.removeAttribute('aria-controls');
                botao.removeAttribute('aria-pressed');
            }
        },
        // Conteúdo DOM criado pelo hospedeiro (por exemplo, os medidores de clima exportados).
        medidores(...elementos) {
            const clima = raiz.querySelector('#col-esq');
            clima.replaceChildren(...elementos);
            clima.hidden = !elementos.length;
        },
        destruir() {
            if (destruido) return;
            destruido = true;
            talhao.destruir();
            host.remove();
        },
        get lavoura() { return talhao.lavoura; }
    };
}
