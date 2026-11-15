import { useEffect, useMemo, useRef, useState } from 'react'
import type { Normais, RespostasSolo, ResultadoRotacao, RotacaoSim } from '../sim/api'
import { CLASSES_SOLO, fonteSintetica, soloLocal } from '../sim/api.js'
import { montarCena, type Cena } from '../sim/cena'
import { simulado, simular } from '../sim/motor'
import { chaveNormais } from '../logic/talhaoSim'
import { useConjunto } from '../state/conjunto'

// Cor da etiqueta por estágio (a amostra ao lado do nome da cultura).
const FILL: Record<string, string> = {
  bare: '#C8A37A', ready: '#A9825A', seed: '#B08860', emerg: '#B08860', veg: '#A89464',
  flor: '#6E8F48', ench: '#5E8A3E', mat: '#BFA25A', straw: '#D9C27A',
}

/** Entradas da simulação portátil (/simulacao) para o talhão; null = ainda esperando o clima. */
export type EntradaSim = {
  rotacao: RotacaoSim
  /** Safra da rotação (índice) e fração do ciclo mostrada (0 = plantio, 1 = colheita). */
  posicao: number
  fracao: number
  /** Pousio depois da última colheita: a cena mostra o solo sem planta (nunca a cultura de pé). */
  colhido?: boolean
  classeId: string
  respostas: RespostasSolo
  normais: Normais
}

type Props = {
  /** Nome da cultura na etiqueta; ausente fora das safras. */
  cropName?: string
  stageKey: string
  stageName: string
  periodLabel: string
  sim: EntradaSim | null
  /** Cena escondida (modo Comparação): continua montada, sem desenhar. */
  pausado?: boolean
  /** Decêndio dentro de um período crítico: nível, motivo curto e o problema que pode acontecer. */
  alerta?: { cls: 'good' | 'warn' | 'risk'; rotulo: string; texto: string } | null
}


/** Pausa na navegação (ms) antes de aplicar o dia; e o intervalo máximo entre aplicações numa varredura longa. */
const ESPERA = 140
const ESPERA_MAX = 700

export function IsoField({ cropName, stageKey, stageName, periodLabel, sim, pausado = false, alerta = null }: Props) {
  const fill = FILL[stageKey] ?? FILL.bare
  const pill = cropName
    ? cropName + ' · ' + stageName.toLowerCase()
    : (stageKey === 'ready' ? 'Pronto para o plantio' : stageName)

  const host = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const [estado, setEstado] = useState<'preparando' | 'simulando' | 'pronta' | 'erro'>('preparando')

  // A cena vive enquanto o componente estiver montado: guarda o cache das simulações e dos sprites.
  useEffect(() => () => { cena.current?.destruir(); cena.current = null }, [])
  useEffect(() => { cena.current?.pausar(pausado) }, [pausado])

  // Com a cena pronta, cria no tempo ocioso as cenas das outras culturas da rotação (uma por vez): cruzar
  // de uma safra para a outra no calendário não paga a criação das texturas na hora.
  const culturas = useMemo(() => [...new Set(sim?.rotacao.safras.map(s => s.cultura) ?? [])].join('|'), [sim?.rotacao])
  useEffect(() => {
    if (estado !== 'pronta' || !culturas) return
    const fila = culturas.split('|')
    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 200))
    const cancelar = window.cancelIdleCallback ?? window.clearTimeout
    let id = 0
    const proxima = () => {
      const c = fila.shift()
      if (!c) return
      cena.current?.preparar(c)
      id = ocioso(proxima)
    }
    id = ocioso(proxima)
    return () => cancelar(id)
  }, [estado, culturas])

  // Ano agrícola do conjunto de rotações (2027 = set/2027 a ago/2028): semente do clima sintético da cena.
  const ano = useConjunto().ano
  // rotacao, respostas e normais chegam memoizados (Simulation.tsx): só mudam quando o conteúdo muda.
  const rotacao = sim?.rotacao ?? null
  const respostas = sim?.respostas ?? null
  const normais = sim?.normais ?? null
  const soloChave = useMemo(() => JSON.stringify(respostas), [respostas])
  const fonteChave = useMemo(() => (normais ? chaveNormais(normais) : ''), [normais])
  const solo = useMemo(() => (respostas ? soloLocal(respostas) : null), [respostas])
  const fonte = useMemo(() => (normais ? fonteSintetica({ normais, sementeBase: ano, anos: 1 }) : null), [normais, ano])

  const posicao = sim?.posicao ?? 0
  const fracao = sim?.fracao ?? 0
  const colhido = !!sim?.colhido
  const classeId = sim?.classeId ?? ''
  // Chave da simulação: o que muda o resultado. Trocar só o decêndio (posicao, fracao) não simula de novo.
  const chave = rotacao ? `${JSON.stringify(rotacao)}|${ano}|${classeId}|${soloChave}|${fonteChave}` : ''
  // Último dia aplicado à cena: trocar só o dia dentro da mesma safra é adiado enquanto o calendário é varrido.
  const aplicado = useRef<{ chave: string; posicao: number; quando: number } | null>(null)
  useEffect(() => {
    if (!host.current || !rotacao || !respostas || !normais || !solo || !fonte) return
    const el = host.current
    let valendo = true
    const mostrar = (resultado: ResultadoRotacao) => {
      if (!valendo) return   // resposta de um pedido que já foi trocado por outro
      try {
        cena.current ??= montarCena(el)
        const classe = CLASSES_SOLO[classeId] ?? CLASSES_SOLO.latossolo_vermelho
        const safra = cena.current.mostrar({
          rotacao, ano, posicao, classe, classeId, solo, soloChave, fonte, fonteChave, resultado,
        })
        cena.current.dia(fracao * safra.cicloDias)
        cena.current.colhido(colhido)
        aplicado.current = { chave, posicao, quando: performance.now() }
        setEstado('pronta')
      } catch (e) {
        // Sem canvas 2D ou ResizeObserver (navegador antigo, jsdom): fica só a etiqueta.
        console.error('Simulação do talhão indisponível', e)
        setEstado('erro')
      }
    }
    // Já simulada. Aplicar um dia novo custa caro (texturas do solo, raízes e sintomas das plantas vão de novo
    // para a GPU): com o calendário sendo varrido, só a mesma safra mudando de dia, espera a navegação parar
    // (ESPERA) e, numa varredura longa, aplica no máximo a cada ESPERA_MAX. Clique isolado e troca de safra: na hora.
    const pronto = simulado(chave)
    if (pronto) {
      const a = aplicado.current
      const soDia = !!cena.current && a?.chave === chave && a.posicao === posicao
      const desde = a ? performance.now() - a.quando : Infinity
      if (!soDia || desde > ESPERA_MAX) { mostrar(pronto); return () => { valendo = false } }
      const t = window.setTimeout(() => mostrar(pronto), Math.min(ESPERA, ESPERA_MAX - desde))
      return () => { valendo = false; window.clearTimeout(t) }
    } else {
      setEstado(e => (e === 'pronta' ? 'simulando' : e))
      simular(chave, { rotacao, ano, classeId, respostas, normais }).then(mostrar, e => {
        if (!valendo) return
        console.error('Falha ao simular o talhão', e)
        setEstado('erro')
      })
    }
    return () => { valendo = false }
  }, [chave, ano, rotacao, respostas, normais, posicao, fracao, colhido, classeId, solo, soloChave, fonte, fonteChave])

  return (
    <div className="isow" data-simulacao={estado}>
      <div
        className="iso-sim"
        ref={host}
        role="group"
        aria-label={`Talhão em ${periodLabel}: ${pill}`}
      />
      {estado === 'preparando' && <div className="iso-sim-msg" aria-hidden="true">Preparando a simulação…</div>}
      {estado === 'simulando' && <div className="iso-sim-tag" role="status">Simulando a rotação…</div>}
      {estado === 'erro' && <div className="iso-sim-msg">Não foi possível desenhar o talhão.</div>}
      {alerta ? (
        // Em período crítico o chip é focável: o detalhe aparece no hover ou no foco do teclado
        <div className={`fpill fp-al ${alerta.cls}`} tabIndex={0} role="note" aria-label={`${pill}. Período crítico: ${alerta.rotulo}. ${alerta.texto}`}>
          <span className="fp-l" aria-hidden="true">
            <span className="fsw" style={{ background: fill }} />
            {pill}
            <span className="fp-st">
              <svg className="ic"><use href={`/canvas-icons.svg#${alerta.cls === 'risk' ? 'i-xc' : alerta.cls === 'warn' ? 'i-alert' : 'i-okc'}`} /></svg>
              Período crítico
            </span>
          </span>
          <span className="fp-tip" aria-hidden="true">
            <b>{alerta.rotulo}</b>
            {alerta.texto}
          </span>
        </div>
      ) : (
        <div className="fpill" aria-hidden="true">
          <span className="fsw" style={{ background: fill }} />
          {pill}
        </div>
      )}
    </div>
  )
}
