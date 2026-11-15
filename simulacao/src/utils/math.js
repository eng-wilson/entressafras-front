// Utilidades numéricas puras (sem DOM): rodam no browser e no Node.

export function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
}

export function smoothNoise(x, y, scale) {
    const sx = x / scale, sy = y / scale;
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    const fx = sx - x0, fy = sy - y0;
    const a = hash2(x0, y0), b = hash2(x0 + 1, y0);
    const c = hash2(x0, y0 + 1), e = hash2(x0 + 1, y0 + 1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + e * ux) * uy;
}

export function mix(c1, c2, t) {
    return [
        c1[0] + (c2[0] - c1[0]) * t,
        c1[1] + (c2[1] - c1[1]) * t,
        c1[2] + (c2[2] - c1[2]) * t
    ];
}

export function rgb(c) { return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`; }

export function clamp(x, a = 0, b = 1) { return Math.min(b, Math.max(a, x)); }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
}

// Interpolação linear em curva por pontos [[x, y], ...] ordenados por x.
export function curve(points, x) {
    if (x <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
        if (x <= points[i][0]) {
            const [x0, y0] = points[i - 1], [x1, y1] = points[i];
            return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
        }
    }
    return points[points.length - 1][1];
}

// PRNG determinístico: a mesma semente sempre gera a mesma lavoura.
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
