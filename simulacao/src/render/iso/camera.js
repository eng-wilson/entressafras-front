// Projeção isométrica 2D. Mundo: x e z no plano do talhão, y para cima (unidades do diorama).
// Tela em pixels CSS:
//   tela.x = ox + (x - z) * cos30 * escala
//   tela.y = oy + (x + z) * sin30 * escala - y * escala
// A projeção é afim, então qualquer plano do mundo vira uma transformação de canvas.

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

export function createCamera() {
    const cam = {
        escala: 100, ox: 0, oy: 0, dpr: 1,
        zoom: 1, escalaBase: 100,
        quarto: 0,
        girar(passos = 1) { cam.quarto = ((cam.quarto + passos) % 4 + 4) % 4; },
        orientar(x, z, inverso = false) {
            const q = inverso ? (4 - cam.quarto) % 4 : cam.quarto;
            return q === 1 ? [-z, x] : q === 2 ? [-x, -z] : q === 3 ? [z, -x] : [x, z];
        },

        proj(x, y, z) {
            [x, z] = cam.orientar(x, z);
            return [cam.ox + (x - z) * C30 * cam.escala, cam.oy + (x + z) * S30 * cam.escala - y * cam.escala];
        },

        // Vetores de tela de 1 unidade de mundo em cada eixo.
        eixoX() { const p = cam.proj(1, 0, 0); return [p[0] - cam.ox, p[1] - cam.oy]; },
        eixoZ() { const p = cam.proj(0, 0, 1); return [p[0] - cam.ox, p[1] - cam.oy]; },
        eixoY() { return [0, -cam.escala]; },

        // Ponto da tela -> mundo no plano horizontal y = y0.
        noPlanoY(sx, sy, y0 = 0) {
            const a = (sx - cam.ox) / (C30 * cam.escala);               // x - z
            const b = (sy - cam.oy + y0 * cam.escala) / (S30 * cam.escala); // x + z
            const [x, z] = cam.orientar((a + b) / 2, (b - a) / 2, true);
            return { x, z };
        },

        // Ponto da tela -> mundo no plano vertical x = x0 (retorna z e y).
        noPlanoX(sx, sy, x0) {
            const ex = cam.eixoX(), ez = cam.eixoZ();
            const z = (sx - cam.ox - x0 * ex[0]) / ez[0];
            const y = (cam.oy + x0 * ex[1] + z * ez[1] - sy) / cam.escala;
            return { z, y };
        },

        // Ponto da tela -> mundo no plano vertical z = z0 (retorna x e y).
        noPlanoZ(sx, sy, z0) {
            const ex = cam.eixoX(), ez = cam.eixoZ();
            const x = (sx - cam.ox - z0 * ez[0]) / ex[0];
            const y = (cam.oy + x * ex[1] + z0 * ez[1] - sy) / cam.escala;
            return { x, y };
        },

        // Aplica no contexto a transformação textura -> tela de um plano do mundo.
        // origem: ponto do mundo do pixel (0,0) da textura. colA / colB: deslocamento de tela por pixel da textura.
        aplicarPlano(ctx, origem, colA, colB) {
            const [ox, oy] = cam.proj(origem[0], origem[1], origem[2]);
            const d = cam.dpr;
            ctx.setTransform(colA[0] * d, colA[1] * d, colB[0] * d, colB[1] * d, ox * d, oy * d);
        },

        // Enquadra o diorama: largura e profundidade do topo, altura do bloco e altura máxima das plantas.
        enquadrar(largTela, altTela, { width, depth, totalH, alturaPlantas, folgaEsq = 0, preencher = false }) {
            const larguraMundo = (width + depth) * C30;
            const alturaMundo = (width + depth) * S30 + totalH + alturaPlantas;
            const util = largTela - folgaEsq;
            // Folga pequena: o talhão deve ocupar o espaço central, não flutuar num vazio.
            const ajustar = preencher ? Math.max : Math.min;
            cam.escalaBase = preencher
                ? ajustar(util / larguraMundo, altTela / alturaMundo)
                : ajustar(util / (larguraMundo * 1.05), altTela / (alturaMundo * 1.04));
            cam.escala = cam.escalaBase * cam.zoom;
            // Centro vertical: entre o topo das plantas no canto de trás e a quina de baixo da frente.
            const topo = -(width + depth) * S30 / 2 - alturaPlantas;
            const base = (width + depth) * S30 / 2 + totalH;
            cam.ox = folgaEsq + util / 2 + cam.panX;
            cam.oy = altTela / 2 - ((topo + base) / 2) * cam.escala + cam.panY;
        },

        panX: 0, panY: 0
    };
    return cam;
}
