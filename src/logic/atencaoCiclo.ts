import type { SafraDef } from '../data/mock'
import type { ResultadoRotacao } from '../sim/api'
import { quadroDoDecendio } from './talhaoSim'
import { janelaLabel } from './periodo'

export type QuadroAgua = {
  idx: number; safra: number; cultura: string; fase: string; dia: number
  atendimento: number | null; sensivel: boolean
  estado: 'good' | 'warn' | 'risk' | 'none'
}
export type MomentoAtencao = {
  de: number; ate: number; safra: number; cultura: string; fase: string
  estado: 'warn' | 'risk'; sensivel: boolean; menorAtendimento: number
  reacao: string; acao: string
}
export type PanoramaCiclo = { quadros: QuadroAgua[]; momentos: MomentoAtencao[] }

/** Limiares de apresentação do widget existente, não níveis de risco ZARC. */
export const estadoAgua = (v: number | null): QuadroAgua['estado'] =>
  v == null ? 'none' : v < .45 ? 'risk' : v < .55 ? 'warn' : 'good'

/** Lê exatamente o dia que a cena mostra em cada posição do calendário. Não
 * recalcula risco da API, nem transforma um cenário sintético em frequência.
 * As janelas do desenho esticam o ciclo do modelo: cada ponto é um quadro
 * representativo, não a média de todos os dias daquele decêndio. */
export function atencaoCiclo(resultado: ResultadoRotacao, defs: SafraDef[]): PanoramaCiclo {
  const quadros: QuadroAgua[] = Array.from({ length: 36 }, (_, idx) => {
    const n = defs.findIndex(s => idx >= s.de && idx <= s.ate)
    const base = { idx, safra: n, cultura: n >= 0 ? defs[n].nome : '', fase: '', dia: 0, atendimento: null, sensivel: false, estado: 'none' as const }
    if (n < 0) return base
    const safra = resultado.safras.find(s => s.posicao === n && s.ciclo === 1)
    // O desenho pode recorrer ao milho para uma cultura sem modelo próprio.
    // Essa reserva visual não permite inferir a resposta da cultura verdadeira.
    if (!safra || safra.cultura !== defs[n].ref) return base
    const dia = Math.round(quadroDoDecendio(defs, idx).fracao * safra.cicloDias)
    const d = safra.serie?.find(d => d.dia === dia)
    if (!d) return { ...base, dia }
    const v = Number.isFinite(d.etc) && d.etc > 0 && Number.isFinite(d.eta) && d.eta >= 0 ? Math.min(1, d.eta / d.etc) : null
    return { ...base, dia, fase: d.faseNome, atendimento: v, sensivel: d.sens[0] >= .8, estado: estadoAgua(v) }
  })
  const momentos: MomentoAtencao[] = []
  for (const q of quadros) {
    if (q.atendimento == null || (q.estado !== 'warn' && q.estado !== 'risk')) continue
    const anterior = momentos.at(-1)
    if (anterior && anterior.ate === q.idx - 1 && anterior.safra === q.safra && anterior.fase === q.fase && anterior.estado === q.estado && anterior.sensivel === q.sensivel) {
      anterior.ate = q.idx
      anterior.menorAtendimento = Math.min(anterior.menorAtendimento, q.atendimento)
      continue
    }
    const maturacao = /matura|colheita/i.test(q.fase)
    momentos.push({
      de: q.idx, ate: q.idx, safra: q.safra, cultura: q.cultura, fase: q.fase,
      estado: q.estado, sensivel: q.sensivel, menorAtendimento: q.atendimento,
      reacao: q.sensivel ? 'Alta sensibilidade à falta de água nesta fase do modelo.' : 'Restrição de água em fase de menor sensibilidade no modelo; não implica a mesma resposta da floração.',
      acao: maturacao ? 'Confirme a maturidade no campo antes de alterar o manejo de água.' : 'Confira a água na zona das raízes. Se houver irrigação, avalie a necessidade com assistência técnica; o modelo não define lâmina nem momento de aplicação.',
    })
  }
  return { quadros, momentos }
}

export const periodoMomento = (m: MomentoAtencao) => janelaLabel(m.de, m.ate)
