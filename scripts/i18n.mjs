// Chaves de tradução usadas no código: toda chamada t('texto em português') em src/ e na cena da simulação.
// Usado pelo teste src/i18n/i18n.test.ts, que cobra a tradução em inglês de cada chave.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..')
const PASTAS = ['src']
const ARQUIVOS_EXTRA = ['simulacao/src/components/talhao.js']

function listar(dir) {
  const out = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) { if (nome !== 'i18n') out.push(...listar(p)) }
    else if (/\.(ts|tsx|js)$/.test(nome) && !/\.test\.|\.d\.ts$/.test(nome)) out.push(p)
  }
  return out
}

const desescapar = s => s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n')

/** { chaves: Map<chave, arquivos[]>, invalidas: [{arquivo, trecho}] } — inválida = t(`...`) com template literal. */
export function chavesUsadas(raiz = RAIZ) {
  const arquivos = [...PASTAS.flatMap(p => listar(join(raiz, p))), ...ARQUIVOS_EXTRA.map(p => join(raiz, p))]
  const chaves = new Map()
  const invalidas = []
  const chamada = /(?<![\w.$])t\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g
  for (const arq of arquivos) {
    const texto = readFileSync(arq, 'utf8')
    for (const m of texto.matchAll(chamada)) {
      const chave = desescapar(m[2])
      const rel = arq.slice(raiz.length + 1).replace(/\\/g, '/')
      chaves.set(chave, [...(chaves.get(chave) ?? []), rel])
    }
    for (const m of texto.matchAll(/(?<![\w.$])t\(\s*`/g)) {
      invalidas.push({ arquivo: arq.slice(raiz.length + 1), trecho: texto.slice(m.index, m.index + 60) })
    }
  }
  return { chaves, invalidas }
}

export const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')
