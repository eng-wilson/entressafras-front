// Ruído rápido para pintura por pixel (hash inteiro, sem Math.sin).
// Valores em 0..1. Puro: roda no browser e no Node.

export function ihash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ruído de valor suave com interpolação cúbica.
export function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = ihash(xi, yi), b = ihash(xi + 1, yi);
    const c = ihash(xi, yi + 1), d = ihash(xi + 1, yi + 1);
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

// Soma de oitavas (fractal), normalizada para 0..1.
export function fbm(x, y, oitavas = 3) {
    let v = 0, amp = 0.5, tot = 0, f = 1;
    for (let i = 0; i < oitavas; i++) {
        v += vnoise(x * f + i * 17.3, y * f - i * 9.1) * amp;
        tot += amp;
        amp *= 0.5;
        f *= 2.03;
    }
    return v / tot;
}

// Distância até a borda da célula de Voronoi mais próxima (F2 - F1).
// Perto de 0 = em cima da fenda.
export function voronoiBorda(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
            const cx = xi + i, cy = yi + j;
            const px = cx + ihash(cx, cy * 3 + 1), py = cy + ihash(cx * 7 + 2, cy);
            const d = Math.hypot(px - x, py - y);
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
    }
    return f2 - f1;
}
