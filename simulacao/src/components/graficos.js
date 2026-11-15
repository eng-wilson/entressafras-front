// Peças visuais da ferramenta de decisão: devolvem HTML ou SVG como texto, sem estado.
//   linhas        gráfico de linhas (séries por ano ou por dia)
//   janelaChuva   chuva por decêndio da safra contra o normal, com as fases da cultura
//   medidorVertical  régua vertical (chuva, temperatura) ao lado do talhão

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const ic = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
export const CORES = ['#1E7A3C', '#0A6CD6', '#E08600', '#D70015', '#8E44AD', '#5E5CE6'];

export const ST = {
    good: { cls: 'good', label: 'Bom', icon: 'i-okc' },
    warn: { cls: 'warn', label: 'Atenção', icon: 'i-alert' },
    risk: { cls: 'risk', label: 'Risco', icon: 'i-xc' },
    neu: { cls: 'neu', label: '—', icon: 'i-dash' }
};

export function linhas(series, { W = 520, H = 170, fmtY = v => v.toFixed(2), rotulo = '' } = {}) {
    const m = { l: 42, r: 8, t: 8, b: 22 };
    const xs = series[0].pontos.map(p => p.x);
    const todos = series.flatMap(s => s.pontos.map(p => p.y));
    let lo = Math.min(...todos), hi = Math.max(...todos);
    if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    const X = x => m.l + (W - m.l - m.r) * (xs.length > 1 ? (x - xs[0]) / (xs.at(-1) - xs[0]) : 0.5);
    const Y = v => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));
    let svg = '';
    for (let k = 0; k <= 3; k++) { const v = lo + (hi - lo) * k / 3; svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(60,60,67,.12)"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" class="ax">${fmtY(v)}</text>`; }
    const passo = Math.ceil(xs.length / 8);
    xs.forEach((x, i) => { if (i % passo === 0 || i === xs.length - 1) svg += `<text x="${X(x)}" y="${H - 4}" text-anchor="middle" class="ax">${x}</text>`; });
    series.forEach((s, i) => {
        const cor = s.cor ?? CORES[i % CORES.length];
        svg += `<polyline fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${s.tracejado ? 'stroke-dasharray="5 4"' : ''} points="${s.pontos.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;
        for (const p of s.pontos) svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.5" fill="${cor}"><title>${esc(s.nome)}: ${fmtY(p.y)} (${p.x})</title></circle>`;
    });
    return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(rotulo)}">${svg}</svg>` +
        (series.length > 1 || series[0].nome ? `<div class="leg">${series.map((s, i) => `<span><i style="background:${s.cor ?? CORES[i % CORES.length]}"></i>${esc(s.nome)}</span>`).join('')}</div>` : '');
}

export function janelaChuva(J) {
    const W = 520, H = 210, m = { l: 34, r: 6, t: 8, b: 56 };
    const d = J.decendios, n = d.length;
    const max = Math.max(...d.map(x => Math.max(x.p90, x.chuvaMm))) * 1.1 || 1;
    const bw = (W - m.l - m.r) / n;
    const y = v => m.t + (H - m.t - m.b) * (1 - v / max);
    const risco = new Set(J.riscos.filter(r => r.risco === 'seca').map(r => r.diaInicio));
    let svg = '';
    for (let v = 0; v <= max; v += max > 200 ? 50 : 25) svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(60,60,67,.12)"/><text x="${m.l - 5}" y="${y(v) + 4}" text-anchor="end" class="ax">${v}</text>`;
    d.forEach((x, i) => {
        const x0 = m.l + i * bw;
        if (risco.has(x.diaInicio)) svg += `<rect x="${x0}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="#FDE2E4"/>`;
        svg += `<rect x="${x0 + bw * 0.12}" y="${y(x.p90)}" width="${bw * 0.76}" height="${Math.max(0, y(x.p10) - y(x.p90))}" rx="3" fill="#E3EEFD"/>`;
        svg += `<rect x="${x0 + bw * 0.3}" y="${y(x.chuvaMm)}" width="${bw * 0.4}" height="${y(0) - y(x.chuvaMm)}" rx="2" fill="${x.classe === 'seco' ? '#FF9F0A' : '#0A6CD6'}"/>`;
        svg += `<line x1="${x0 + bw * 0.08}" x2="${x0 + bw * 0.92}" y1="${y(x.chuvaNormalMm)}" y2="${y(x.chuvaNormalMm)}" stroke="#1D1D1F" stroke-width="1.5"/>`;
        if (i % 2 === 0) svg += `<text x="${x0 + bw / 2}" y="${H - m.b + 13}" text-anchor="middle" class="ax">${x.data.split('-').reverse().join('/')}</text>`;
    });
    let t0 = 0;
    J.fases.forEach((f, i) => {
        const x0 = m.l + (W - m.l - m.r) * t0, x1 = m.l + (W - m.l - m.r) * Math.min(1, f.ate);
        svg += `<rect x="${x0}" y="${H - m.b + 22}" width="${Math.max(0, x1 - x0 - 1)}" height="18" rx="4" fill="${i % 2 ? '#C9EBD3' : '#DDF3E3'}"/>`;
        if (x1 - x0 > 30) svg += `<text x="${(x0 + x1) / 2}" y="${H - m.b + 35}" text-anchor="middle" class="ax" style="fill:#14672F">${esc(f.codigo)}</text>`;
        t0 = f.ate;
    });
    const secos = J.riscos.filter(r => r.risco === 'seca');
    const st = secos.length ? `<span class="gs warn">${ic('i-alert')}Seca na fase sensível</span>` : `<span class="gs good">${ic('i-okc')}Sem sobreposição</span>`;
    return `<div class="gb"><div class="gh"><span class="gl">${ic('i-drop')}Chuva × fases da ${esc(J.cultura.toLowerCase())} · ${J.ano}/${String(J.ano + 1).slice(2)}</span>${st}</div>
        <svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chuva por decêndio da última safra contra o normal">${svg}</svg>
        <div class="leg"><span><i style="background:#0A6CD6"></i>chuva da safra</span><span><i style="background:#FF9F0A"></i>decêndio seco</span><span><i style="background:#E3EEFD"></i>faixa dos anos (p10–p90)</span><span><i style="background:#1D1D1F;height:2px"></i>normal do local</span></div>
        <p class="gc">${secos.length ? 'Seca em fase sensível: ' + secos.map(r => `${r.data.split('-').reverse().join('/')} (${esc(r.faseNome)})`).join('; ') + '.' : 'Nenhum decêndio seco caiu numa fase sensível nesta safra.'} Fundo vermelho marca a sobreposição.</p></div>`;
}

// Régua vertical do protótipo: rótulo, valor, faixa preenchida até o valor e marcas na escala.
// tipo 'chuva' (preenche de baixo) ou 'temp' (faixa entre mín e máx).
export function medidorVertical({ id = '', rotulo, icone, valor, unidade, etiqueta, etiquetaCls = '', tipo = 'chuva', lo = 0, hi = 1, de = lo, ate = valor, marcas = [], aria }) {
    const pos = v => `${Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)).toFixed(1)}%`;
    const faixa = tipo === 'chuva'
        ? `<i class="vg-rain" style="height:${pos(valor)}"></i>`
        : `<i class="vg-temp" style="clip-path:inset(calc(100% - ${pos(ate)}) 0 ${pos(de)} round 4px)"></i>`;
    return `<div class="vg" ${id ? `id="${id}"` : ''} role="img" aria-label="${esc(aria)}">
        <span class="vg-l">${ic(icone)}${esc(rotulo)}</span>
        <span class="vg-v">${valor === null ? '—' : esc(valor)}<small> ${esc(unidade)}</small></span>
        ${etiqueta ? `<span class="ms-h ${etiquetaCls}">${esc(etiqueta)}</span>` : ''}
        <div class="vg-w"><div class="vg-tr${tipo === 'temp' ? ' vg-tr-temp' : ''}" aria-hidden="true">${valor === null ? '' : faixa}${marcas.map(m => `<b style="bottom:${pos(m)}"></b>`).join('')}</div>
        <div class="vg-sc" aria-hidden="true">${marcas.map(m => `<span style="bottom:${pos(m)}">${m}</span>`).join('')}</div></div></div>`;
}
