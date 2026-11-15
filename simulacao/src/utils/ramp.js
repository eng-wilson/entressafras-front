// Rampa de cores do modo mapa (viridis simplificada), em JS e em CSS para a legenda.

const PARADAS = [[68, 1, 84], [58, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];

// t em 0..1 -> [r, g, b] em 0..255.
export function rampa(t) {
    t = Math.min(1, Math.max(0, t));
    const s = t * 4, i = Math.min(3, Math.floor(s)), f = s - i;
    const a = PARADAS[i], b = PARADAS[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
