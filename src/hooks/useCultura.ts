import { useCallback, useEffect, useState } from 'react'
import type { EstadoCultura } from '../types'
import { REFERENCIAS_CULTURAS } from '../data/culturas'
import { apagarCultura, buscarCulturas, detalheCultura, guardarCultura, lerCultura } from '../services/culturas'

const CARREGANDO: EstadoCultura = { status: 'carregando', dados: null }
const SEM_REFERENCIA: EstadoCultura = { status: 'sem_referencia', dados: null }
export function useCultura(id: string | null): EstadoCultura & { recarregar: () => void } {
  const referencia = id ? REFERENCIAS_CULTURAS[id] : null
  const codigo = referencia?.codigo, especie = referencia?.especie
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<{ codigo?: number; tentativa: number; estado: EstadoCultura }>(() => {
    const dados = codigo ? lerCultura(codigo) : null
    return { codigo, tentativa: 0, estado: dados && dados.scientific_name === especie ? { status: 'ok', dados } : CARREGANDO }
  })
  useEffect(() => {
    if (!codigo || !especie) return
    const cache = lerCultura(codigo)
    if (cache && cache.scientific_name === especie) {
      setResposta({ codigo, tentativa, estado: { status: 'ok', dados: cache } })
      return
    }
    const ac = new AbortController()
    let ativo = true
    const timer = setTimeout(() => ac.abort(), 20_000)
    async function carregar() {
      const pagina = await buscarCulturas(especie!, ac.signal)
      if (!pagina.items.some(c => c.eco_port_code === codigo && c.scientific_name === especie)) {
        if (ativo && !ac.signal.aborted) setResposta({ codigo, tentativa, estado: SEM_REFERENCIA })
        return
      }
      const dados = await detalheCultura(codigo!, ac.signal)
      if (dados.scientific_name !== especie) throw new Error('Espécie divergente')
      if (!ativo || ac.signal.aborted) return
      guardarCultura(dados)
      setResposta({ codigo, tentativa, estado: { status: 'ok', dados } })
    }
    carregar().catch(() => {
      if (ativo) setResposta({ codigo, tentativa, estado: { status: 'erro', dados: null } })
    }).finally(() => clearTimeout(timer))
    return () => { ativo = false; clearTimeout(timer); ac.abort() }
  }, [codigo, especie, tentativa])
  const recarregar = useCallback(() => {
    if (codigo) apagarCultura(codigo)
    setTentativa(n => n + 1)
  }, [codigo])
  const estado = !codigo ? SEM_REFERENCIA : resposta.codigo === codigo && resposta.tentativa === tentativa ? resposta.estado : CARREGANDO
  return { ...estado, recarregar }
}
