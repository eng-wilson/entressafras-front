// Rotações do agricultor salvas no navegador, por talhão. Elas voltam para a API em `custom_rotations`
// (POST /api/rotations/recommendations), que as ranqueia junto com as recomendadas: nada fica no servidor.
// A API aceita até 3 por pedido (L14 em fieldshift-nova-rotacao/LACUNAS-SIMULATE.md).
import type { CustomCropInput } from '../types'

export const CHAVE_SALVAS = 'entressafras.rotacoesSalvas.v1'
export const MAX_SALVAS = 3

export type RotacaoSalva = {
  id: string
  /** Ano agrícola (início da safra) das datas. */
  ano: number
  /** Quando foi salva (ms): desempate entre salvas de mesmo rank, a mais antiga primeiro. */
  em: number
  /** 1 cultura (seguida de pousio até 31/ago) ou 2. */
  culturas: Required<CustomCropInput>[]
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
function valida(x: unknown): x is RotacaoSalva {
  const r = x as RotacaoSalva
  return !!r && typeof r.id === 'string' && Number.isInteger(r.ano) && Number.isFinite(r.em)
    && Array.isArray(r.culturas) && r.culturas.length >= 1 && r.culturas.length <= 2
    && r.culturas.every(c => !!c && Number.isInteger(c.code) && DATA.test(c.planting_date) && DATA.test(c.harvest_date))
}

function tabela(): Record<string, RotacaoSalva[]> {
  try {
    const t: unknown = JSON.parse(localStorage.getItem(CHAVE_SALVAS) ?? '{}')
    return t && typeof t === 'object' && !Array.isArray(t) ? (t as Record<string, RotacaoSalva[]>) : {}
  } catch {
    return {}
  }
}
function gravar(t: Record<string, RotacaoSalva[]>) {
  try { localStorage.setItem(CHAVE_SALVAS, JSON.stringify(t)) } catch { /* Sem armazenamento: vale só nesta sessão. */ }
}

/** Salvas do talhão no ano agrícola, da mais antiga para a mais nova. */
export function lerSalvas(talhao: string, ano: number): RotacaoSalva[] {
  const lista = tabela()[talhao]
  return Array.isArray(lista) ? lista.filter(valida).filter(r => r.ano === ano).sort((a, b) => a.em - b.em) : []
}

const novoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s${Date.now()}`)

/** Guarda a rotação; null quando o talhão já tem MAX_SALVAS no ano. */
export function guardarSalva(talhao: string, ano: number, culturas: RotacaoSalva['culturas'], agora = Date.now()): RotacaoSalva | null {
  const t = tabela()
  const todas = (Array.isArray(t[talhao]) ? t[talhao] : []).filter(valida)
  if (todas.filter(r => r.ano === ano).length >= MAX_SALVAS) return null
  const salva: RotacaoSalva = { id: novoId(), ano, em: agora, culturas }
  gravar({ ...t, [talhao]: [...todas, salva] })
  return salva
}

export function removerSalva(talhao: string, id: string) {
  const t = tabela()
  if (!Array.isArray(t[talhao])) return
  gravar({ ...t, [talhao]: t[talhao].filter(r => r?.id !== id) })
}

/** Ano agrícola da próxima safra, como o backend (sem agricultural_year): antes de 1º/set, o ano corrente. */
export const proximoAnoAgricola = (hoje = new Date()) => (hoje.getMonth() < 8 ? hoje.getFullYear() : hoje.getFullYear() + 1)
