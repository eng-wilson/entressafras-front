// Talhões salvos no navegador. Diferente do protótipo entressafras, guarda também texturaInformada,
// texturaPeloLaudo e centro, que se perdiam ao recarregar.
import type { EstadoTalhoes, Talhao } from '../types'

export const CHAVE = 'entressafras.talhoes.v1'
const VAZIO: EstadoTalhoes = { talhoes: [], ativo: null }

const CAMPOS: (keyof Talhao)[] = [
  'id', 'nome', 'contorno', 'areaHa', 'centro', 'local', 'textura', 'texturaInformada',
  'texturaPeloLaudo', 'analise', 'classe', 'historico',
]

function valido(t: unknown): t is Talhao {
  const x = t as Talhao
  return !!x && typeof x.id === 'string' && typeof x.nome === 'string' && Array.isArray(x.contorno)
    && typeof x.areaHa === 'number' && !!x.centro
}

export function carregar(): EstadoTalhoes {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return VAZIO
    const e = JSON.parse(bruto) as Partial<EstadoTalhoes>
    const talhoes = Array.isArray(e.talhoes) ? e.talhoes.filter(valido) : []
    const ativo = talhoes.some(t => t.id === e.ativo) ? e.ativo! : talhoes[0]?.id ?? null
    return { talhoes, ativo }
  } catch {
    return VAZIO
  }
}

export function salvar(estado: EstadoTalhoes): void {
  try {
    const talhoes = estado.talhoes.map(t => Object.fromEntries(CAMPOS.filter(k => t[k] !== undefined).map(k => [k, t[k]])))
    localStorage.setItem(CHAVE, JSON.stringify({ talhoes, ativo: estado.ativo }))
  } catch {
    // Armazenamento indisponível (aba privada, cota): o app segue na memória.
  }
}
