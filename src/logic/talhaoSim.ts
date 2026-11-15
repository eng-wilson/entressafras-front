// Do que o app sabe (rotação em decêndios, clima por decêndio, solo do talhão) para as entradas da simulação
// portátil de /simulacao, e do decêndio simulado para a safra e o dia que o talhão mostra.
// Puro: sem DOM. A cena em si fica em components/IsoField.tsx.
import type { SafraDef } from '../data/mock'
import type { ZarcId } from '../data/zarc'
import type { Decendio, Ponto } from '../types'
import type { Normais, RotacaoSim, SafraSim } from '../sim/api'
import { CULTURAS, NORMAIS, radiacaoExtraterrestre } from '../sim/api.js'
import { mesDe, decendioDoMes } from './periodo'

/** Milho de segunda safra (portarias do ZARC de safrinha): produtividade de referência menor. */
const SAFRINHA: (ZarcId | null)[] = ['milho2', 'milhoBraquiaria']
/** Cultura sem modelo na simulação: desenha como gramínea genérica (o milho), como em logic/estagios.ts. */
const CULTURA_RESERVA = 'milho'

/** Uma safra do app na simulação: a cultura pelo id do catálogo; o consórcio entra como companheira. */
function safraSim(s: SafraDef): Omit<SafraSim, 'plantio'> {
  const cultura = s.ref in CULTURAS ? s.ref : CULTURA_RESERVA
  return {
    cultura,
    ...(s.companheira && s.companheira in CULTURAS ? { companheira: s.companheira } : {}),
    ...(cultura === 'milho' && SAFRINHA.includes(s.zarc) ? { potencial: 130 } : {}),
  }
}

/** Plantio 'MM-DD' no meio do 1º terço do decêndio de semeadura (idx 0 = 1–10 set → 09-05). */
export function plantioDoDecendio(idx: number): string {
  const mes = (mesDe(idx) + 8) % 12 + 1
  const dia = decendioDoMes(idx) * 10 + 5
  return `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Rotação do app (janelas de SAFRAS) no formato de simulateRotacao. */
export function rotacaoSim(rot: number, safras: SafraDef[]): RotacaoSim {
  return {
    id: `rot${rot}`,
    nome: safras.map(s => s.nome).join(' → '),
    safras: safras.map(s => ({ ...safraSim(s), nome: s.nome, plantio: plantioDoDecendio(s.de) })),
  }
}

/**
 * Safra da rotação e fração do ciclo (0 = plantio, 1 = colheita) que o talhão mostra no decêndio.
 * Dentro de uma janela, o ciclo da simulação é esticado sobre os decêndios da janela, para o desenho
 * acompanhar o estágio do calendário (logic/estagios.ts). Antes de uma safra (pousio, palhada entre safras),
 * mostra o plantio dela: dia 0, já com a palhada e o solo herdados da anterior (antes da emergência: sem planta).
 * Depois da última colheita, fica no fim do ciclo da última safra (o plantio seguinte só vem na primavera, com
 * outro clima), mas COLHIDO: a cena desenha o solo sem nenhuma planta. Pousio nunca mostra cultura de pé.
 */
export function quadroDoDecendio(safras: SafraDef[], idx: number): { posicao: number; fracao: number; colhido?: boolean } {
  const i = safras.findIndex(s => idx >= s.de && idx <= s.ate)
  if (i >= 0) {
    const s = safras[i]
    return { posicao: i, fracao: s.ate > s.de ? (idx - s.de) / (s.ate - s.de) : 0 }
  }
  const prox = safras.findIndex(s => s.de > idx)
  return prox >= 0 ? { posicao: prox, fracao: 0 } : { posicao: safras.length - 1, fracao: 1, colhido: true }
}

const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const media = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null)
  return v.length === xs.length && v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/**
 * Normais mensais do talhão a partir do clima por decêndio (média das safras do NASA POWER).
 * Mês sem os três decêndios completos fica com a normal do Cerrado goiano. A radiação no topo da
 * atmosfera sai da latitude (FAO-56), no dia 15 de cada mês.
 */
export function normaisDoClima(decendios: Decendio[] | null, ponto: Ponto | null): Normais {
  const base = NORMAIS.cerrado_go
  if (!decendios || !ponto) return base
  const chuva = [...base.chuva], tmax = [...base.tmax], tmin = [...base.tmin]
  for (let m = 0; m < 12; m++) {
    // m: mês do app (0 = setembro); c: mês do calendário (0 = janeiro).
    const c = (m + 8) % 12
    const ds = [0, 1, 2].map(k => decendios[3 * m + k]).filter(Boolean)
    if (ds.length !== 3) continue
    const ch = ds.map(d => d.chuva_media)
    if (ch.every(x => x !== null)) chuva[c] = (ch as number[]).reduce((a, b) => a + b, 0)
    tmax[c] = media(ds.map(d => d.tmax_media)) ?? tmax[c]
    tmin[c] = media(ds.map(d => d.tmin_media)) ?? tmin[c]
  }
  let dia = 0
  const ra = DIAS_MES.map(n => {
    const r = radiacaoExtraterrestre(ponto.lat, dia + 15) * 0.408   // MJ/m²/dia → mm/dia
    dia += n
    return r
  })
  return { nome: `Clima do talhão (${ponto.lat.toFixed(2)}, ${ponto.lon.toFixed(2)})`, chuva, tmax, tmin, ra }
}

/** Chave estável das normais: entra no cache da cena. */
export const chaveNormais = (n: Normais) =>
  [n.nome, ...n.chuva, ...n.tmax, ...n.tmin].map(x => (typeof x === 'number' ? x.toFixed(1) : x)).join('|')
