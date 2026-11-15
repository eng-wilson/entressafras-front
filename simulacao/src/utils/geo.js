// Geometria do contorno do talhão em latitude e longitude (graus). Projeção equirretangular local em torno
// do centro do polígono: erro desprezível para talhões de até alguns quilômetros.
//   areaHa(contorno)     área em hectares
//   centroide(contorno)  centro de área { lat, lon }
// contorno: [[lat, lon], ...], sem repetir o primeiro ponto no fim.

const R = 6371008.8;   // raio médio da Terra, m
const RAD = Math.PI / 180;

function projetar(contorno) {
    const lat0 = contorno.reduce((a, p) => a + p[0], 0) / contorno.length;
    const lon0 = contorno.reduce((a, p) => a + p[1], 0) / contorno.length;
    const k = Math.cos(lat0 * RAD);
    return { lat0, lon0, k, pts: contorno.map(([la, lo]) => [R * (lo - lon0) * RAD * k, R * (la - lat0) * RAD]) };
}

function areaAssinada(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; }
    return a / 2;
}

export function areaHa(contorno) {
    if (!contorno || contorno.length < 3) return 0;
    return Math.abs(areaAssinada(projetar(contorno).pts)) / 1e4;
}

export function centroide(contorno) {
    if (!contorno?.length) return null;
    const { lat0, lon0, k, pts } = projetar(contorno);
    const A = areaAssinada(pts);
    if (pts.length < 3 || Math.abs(A) < 1e-6) return { lat: lat0, lon: lon0 };
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], f = x1 * y2 - x2 * y1;
        cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    }
    cx /= 6 * A; cy /= 6 * A;
    return { lat: lat0 + cy / R / RAD, lon: lon0 + cx / (R * k) / RAD };
}

export const fmtHa = ha => `≈ ${ha < 10 ? ha.toFixed(1).replace('.', ',') : Math.round(ha)} ha`;

// Distância aproximada em graus (para decidir se dois pontos caem na mesma célula do NASA POWER, ~0,5°).
export const distanciaGraus = (a, b) => Math.hypot(a.lat - b.lat, a.lon - b.lon);
