// Uma prioridade como linha visual: ícone, nome, barra 0–100 na cor da faixa e a faixa em uma palavra.
// Usada no painel direito ("Prioridades na sua região") e, em escala menor, nos cards da comparação.
import { NOME_EIXO, type Eixo, type Faixa } from '../logic/aptidao'
import { t } from '../i18n'
import './barra-prioridade.css'

/** Mesmos ícones da lateral esquerda ("O que importa"). */
export const ICONE_EIXO: Record<Eixo, string> = { risco: 'i-shield', fat: 'm-coin', solo: 'i-leaf', prod: 'n-seed' }
/** Prioridade ilustrativa (a API não calcula): hoje nenhuma; as 4 vêm da API. */
export const ILUSTRATIVO: Record<Eixo, boolean> = { risco: false, fat: false, solo: false, prod: false }

/** Leitura completa para leitor de tela: "Resiliência climática: 70 de 100, ótima · ilustrativo". */
export function leituraPrioridade(k: Eixo, nota: number | null, f: Faixa | null): string {
  const leitura = nota == null || !f ? t('Sem dado') : t('{nota} de 100, {faixa}', { nota, faixa: t(f.rotulo).toLowerCase() })
  return `${t(NOME_EIXO[k])}: ${leitura}${ILUSTRATIVO[k] ? ` · ${t('ilustrativo')}` : ''}`
}

/** meter: a barra vira um medidor acessível; dentro de um botão (painel), o botão já leva a leitura e a barra se esconde. */
type Props = { k: Eixo; nota: number | null; f: Faixa | null; meter?: boolean }

/** Conteúdo da linha (o contêiner — botão no painel, item de lista no card — é de quem usa). */
export function BarraPrioridade({ k, nota, f, meter = true }: Props) {
  return (
    <>
      <span className={`bp-icone ${f?.cls ?? ''}`} aria-hidden="true">
        <svg className="ic"><use href={`/canvas-icons.svg#${ICONE_EIXO[k]}`} /></svg>
      </span>
      <span className="bp-copy">
        <span className="bp-nome">{t(NOME_EIXO[k])}</span>
        <span className={`bp-barra${ILUSTRATIVO[k] ? ' ilustrativo' : ''}`} {...(meter
          ? { role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': nota ?? undefined, 'aria-label': leituraPrioridade(k, nota, f) }
          : { 'aria-hidden': true })}>
          {nota != null && <i className={f?.cls} style={{ width: `${Math.max(4, nota)}%` }} />}
        </span>
      </span>
      <span className={`bp-faixa ${f?.cls ?? 'none'}`} aria-hidden="true">{f ? t(f.rotulo) : '—'}</span>
    </>
  )
}
