// Talhão 2D dentro da ferramenta de decisão: o diorama isométrico (render/iso/diorama.js e
// render/field/lavoura.js), mostrando a safra da rotação selecionada num ano real do NASA POWER, no dia escolhido
// na régua de decêndios. O solo chega com a herança da safra anterior (palhada, compactação, N).
//
//   createTalhao(canvas)
//   talhao.mostrar({ rotacao, ano, posicao, classe, classeId, solo, soloChave, fonte, fonteChave })
//       → { safra, sim } da safra pedida (simula e guarda em cache)
//   talhao.dia(dia)        troca só o dia mostrado (barato: os retratos diários já existem)
import { simulateRotacao } from '../simulation/rotacao.js';
import { CULTURAS } from '../domain/crops/catalogo.js';
import { createCamera } from '../render/iso/camera.js';
import { createDiorama } from '../render/iso/diorama.js';
import { createLavoura } from '../render/field/lavoura.js';
import { climaVisual, desenharCeu, desenharChuva, desenharRotuloClima, interpolarClima } from '../render/clima.js';

const WIDTH = 4.2, DEPTH = 4.2, TOTAL_H = 0.9, PROF_VISIVEL_M = 0.3;
// Enquadramento pelo porte da cultura mostrada: uma altura fixa (a do milho) deixava a soja e as
// forrageiras com um vazio grande em cima do talhão. A folga cobre panícula, folha esticada e vento.
const alturaPlantas = crop => Math.max(0.9, (crop?.morfologia.alturaMax[1] ?? 1.35) * 1.3);
const MODO = { solo: { tipo: 'real' }, planta: { modo: 'real', ganho: 1 } };

// opcoes.rotuloClima: false = sem a etiqueta de clima desenhada no topo do canvas.
// opcoes.resolucao: lado, em pixels, das texturas do solo (topo e perfil), repintadas a cada dia; padrão 1024.
export function createTalhao(canvas, { rotuloClima = true, resolucao = 1024 } = {}) {
    const ctx = canvas.getContext('2d');
    const cam = createCamera();
    const cenas = new Map();     // cultura → { lavoura, diorama }
    const sims = new Map();      // chave da corrida → resultado de simulateRotacao
    let atual = null;            // { cena, sim, crop, classe, dia }
    let larg = 0, alt = 0, sujo = true;
    let destruido = false, quadroId = null, pausado = false;
    const eventos = new AbortController();
    const ouvir = (alvo, tipo, fn, opcoes = {}) => alvo?.addEventListener(tipo, fn, { ...opcoes, signal: eventos.signal });

    function cenaDe(crop) {
        if (!cenas.has(crop.id)) {
            const lavoura = createLavoura(crop, { width: WIDTH, depth: DEPTH });
            const diorama = createDiorama({ width: WIDTH, depth: DEPTH, totalH: TOTAL_H, profTotalM: PROF_VISIVEL_M, crop, resolucao });
            const cena = { lavoura, diorama };
            cenas.set(crop.id, cena);
            if (crop.sprites.arte) lavoura.sprites.carregarArte().then(n => { if (n) { lavoura.compositor.limpar(); sujo = true; } });
        }
        return cenas.get(crop.id);
    }

    function redimensionar() {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        cam.dpr = Math.min(window.devicePixelRatio || 1, 2);
        larg = r.width; alt = r.height;
        canvas.width = Math.round(larg * cam.dpr); canvas.height = Math.round(alt * cam.dpr);
        enquadrar();
    }
    function enquadrar() {
        if (larg) cam.enquadrar(larg, alt, { width: WIDTH, depth: DEPTH, totalH: TOTAL_H, alturaPlantas: alturaPlantas(atual?.crop) });
    }
    const observador = new ResizeObserver(redimensionar);
    observador.observe(canvas);

    const ZOOM_MIN = 0.6, ZOOM_MAX = 3, PASSO_ZOOM = 1.2;
    const controles = canvas.parentElement.querySelector('.talhao-zoom');
    function ajustarZoom(valor, ponto = null) {
        const anterior = cam.zoom;
        const ox = cam.ox, oy = cam.oy;
        cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, valor));
        enquadrar();
        if (ponto && larg) {
            // Mantém o detalhe sob o cursor no mesmo lugar ao ampliar a imagem.
            const fator = cam.zoom / anterior;
            cam.panX += ponto.x - (ponto.x - ox) * fator - cam.ox;
            cam.panY += ponto.y - (ponto.y - oy) * fator - cam.oy;
            enquadrar();
        }
        if (controles) {
            controles.querySelector('[data-zoom="reset"]').textContent = `${Math.round(cam.zoom * 100)}%`;
            controles.querySelector('[data-zoom="out"]').disabled = cam.zoom <= ZOOM_MIN;
            controles.querySelector('[data-zoom="in"]').disabled = cam.zoom >= ZOOM_MAX;
        }
    }
    function restaurarZoom() {
        cam.panX = cam.panY = 0;
        ajustarZoom(1);
    }
    let arrasto = null;
    ouvir(canvas, 'pointerdown', e => {
        if (arrasto || !e.isPrimary || e.button !== 0) return;
        canvas.setPointerCapture(e.pointerId);
        arrasto = { id: e.pointerId, x: e.clientX, y: e.clientY };
        canvas.classList.add('arrastando');
    });
    ouvir(canvas, 'pointermove', e => {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        cam.panX += e.clientX - arrasto.x;
        cam.panY += e.clientY - arrasto.y;
        arrasto.x = e.clientX;
        arrasto.y = e.clientY;
        enquadrar();
    });
    function terminarArrasto(e) {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        arrasto = null;
        canvas.classList.remove('arrastando');
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    }
    ouvir(canvas, 'pointerup', terminarArrasto);
    ouvir(canvas, 'pointercancel', terminarArrasto);
    ouvir(canvas, 'lostpointercapture', terminarArrasto);
    ouvir(controles, 'click', e => {
        const botao = e.target.closest('[data-zoom]');
        if (!botao) return;
        if (botao.dataset.zoom === 'reset') restaurarZoom();
        else ajustarZoom(cam.zoom * (botao.dataset.zoom === 'in' ? PASSO_ZOOM : 1 / PASSO_ZOOM));
    });
    ouvir(canvas, 'wheel', e => {
        if (!atual || !e.deltaY) return;
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? alt : 1);
        ajustarZoom(cam.zoom * Math.exp(-Math.max(-240, Math.min(240, delta)) * 0.002), { x: e.clientX - r.left, y: e.clientY - r.top });
    }, { passive: false });
    ouvir(canvas, 'keydown', e => {
        if (!['+', '=', '-', '0'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === '0') restaurarZoom();
        else ajustarZoom(cam.zoom * (e.key === '-' ? 1 / PASSO_ZOOM : PASSO_ZOOM));
    });

    function aplicar() {
        if (!atual) return;
        const { cena, sim, crop, classe, dia } = atual;
        const reg = sim.plantas[dia];
        atual.clima = climaVisual(sim, dia);
        cena.lavoura.atualizar(dia / crop.cicloDias, reg, { ...MODO.planta, clima: atual.clima });
        cena.diorama.atualizar({ sim, dia, classe, modo: MODO.solo, lavoura: cena.lavoura, reg });
        const estado = atual.clima.seca > 0.7 ? 'Seca intensa' : atual.clima.seca > 0.25 ? 'Estresse por seca ou calor' : atual.clima.chuva >= 30 ? 'Chuva intensa' : atual.clima.chuva >= 0.2 ? 'Chuva' : 'Sem chuva';
        canvas.setAttribute('aria-label', `Talhão simulado: ${estado}, ${atual.clima.chuva.toFixed(1)} mm de chuva no dia. Arraste para mover; mais e menos para zoom; zero para restaurar.`);
    }

    const t0 = performance.now();
    let ceuAtual = null, ultimoQuadro = t0;
    function quadro() {
        if (destruido) return;
        quadroId = requestAnimationFrame(quadro);
        if (!atual || !larg || pausado) return;
        if (sujo) { sujo = false; aplicar(); } else atual.cena.lavoura.processarFila(8);
        const d = cam.dpr;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.clearRect(0, 0, larg, alt);
        const agora = performance.now();
        const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        ceuAtual = reduzirMovimento ? { ...atual.clima } : interpolarClima(ceuAtual, atual.clima, Math.min(64, agora - ultimoQuadro));
        ultimoQuadro = agora;
        // Só a atmosfera transiciona: legenda, solo e sintomas correspondem ao dia selecionado.
        desenharCeu(ctx, larg, alt, ceuAtual, { rotulo: false, tempo: reduzirMovimento ? 0 : (agora - t0) / 1000 });
        if (rotuloClima) desenharRotuloClima(ctx, larg, atual.clima);
        atual.cena.diorama.desenharBloco(ctx, cam);
        const tempo = reduzirMovimento ? 0 : (agora - t0) / 1000;
        atual.cena.lavoura.desenhar(ctx, cam, tempo, -1);
        ctx.setTransform(d, 0, 0, d, 0, 0);
        desenharChuva(ctx, larg, alt, ceuAtual, tempo);
    }
    quadroId = requestAnimationFrame(quadro);

    return {
        // resultado (opcional): saída de simulateRotacao já calculada fora daqui (Web Worker), com as mesmas
        // sementes, largura, profundidade e retratos do ciclo 1. Sem ele, a rotação é simulada nesta thread.
        mostrar({ rotacao, ano, posicao, classe, classeId, solo, soloChave, fonte, fonteChave, resultado = null }) {
            const chave = `${rotacao.id}|${JSON.stringify(rotacao.safras)}|${ano}|${classeId}|${soloChave}|${fonteChave}`;
            if (!sims.has(chave)) {
                if (sims.size > 12) sims.delete(sims.keys().next().value);
                sims.set(chave, resultado ?? simulateRotacao({
                    rotacao, sementes: [fonte.aquecimento(ano, 1), ano], classe, solo, fonteClima: fonte,
                    width: WIDTH, depth: DEPTH, retratos: ci => ci === 1
                }));
            }
            const safra = sims.get(chave).safras.find(s => s.ciclo === 1 && s.posicao === posicao);
            const crop = CULTURAS[safra.cultura];
            const dia = atual && atual.sim === safra.sim ? atual.dia : 0;
            const trocouCultura = atual?.crop !== crop;
            atual = { cena: cenaDe(crop), sim: safra.sim, crop, classe, dia };
            if (trocouCultura) enquadrar();
            sujo = true;
            return safra;
        },
        dia(d) {
            if (!atual) return;
            const dia = Math.max(0, Math.min(atual.crop.cicloDias, Math.round(d)));
            if (dia !== atual.dia) { atual.dia = dia; sujo = true; }
        },
        redimensionar,
        // Para de desenhar enquanto a cena não aparece (o último quadro fica no canvas); retomar redesenha.
        pausar(p) { pausado = !!p; if (!pausado) sujo = true; },
        // Cria antes a cena de outra cultura (texturas estáticas do solo e lavoura), para a troca de safra
        // não pagar esse custo na hora. Chamar quando o navegador estiver ocioso.
        preparar(cultura) { const crop = CULTURAS[cultura]; if (crop && !destruido) cenaDe(crop); },
        zoom: ajustarZoom,
        restaurar: restaurarZoom,
        destruir() {
            if (destruido) return;
            destruido = true;
            cancelAnimationFrame(quadroId);
            eventos.abort();
            observador.disconnect();
            if (arrasto && canvas.hasPointerCapture(arrasto.id)) canvas.releasePointerCapture(arrasto.id);
            arrasto = null;
            canvas.classList.remove('arrastando');
            cenas.clear();
            sims.clear();
            atual = null;
        },
        // Lavoura da cultura mostrada: usada pelo skill de sprites (galeria e medição) via window.farmatro.
        get lavoura() { return atual?.cena.lavoura ?? null; }
    };
}
