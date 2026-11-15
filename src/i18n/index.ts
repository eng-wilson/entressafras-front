// Idiomas do app: português (o texto-fonte) e inglês.
//
// Regra: o texto em português no código É a chave. `t('Posição no ranking')` devolve o próprio texto em
// português ou a tradução de en/*.ts em inglês. Variáveis entram como {nome}: `t('{n} rotações', { n: 3 })`.
// Nunca montar a chave com template literal (`t(`${a} b`)`): a checagem (npm run i18n) não acha a tradução.
//
// Nunca chamar t() no topo de um módulo: o valor ficaria preso ao idioma do carregamento. Chamar na hora de
// exibir (render, função). Trocar o idioma remonta o app inteiro (main.tsx), então tudo é recalculado.
import { EN } from './en'

export type Idioma = 'pt' | 'en'
const CHAVE = 'entressafras.idioma'

let atual: Idioma = 'pt'

export const idioma = (): Idioma => atual

/** Idioma salvo; senão, o do navegador (português → pt, qualquer outro → en). */
export function idiomaInicial(): Idioma {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'pt' || salvo === 'en') return salvo
  } catch { /* sem armazenamento: segue pelo navegador */ }
  const nav = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : 'pt'
  return /^pt\b/i.test(nav ?? '') ? 'pt' : 'en'
}

export function definirIdioma(i: Idioma, salvar = false) {
  atual = i
  if (typeof document !== 'undefined') document.documentElement.lang = i === 'en' ? 'en' : 'pt-BR'
  if (salvar) try { localStorage.setItem(CHAVE, i) } catch { /* sem armazenamento */ }
}

type Vars = Record<string, string | number | null | undefined>

/** Texto no idioma atual. A chave é o texto em português; {nome} recebe `vars.nome`. */
export function t(pt: string, vars?: Vars): string {
  const base = atual === 'en' ? EN[pt] ?? pt : pt
  return vars ? base.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] == null ? m : String(vars[k]))) : base
}

/** Locale dos números e datas: pt-BR ou en-US. */
export const locale = () => (atual === 'en' ? 'en-US' : 'pt-BR')

/** Número formatado no idioma atual (vírgula decimal em pt, ponto em en). */
export const numero = (v: number, opcoes: Intl.NumberFormatOptions = {}) => new Intl.NumberFormat(locale(), opcoes).format(v)

/** Porcentagem da API no idioma da tela (até 1 casa): 13,3 / 13.3; o sinal % fica no texto. */
export const pctFmt = (v: number) => numero(v, { maximumFractionDigits: 1 })

/** Reais formatados no idioma atual: "R$ 1.235" / "R$1,235". */
export const reaisFmt = (v: number, casas = 0) =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: 'BRL', maximumFractionDigits: casas, minimumFractionDigits: casas }).format(v)

/** Dólares formatados no idioma atual: "US$ 5.876" / "$5,876". */
export const usdFmt = (v: number, casas = 0) =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', maximumFractionDigits: casas, minimumFractionDigits: casas }).format(v)

/** Ordinal: pt "1ª"/"1º" (genero f/m), en "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number, genero: 'f' | 'm' = 'f'): string {
  if (atual === 'pt') return `${n}${genero === 'f' ? 'ª' : 'º'}`
  const r10 = n % 10, r100 = n % 100
  const suf = r10 === 1 && r100 !== 11 ? 'st' : r10 === 2 && r100 !== 12 ? 'nd' : r10 === 3 && r100 !== 13 ? 'rd' : 'th'
  return `${n}${suf}`
}
