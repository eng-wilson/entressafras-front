// Simulação das rotações num Web Worker (simulacao.worker.js), para a interface não travar enquanto uma
// rotação nova é simulada. Um worker para o app inteiro; pedidos iguais (mesma chave) compartilham a resposta.
import type { Normais, RespostasSolo, ResultadoRotacao, RotacaoSim } from './api'

export type PedidoSim = { rotacao: RotacaoSim; ano: number; classeId: string; respostas: RespostasSolo; normais: Normais }

type Resposta = { id: number; ok: true; resultado: ResultadoRotacao } | { id: number; ok: false; erro: string }

let worker: Worker | null = null
let proximo = 0
const pendentes = new Map<number, { ok: (r: ResultadoRotacao) => void; falha: (e: Error) => void }>()
// Resultados prontos (o slider lê sem esperar) e pedidos em andamento; poucas entradas, cada uma tem os
// retratos diários de duas safras (dezenas de MB).
const prontos = new Map<string, ResultadoRotacao>()
const andamento = new Map<string, Promise<ResultadoRotacao>>()
const MAX_PRONTOS = 6

function obterWorker(): Worker {
  if (worker) return worker
  if (typeof Worker === 'undefined') throw new Error('Web Worker indisponível')
  const w = new Worker(new URL('./simulacao.worker.js', import.meta.url), { type: 'module' })
  w.onmessage = ({ data }: MessageEvent<Resposta>) => {
    const p = pendentes.get(data.id)
    if (!p) return
    pendentes.delete(data.id)
    if (data.ok) p.ok(data.resultado)
    else p.falha(new Error(data.erro))
  }
  w.onerror = e => {
    // Worker quebrado (falha ao carregar o módulo): rejeita tudo e deixa o próximo pedido criar outro.
    for (const p of pendentes.values()) p.falha(new Error(e.message || 'Falha no worker da simulação'))
    pendentes.clear()
    w.terminate()
    worker = null
  }
  worker = w
  return w
}

/** Resultado já calculado para a chave, se houver: dispensa esperar o worker. */
export const simulado = (chave: string) => prontos.get(chave) ?? null

/** Simula a rotação no worker. A chave identifica o pedido (mesma chave = mesmo resultado). */
export function simular(chave: string, pedido: PedidoSim): Promise<ResultadoRotacao> {
  const pronto = prontos.get(chave)
  if (pronto) return Promise.resolve(pronto)
  const ja = andamento.get(chave)
  if (ja) return ja
  const p = new Promise<ResultadoRotacao>((ok, falha) => {
    const id = ++proximo
    pendentes.set(id, { ok, falha })
    try {
      obterWorker().postMessage({ id, ...pedido })
    } catch (e) {
      pendentes.delete(id)
      falha(e instanceof Error ? e : new Error(String(e)))
    }
  }).then(
    r => {
      andamento.delete(chave)
      if (prontos.size >= MAX_PRONTOS) prontos.delete(prontos.keys().next().value!)
      prontos.set(chave, r)
      return r
    },
    e => { andamento.delete(chave); throw e },
  )
  andamento.set(chave, p)
  return p
}
