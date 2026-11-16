// Atenção no ciclo e "Água para a cultura": atendimento à demanda de água (ETa/ETc) da cultura em cada fase, como
// a API o entrega (`risk.mean_isna`: ΣETr/ΣETc por estágio FAO-56, média das safras históricas do balanço da API).
//
// Regra do projeto: a API resolve o atendimento por fase, então o front não o calcula. A versão anterior lia a série
// diária da simulação local (clima sintético); ela saiu destes indicadores e segue só no desenho da cena.
// A API não entrega série diária nem por decêndio: dentro de uma fase, o valor é o mesmo em todos os decêndios.
import type { SafraDef } from '../data/mock'
import { NOME_FASE } from '../data/fases'
import type { Fase, ResRotacao } from './resiliencia'
import { janelaLabel } from './periodo'
import { t } from '../i18n'

export type QuadroAgua = {
  idx: number; safra: number; cultura: string
  /** Fase (I a IV) pelos estágios da API; null fora das safras. */
  fase: Fase | null
  nomeFase: string
  /** ISNA médio da fase (0–1), da API; null sem risco na resposta ou fora das safras. */
  atendimento: number | null
  /** Ky da fase ≥ 1 (API): a produção cai proporcionalmente mais que o déficit de água. */
  sensivel: boolean
  /** É a fase de maior déficit apontada pela API (`critical_stage`). */
  critica: boolean
  estado: 'good' | 'warn' | 'risk' | 'none'
}
export type MomentoAtencao = {
  de: number; ate: number; safra: number; cultura: string; fase: Fase; nomeFase: string
  estado: 'warn' | 'risk'; sensivel: boolean; critica: boolean
  /** ISNA médio da fase, da API. */
  menorAtendimento: number
  reacao: string; acao: string
}
export type PanoramaCiclo = {
  quadros: QuadroAgua[]
  momentos: MomentoAtencao[]
  /** Alguma safra com risco marcado MOCK pelo servidor. */
  provisorio: boolean
}

/** Limiares de apresentação (os mesmos do widget), não níveis oficiais de manejo. */
export const estadoAgua = (v: number | null): QuadroAgua['estado'] =>
  v == null ? 'none' : v < 0.45 ? 'risk' : v < 0.55 ? 'warn' : 'good'

/** Ky a partir do qual a fase é tratada como de alta sensibilidade (FAO-33: Ky > 1, queda mais que proporcional). */
export const KY_SENSIVEL = 1

export function atencaoCiclo(rot: ResRotacao | null, defs: SafraDef[]): PanoramaCiclo {
  const quadros: QuadroAgua[] = Array.from({ length: 36 }, (_, idx) => {
    const n = defs.findIndex(s => idx >= s.de && idx <= s.ate)
    const base: QuadroAgua = {
      idx, safra: n, cultura: n >= 0 ? defs[n].nome : '', fase: null, nomeFase: '',
      atendimento: null, sensivel: false, critica: false, estado: 'none',
    }
    const s = n >= 0 ? rot?.safras[n] : undefined
    const d = s?.calc.decendios.find(x => x.idx === idx)
    if (!s || !d) return base
    const f = d.fase
    const v = s.risco?.isna[f] ?? null
    const ky = defs[n].ky?.[f] ?? null
    return {
      ...base, fase: f, nomeFase: NOME_FASE[f],
      atendimento: v == null ? null : Math.max(0, Math.min(1, v)),
      sensivel: ky != null && ky >= KY_SENSIVEL,
      critica: s.risco?.fase === f,
      estado: estadoAgua(v),
    }
  })
  const momentos: MomentoAtencao[] = []
  for (const q of quadros) {
    if (q.atendimento == null || q.fase == null || (q.estado !== 'warn' && q.estado !== 'risk')) continue
    const anterior = momentos.at(-1)
    if (anterior && anterior.ate === q.idx - 1 && anterior.safra === q.safra && anterior.fase === q.fase) {
      anterior.ate = q.idx
      continue
    }
    const maturacao = q.fase === 3
    momentos.push({
      de: q.idx, ate: q.idx, safra: q.safra, cultura: q.cultura, fase: q.fase, nomeFase: q.nomeFase,
      estado: q.estado, sensivel: q.sensivel, critica: q.critica, menorAtendimento: q.atendimento,
      reacao: q.sensivel
        ? t('Fase sensível à falta de água para esta cultura (Ky ≥ 1): a produção tende a cair mais que o déficit.')
        : t('Restrição de água em fase de menor sensibilidade (Ky < 1); não implica a mesma resposta da floração.'),
      acao: maturacao
        ? t('Confirme a maturidade no campo antes de alterar o manejo de água.')
        : t('Confira a água na zona das raízes. Se houver irrigação, avalie a necessidade com assistência técnica; o índice não define lâmina nem momento de aplicação.'),
    })
  }
  const provisorio = !!rot?.safras.some(s => s.risco?.metodo === 'MOCK')
  return { quadros, momentos, provisorio }
}

export const periodoMomento = (m: MomentoAtencao) => janelaLabel(m.de, m.ate)
