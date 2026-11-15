// Web Worker da simulação: roda simulateRotacao (~0,5–1 s por rotação) fora da thread da interface.
// Mesmos parâmetros que createTalhao usa quando simula sozinho (simulacao/src/components/talhao.js):
// talhão 4,2 × 4,2 m, um ciclo de aquecimento e retratos diários só do ciclo 1.
// Importa os módulos do motor direto: nada de DOM entra no worker.
import { simulateRotacao } from '../../simulacao/src/simulation/rotacao.js'
import { CLASSES_SOLO } from '../../simulacao/src/domain/soil/presets.js'
import { soloLocal } from '../../simulacao/src/domain/soil/solo-local.js'
import { fonteSintetica } from '../../simulacao/src/climate/fonte-clima.js'

const LADO = 4.2

self.onmessage = ({ data }) => {
  const { id, rotacao, ano, classeId, respostas, normais } = data
  try {
    const fonte = fonteSintetica({ normais, sementeBase: ano, anos: 1 })
    const r = simulateRotacao({
      rotacao, sementes: [fonte.aquecimento(ano, 1), ano],
      classe: CLASSES_SOLO[classeId] ?? CLASSES_SOLO.latossolo_vermelho,
      solo: soloLocal(respostas), fonteClima: fonte,
      width: LADO, depth: LADO, retratos: ci => ci === 1,
    })
    // Só o que a tela mostra: as safras do ciclo 1. decodificar tem funções (não clonáveis) e estadoFinal é o
    // estado interno inteiro; nenhum dos dois é lido pelo desenho.
    const safras = r.safras.filter(s => s.ciclo === 1).map(s => {
      if (!s.sim) return s
      const { decodificar: _d, estadoFinal: _e, ...sim } = s.sim
      return { ...s, sim }
    })
    self.postMessage({ id, ok: true, resultado: { rotacao: r.rotacao, safras } })
  } catch (e) {
    self.postMessage({ id, ok: false, erro: e instanceof Error ? e.message : String(e) })
  }
}
