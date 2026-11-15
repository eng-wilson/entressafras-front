// Medidores do decêndio no centro; na lateral, o que fazer em cada parâmetro (agora e no plano da rotação).
import { esc, ic } from './graficos.js';

const ESTADO = {
    good: { rotulo: 'Protegido', ordem: 0 },
    neu: { rotulo: 'Estável', ordem: 1 },
    warn: { rotulo: 'Atenção', ordem: 2 },
    risk: { rotulo: 'Em risco', ordem: 3 }
};

export function sinalVital(sinal, selecionado, escopo = 'rotacao') {
    const estado = ESTADO[sinal.estado] ?? ESTADO.neu;
    const rotulo = sinal.estadoRotulo || estado.rotulo;
    const faixas = [['risk', 'Crítico'], ['warn', 'Atenção'], ['good', 'Ideal']];
    const local = escopo === 'decendio';
    return `<button class="pi-sinal ${esc(sinal.estado)}" type="button" data-pi-${local ? 'periodo' : 'sinal'}="${esc(sinal.id)}"
        aria-pressed="${sinal.id === selecionado}" aria-controls="${local ? 'pi-periodo-detalhe' : 'pi-detalhe'}" aria-label="${esc(sinal.nome)} ${local ? 'no decêndio selecionado' : 'na rotação inteira'}: ${esc(sinal.medida)}. ${esc(rotulo)}, ${esc(sinal.valor)}. Ver detalhes">
        <span class="pi-medidor" aria-hidden="true" title="Faixa qualitativa ${local ? 'do decêndio' : 'da rotação'}: ${esc(rotulo)}">
            <span class="pi-icone">${ic(sinal.icone)}</span>
            <span class="pi-escala-estado">
                <span class="pi-trilho">${faixas.map(([classe, nome], i) => `<span class="pi-segmento ${classe}${sinal.estado === classe ? ' ativo' : ''}" title="${i + 1} · ${nome}"></span>`).join('')}</span>
                <span class="pi-faixas">${faixas.map(([classe, nome]) => `<span${sinal.estado === classe ? ' class="ativa"' : ''}>${nome}</span>`).join('')}</span>
            </span>
        </span>
        <span class="pi-sinal-txt"><small>${esc(sinal.nome)}</small>${local ? '' : `<b>${esc(rotulo)}</b>`}</span>
        <span class="pi-medida${local && ['solo', 'pragas'].includes(sinal.id) ? ' pi-condicao' : ''}">${esc(local && ['solo', 'pragas'].includes(sinal.id) ? rotulo : sinal.medida)}</span>
    </button>`;
}


// Lateral: só o que fazer. O centro já mostra o estado; aqui cada parâmetro vira uma ação.
// "Agora" segue o decêndio da cena; "Ao planejar" resume a rotação inteira, um item por parâmetro.
function linhaAgora(sinal, aberto) {
    const calma = sinal.acao.startsWith('Nada a fazer');
    return `<li class="pi-acao ${esc(sinal.estado)}${calma ? ' calma' : ''}">
        <button type="button" data-pi-periodo="${esc(sinal.id)}" aria-expanded="${aberto}" aria-controls="pi-periodo-detalhe">
            <span class="pi-acao-i">${ic(sinal.icone)}</span>
            <span class="pi-acao-txt"><small>${esc(sinal.nome)}</small><b>${esc(sinal.acao)}</b></span>
            <span class="pi-acao-seta" aria-hidden="true">${ic('i-right')}</span>
        </button>
        ${aberto ? `<div id="pi-periodo-detalhe" class="pi-acao-detalhe">
            <b>${esc(sinal.valor)}</b><p>${esc(sinal.leitura)}</p>
            <details class="pi-criterio"><summary>Como é calculado</summary><p>${esc(sinal.criterio)}</p></details>
        </div>` : ''}
    </li>`;
}

export function blocoAgora(periodo, selecionado) {
    if (!periodo?.sinais?.length) return '';
    return `<section class="pi-fazer" aria-label="O que fazer neste decêndio">
        <div class="pi-fazer-h"><h3>O que fazer agora</h3><span>${esc(periodo.contexto)} · ${esc(periodo.cultura)}</span></div>
        <ul class="pi-acoes">${periodo.sinais.map(s => linhaAgora(s, s.id === selecionado)).join('')}</ul>
    </section>`;
}

export function blocoPlano(modelo) {
    const { itens = [], semAjuste = [] } = modelo.acoes ?? {};
    const ok = semAjuste.length ? `<p class="pi-sem-ajuste">${ic('i-check')}${esc(semAjuste.join(', '))}: sem ajuste no plano</p>` : '';
    return `<section class="pi-fazer" aria-label="O que ajustar no plano da rotação">
        <div class="pi-fazer-h"><h3>Ao planejar a rotação</h3><span>${esc(modelo.contexto)}</span></div>
        ${itens.length ? `<ul class="pi-acoes">${itens.map(a => `<li class="pi-acao ${esc(a.estado)}"><div>
            <span class="pi-acao-i">${ic(a.icone)}</span>
            <span class="pi-acao-txt"><small>${esc(a.nome)}</small><b>${esc(a.acao)}</b><em>${esc(a.motivo)}</em></span>
        </div></li>`).join('')}</ul>` : ''}
        ${ok}
    </section>`;
}

function cabecalho(modelo) {
    return `<div class="pi-inspector-h"><span class="pi-supra">Sugestão selecionada</span>
        <div class="pi-nome-rotacao"><h2>${esc(modelo.nome.replace(/\s+depois\s+/i, ' → '))}</h2><button type="button" data-pi-dados aria-label="Ver todos os dados e critérios da rotação" title="Ver todos os dados e critérios da rotação">${ic('i-info')}</button></div>
        </div>`;
}

// Produtividade estimada: mediana dos anos simulados, com o ano ruim (p10) e o ano bom (p90)
// numa régua de zero ao potencial da cultura. Cobertura aparece como palhada, sem venda.
const num = v => {
    const n = Math.max(0, Number(v) || 0);
    return n < 10 ? n.toFixed(1).replace('.', ',') : Math.round(n).toLocaleString('pt-BR');
};
const UNIDADE = { 'sc/ha': ['sc/ha', 'sc'], '@/ha': ['@/ha', '@'], 't/ha MS': ['t/ha de palhada', 't de palhada'] };

export function produtividadeEstimada(producao = [], areaHa = null) {
    if (!producao.length) return '';
    const linhas = producao.map(p => {
        const [porHa, total] = UNIDADE[p.unidade] ?? [p.unidade, ''];
        const teto = Math.max(p.potencial || 0, p.p90 || 0, 1e-6);
        const pos = v => `${(100 * Math.max(0, Math.min(1, v / teto))).toFixed(1)}%`;
        const classe = !p.grao ? 'neu' : p.pctPotencial >= 85 ? 'good' : p.pctPotencial >= 70 ? 'warn' : 'risk';
        const noTalhao = areaHa > 0 && total ? ` · ≈ ${num(p.p50 * areaHa)} ${total} no talhão` : '';
        return `<li class="pi-prod ${classe}">
            <div class="pi-prod-h"><span>${esc(p.nome)}</span><b>${num(p.p50)}<small> ${esc(porHa)}</small></b></div>
            <div class="pi-regua" role="img" aria-label="${esc(p.nome)}: ${num(p.p50)} ${esc(porHa)} na mediana; ${num(p.p10)} em ano ruim e ${num(p.p90)} em ano bom; potencial ${num(p.potencial)}">
                <span class="pi-regua-faixa" style="left:${pos(p.p10)};width:calc(${pos(p.p90)} - ${pos(p.p10)})"></span>
                <span class="pi-regua-ponto" style="left:${pos(p.p50)}"></span>
            </div>
            <p>Ano ruim ${num(p.p10)} · ano bom ${num(p.p90)}${p.grao ? ` · ${Math.round(p.pctPotencial)}% do potencial` : ''}${noTalhao}</p>
        </li>`;
    }).join('');
    return `<section class="pi-produtividade" aria-label="Produtividade estimada por cultura">
        <div class="pi-fazer-h"><h3>Produtividade estimada</h3><span title="Valores do modelo com o clima do local. Potencial é referência regional, não da sua cultivar.">Mediana dos anos simulados, com clima real do local</span></div>
        <ul>${linhas}</ul>
    </section>`;
}

export function createPainelImpacto(el, detalhes, aoDados = () => {}) {
    let modelo = null;
    let periodo = null;
    let periodoSelecionado = null;

    function render() {
        if (!modelo?.sinais?.length) { el.innerHTML = ''; detalhes.innerHTML = ''; return; }
        if (!periodo?.sinais.some(s => s.id === periodoSelecionado)) periodoSelecionado = null;
        el.innerHTML = periodo ? `<div class="pi-hud">
            <div class="pi-hud-h"><span>${ic('i-clock')}Previsão deste decêndio</span><small>O que fazer à direita ${ic('i-right')}</small></div>
            <div class="pi-sinais" role="group" aria-label="Situação prevista no decêndio selecionado: ${esc(periodo.contexto)}">
                ${periodo.sinais.map(s => sinalVital(s, periodoSelecionado, 'decendio')).join('')}
            </div>
        </div>` : '';
        detalhes.innerHTML = `<section class="pi-rotacao">${cabecalho(modelo)}${produtividadeEstimada(modelo.producao, modelo.areaHa)}${blocoAgora(periodo, periodoSelecionado)}${blocoPlano(modelo)}</section>`;
    }

    function aoClicar(e) {
        if (e.target.closest('[data-pi-dados]')) { aoDados(); return; }
        const botao = e.target.closest('[data-pi-periodo]');
        if (!botao) return;
        const id = botao.dataset.piPeriodo;
        const daHud = el.contains?.(botao) ?? false;
        // Na HUD, clicar abre o item correspondente; na lateral, alterna.
        periodoSelecionado = !daHud && periodoSelecionado === id ? null : id;
        render();
        // Mantém o foco de teclado depois de substituir o conteúdo dos painéis.
        const origem = daHud ? el : detalhes;
        [...origem.querySelectorAll('[data-pi-periodo]')].find(b => b.getAttribute('data-pi-periodo') === id)?.focus({ preventScroll: true });
        if (daHud) {
            const behavior = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
            detalhes.querySelector?.('#pi-periodo-detalhe')?.closest('.pi-acao')?.scrollIntoView({ block: 'nearest', behavior });
        }
    }
    el.addEventListener('click', aoClicar);
    detalhes.addEventListener('click', aoClicar);

    return {
        atualizar(novoModelo) {
            if (modelo?.id !== novoModelo.id) { periodo = null; periodoSelecionado = null; }
            modelo = novoModelo; render();
        },
        atualizarPeriodo(novoPeriodo) { periodo = novoPeriodo; render(); },
        limpar() { modelo = null; periodo = null; periodoSelecionado = null; render(); }
    };
}
