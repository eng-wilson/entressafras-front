// Conjunto de sprites de uma cultura: uma imagem por fase notável, postura, estado da espiga e variante.
// Fonte: arte final em assets/sprites/<cultura>/ quando existir (manifest.json), senão o pintor
// procedural do arquétipo. Os sprites são gerados sob demanda e guardados em memória.
import { pintarGramineaColmo } from './painters/graminea-colmo.js';
import { pintarGramineaTouceira } from './painters/graminea-touceira.js';
import { pintarLeguminosa } from './painters/leguminosa.js';
import { pintarLeguminosaBaixa } from './painters/leguminosa-baixa.js';
import { spriteDeImagens, adaptarArte } from './mask.js';

const PINTORES = {
    graminea_colmo: pintarGramineaColmo,
    graminea_touceira: pintarGramineaTouceira,
    soja: pintarLeguminosaBaixa,
    leguminosa_baixa: pintarLeguminosa,
    leguminosa_arbustiva: pintarLeguminosa,
    malvacea: pintarLeguminosa
};

export const POSTURAS = ['normal', 'enrolada', 'murcha'];
export const ESPIGAS = ['cheia', 'parcial', 'abortada'];
export const VARIANTES = 3;

const temReprodutivo = f => f.espiga || f.vagem || f.fruto || f.capulho || f.inflorescencia;

export function nomeSprite(crop, faseIdx, postura, espiga, variante) {
    const f = crop.sprites.fases[faseIdx];
    const esp = temReprodutivo(f) ? '_' + ESPIGAS[espiga] : '';
    return `${f.id}_${POSTURAS[postura]}${esp}_${variante}`;
}

export function createSpriteSet(crop) {
    const pintor = PINTORES[crop.sprites.pintor];
    if (!pintor) throw new Error(`Sem pintor para o arquétipo "${crop.sprites.pintor}"`);
    const gerados = new Map();
    const arte = new Map();   // nome -> sprite carregado de PNG

    // Sprite já disponível (arte ou gerado), sem gerar nada. null se ainda não existe.
    function existente(faseIdx, postura, espiga, variante) {
        if (!temReprodutivo(crop.sprites.fases[faseIdx])) espiga = 0;
        const nome = nomeSprite(crop, faseIdx, postura, espiga, variante);
        return arte.get(nome) || gerados.get(nome) || null;
    }

    function obter(faseIdx, postura, espiga, variante) {
        const f = crop.sprites.fases[faseIdx];
        if (!temReprodutivo(f)) espiga = 0;
        const nome = nomeSprite(crop, faseIdx, postura, espiga, variante);
        let s = arte.get(nome) || gerados.get(nome);
        if (!s) {
            const base = crop.sprites.adaptarArte && arte.get(nomeSprite(crop, faseIdx, 0, 0, variante));
            s = base ? adaptarArte(base, { postura, espiga: temReprodutivo(f) ? espiga : 0 })
                : pintor(crop, faseIdx, { postura, espiga, variante });
            s.chave = base ? 'arte:' + nome : nome;
            s.faseIdx = faseIdx;
            gerados.set(nome, s);
        }
        return s;
    }

    // Carrega a arte final listada em assets/sprites/<id>/manifest.json:
    //   { "sprites": { "<nome>": { "cor": "x.png", "dados": "x.dados.png", "ancora": [x, y] } } }
    // Sem manifesto, segue só com o procedural.
    async function carregarArte(base = new URL('../../../assets/sprites/', import.meta.url).href) {
        const pasta = `${base}${crop.id}/`;
        let man;
        try {
            const r = await fetch(pasta + 'manifest.json');
            if (!r.ok) return 0;
            man = await r.json();
        } catch { return 0; }
        const img = src => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = pasta + src; });
        // Várias combinações de postura/variante podem reutilizar a mesma arte-base.
        // Mantém um único canvas e um único par de arrays por PNG, alterando apenas
        // os metadados específicos da fase em cada entrada do manifesto.
        const bases = new Map();
        let n = 0;
        for (const [nome, m] of Object.entries(man.sprites || {})) {
            try {
                const faseId = nome.split('_')[0];
                const faseIdx = crop.sprites.fases.findIndex(f => f.id === faseId);
                const f = crop.sprites.fases[faseIdx];
                const res = m.resolucao ?? crop.sprites.resolucao;
                const chaveBase = `${m.cor}|${m.dados}`;
                let baseSprite = bases.get(chaveBase);
                if (!baseSprite) {
                    const [c, d] = await Promise.all([img(m.cor), img(m.dados)]);
                    // Gramíneas não têm órgão branco: o branco que sobrar dentro da arte é fundo preso.
                    baseSprite = spriteDeImagens(c, d, { ancora: m.ancora, res, maturacao: 0, semBranco: crop.archetype?.startsWith('graminea') });
                    bases.set(chaveBase, baseSprite);
                }
                const s = { ...baseSprite, ancora: m.ancora, res, maturacao: f?.maturacao ?? 0 };
                s.chave = 'arte:' + nome;
                s.faseIdx = faseIdx;
                arte.set(nome, s);
                n++;
            } catch { /* imagem ausente: fica o procedural */ }
        }
        // Sprites provisórios podem ter sido gerados antes de os PNGs chegarem.
        // Recria as combinações adaptáveis com a arte no próximo pedido.
        if (n && crop.sprites.adaptarArte) gerados.clear();
        return n;
    }

    return { obter, existente, carregarArte, get total() { return gerados.size + arte.size; } };
}
