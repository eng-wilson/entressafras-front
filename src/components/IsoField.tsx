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
  /** Decêndio dentro de um período crítico: nível, motivo curto e o problema que pode acontecer. */
  alerta?: { cls: 'good' | 'warn' | 'risk'; rotulo: string; texto: string } | null
}

const ALTURA = 400

export function IsoField({ cropName, stageKey, stageName, periodLabel, sim, alerta = null }: Props) {
  const fill = FILL[stageKey] ?? FILL.bare
  const pill = cropName
    ? cropName + ' · ' + stageName.toLowerCase()
    : (stageKey === 'ready' ? 'Pronto para o plantio' : stageName)

  const host = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const [estado, setEstado] = useState<'preparando' | 'simulando' | 'pronta' | 'erro'>('preparando')

  // A cena vive enquanto o componente estiver montado: guarda o cache das simulações e dos sprites.
  useEffect(() => () => { cena.current?.destruir(); cena.current = null }, [])

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
  const classeId = sim?.classeId ?? ''
  // Chave da simulação: o que muda o resultado. Trocar só o decêndio (posicao, fracao) não simula de novo.
  const chave = rotacao ? `${JSON.stringify(rotacao)}|${ano}|${classeId}|${soloChave}|${fonteChave}` : ''
  useEffect(() => {
    if (!host.current || !rotacao || !respostas || !normais || !solo || !fonte) return
    const el = host.current
    let valendo = true
    const mostrar = (resultado: ResultadoRotacao) => {
      if (!valendo) return   // resposta de um pedido que já foi trocado por outro
      try {
        cena.current ??= montarCena(el, ALTURA)
        const classe = CLASSES_SOLO[classeId] ?? CLASSES_SOLO.latossolo_vermelho
        const safra = cena.current.mostrar({
          rotacao, ano, posicao, classe, classeId, solo, soloChave, fonte, fonteChave, resultado,
        })
        cena.current.dia(fracao * safra.cicloDias)
        setEstado('pronta')
      } catch (e) {
        // Sem canvas 2D ou ResizeObserver (navegador antigo, jsdom): fica só a etiqueta.
        console.error('Simulação do talhão indisponível', e)
        setEstado('erro')
      }
    }
    // Já simulada: mostra na hora (o slider não espera). Senão o worker simula e a cena anterior fica na tela.
    const pronto = simulado(chave)
    if (pronto) mostrar(pronto)
    else {
      setEstado(e => (e === 'pronta' ? 'simulando' : e))
      simular(chave, { rotacao, ano, classeId, respostas, normais }).then(mostrar, e => {
        if (!valendo) return
        console.error('Falha ao simular o talhão', e)
        setEstado('erro')
      })
    }
    return () => { valendo = false }
  }, [chave, ano, rotacao, respostas, normais, posicao, fracao, classeId, solo, soloChave, fonte, fonteChave])

  return (
    <div className="isow" data-simulacao={estado}>
      <div
        className="iso-sim"
        ref={host}
        role="group"
        aria-label={`Talhão em ${periodLabel}: ${pill}`}
        style={{ minHeight: ALTURA }}
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
