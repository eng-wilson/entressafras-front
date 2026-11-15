// Estágios fenológicos de qualquer rotação, a partir das janelas das safras (SafraDef).
// Reproduz a régua de STAGES (escrita à mão para a rotação atual): semeadura no 1º decêndio, emergência no 2º,
// crescimento, floração, enchimento e maturação em 30/20/30/20% do miolo, colheita no último decêndio;
// depois da última colheita, 3 decêndios de palhada e então pousio. Ilustrativo, como STAGES.
import type { SafraDef, Stage, StageKey } from '../data/mock'
import type { CulturaRef } from '../data/fases'
import { faseNoCiclo } from './resiliencia'

/** Planta dos indicadores: só há soja e milho; as outras gramíneas usam o do milho, as demais o da soja. */
const DESENHO: Record<CulturaRef, 'soja' | 'milho'> = { soja: 'soja', milho: 'milho', sorgo: 'milho', milheto: 'milho', algodao: 'soja' }

const MIOLO: [StageKey, string, number][] = [
  ['veg', 'Crescimento', 0.3],
  ['flor', 'Floração', 0.5],
  ['ench', 'Enchimento de grãos', 0.8],
  ['mat', 'Pronta para colher', 1],
]

export function estagios(safras: SafraDef[]): Stage[] {
  const out: Stage[] = []
  const vazio = (k: StageKey, name: string, from: number, to: number) => {
    if (from <= to) out.push({ crop: null, k, name, from, to })
  }
  let i = 0
  safras.forEach(s => {
    const crop = DESENHO[s.ref as CulturaRef] ?? 'soja'
    const base = { crop, ref: s.ref, cultura: s.nome }
    if (s.de > i) {
      // Antes da 1ª safra: pousio e, no decêndio anterior ao plantio, solo pronto. Entre safras: palhada.
      const antes = out.length === 0
      vazio(antes ? 'bare' : 'straw', antes ? 'Pousio' : 'Palhada', i, s.de - 2)
      vazio(antes ? 'ready' : 'straw', antes ? 'Solo pronto para o plantio' : 'Palhada', Math.max(i, s.de - 1), s.de - 1)
    }
    out.push({ ...base, k: 'seed', name: 'Semeadura', from: s.de, to: s.de })
    out.push({ ...base, k: 'emerg', name: 'Germinação e emergência', from: s.de + 1, to: s.de + 1 })
    const nome = (k: StageKey, name: string) => (k === 'mat' && crop === 'milho' ? 'Pronto para colher' : name)
    if (s.fases) {
      // Estágios FAO-56 da API: crescimento até o fim da fase II, floração e enchimento dividem a III, maturação na IV.
      // Assim o estágio desenhado bate com a fase crítica que a API aponta.
      const n = s.ate - s.de + 1
      const fase = (i: number) => faseNoCiclo((i - s.de + 0.5) / n, s.fases)
      const tres = Array.from({ length: n }, (_, j) => s.de + j).filter(i => fase(i) === 2)
      const meio = tres.length ? tres[0] + Math.ceil(tres.length / 2) : Infinity
      const chave = (i: number): StageKey => (fase(i) <= 1 ? 'veg' : fase(i) === 2 ? (i < meio ? 'flor' : 'ench') : 'mat')
      const nomes: Record<string, string> = Object.fromEntries(MIOLO.map(([k, nm]) => [k, nm]))
      for (let i = s.de + 2; i < s.ate; i++) {
        const k = chave(i)
        const ult = out[out.length - 1]
        if (ult.k === k && ult.cultura === s.nome && ult.to === i - 1) ult.to = i
        else out.push({ ...base, k, name: nome(k, nomes[k]), from: i, to: i })
      }
    } else {
      const ini = s.de + 2
      const m = s.ate - ini
      let a = ini
      for (const [k, name, fim] of MIOLO) {
        const b = ini + Math.round(m * fim) - 1
        if (b >= a) out.push({ ...base, k, name: nome(k, name), from: a, to: b })
        a = Math.max(a, b + 1)
      }
    }
    out.push({ ...base, k: 'straw', name: 'Colheita', from: s.ate, to: s.ate })
    i = s.ate + 1
  })
  vazio('straw', 'Palhada', i, Math.min(35, i + 2))
  vazio('bare', 'Pousio', i + 3, 35)
  return out
}

/** Estágio no decêndio `idx` (0–35). */
export const estagioEm = (lista: Stage[], idx: number): Stage =>
  lista.find(x => idx >= x.from && idx <= x.to) ?? lista[lista.length - 1]
