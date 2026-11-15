// Tipos da parte da simulação portátil (/simulacao) que o app usa. Só o contrato lido aqui; o resto é opaco.

/** Normais mensais (jan → dez) que alimentam o gerador de clima diário. */
export type Normais = {
  nome: string
  chuva: number[]
  tmax: number[]
  tmin: number[]
  /** Radiação no topo da atmosfera, mm/dia equivalente. */
  ra: number[]
}

/** Uma safra da rotação: plantio em 'MM-DD'. */
export type SafraSim = {
  cultura: string
  plantio: string
  nome?: string
  potencial?: number
  companheira?: string
  adubacaoN?: number | null
}
export type RotacaoSim = { id: string; nome?: string; safras: SafraSim[] }

export type ClasseSolo = { nome: string; argila: number; [k: string]: unknown }
export type Solo = (u: number, v: number) => unknown
export type FonteClima = { id: string; nome: string; origem: string; anos: number[] }

export type RespostasSolo = Partial<Record<'compactacao' | 'acidez' | 'fertilidade' | 'palhada', string>>

export type SafraSimulada = {
  ciclo: number
  posicao: number
  nome: string
  cultura: string
  companheira: string | null
  plantio: string
  cicloDias: number
  resumo: { produtividade: number; [k: string]: unknown }
}

export type OpcoesMostrar = {
  rotacao: RotacaoSim
  ano: number
  posicao: number
  classe: ClasseSolo
  classeId: string
  solo: Solo
  soloChave: string
  fonte: FonteClima
  fonteChave: string
  /** Rotação já simulada (Web Worker): a cena não simula nesta thread. */
  resultado?: ResultadoRotacao | null
}

/** Saída de simulateRotacao (o worker manda só as safras do ciclo 1, com os retratos diários). */
export type ResultadoRotacao = { rotacao: RotacaoSim; safras: (SafraSimulada & { sim?: unknown })[] }

/** Talhão isométrico sobre um canvas (simulacao/src/components/talhao.js). */
export type Talhao = {
  mostrar(o: OpcoesMostrar): SafraSimulada
  dia(d: number): void
  /** Pousio depois da colheita: o solo do fim do ciclo, sem nenhuma planta de pé. */
  colhido(c: boolean): void
  zoom(fator: number): void
  restaurar(): void
  /** true para de desenhar (cena escondida); false retoma. */
  pausar(p: boolean): void
  /** Cria antes a cena de uma cultura (id da simulação), sem mostrá-la. */
  preparar(cultura: string): void
  redimensionar(): void
  destruir(): void
}

/** O canvas precisa de tamanho CSS; botões de zoom opcionais em `.talhao-zoom` no mesmo pai. */
export function createTalhao(canvas: HTMLCanvasElement, opcoes?: {
  rotuloClima?: boolean; resolucao?: number
  /** Tradução dos textos da cena: chave em português, {nome} para variáveis. */
  t?: (pt: string, vars?: Record<string, string | number>) => string
}): Talhao
export const CLASSES_SOLO: Record<string, ClasseSolo>
/** Catálogo de culturas da simulação, por id. */
export const CULTURAS: Record<string, { id: string; nome: string; cicloDias: number }>
export function soloLocal(respostas?: RespostasSolo): Solo
export function fonteSintetica(o?: { normais?: Normais; sementeBase?: number; anos?: number }): FonteClima
export const NORMAIS: { cerrado_go: Normais }
/** FAO-56 eq. 21, MJ/m²/dia. */
export function radiacaoExtraterrestre(latGraus: number, diaDoAno: number): number
