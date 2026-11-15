// Cobertura dos dados necessários pelo backend, conferida na API ao vivo.
//
//   npm run dados:status            consulta a API e reescreve a tabela em docs/PLANO_INTEGRACAO.md
//   npm run dados:status -- --check falha (código 1) se a tabela do documento estiver desatualizada
//
// Regra: sempre que a API servir um dado (e não marcado como MOCK), ele aparece automaticamente como real.
// Regra do projeto: o que a API resolve não é calculado no front; a lista só tem o que a tela mostra.
// "Em uso no front" é declarado aqui (emUso), porque depende do código; o script só lê a API.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = (process.env.VITE_API_URL ?? 'https://entressafras-backend-production.up.railway.app').replace(/\/+$/, '')
const INICIO = '<!-- dados-backend:inicio -->'
const FIM = '<!-- dados-backend:fim -->'
/** Ponto de referência (T-07, Sorriso/MT) e cultura de referência (soja) para as amostras. */
const PONTO = { lat: -12.54, lon: -55.72 }
const SOJA = 1150

const temMock = a => a.rotacoes?.warnings?.some(w => /\bMOCK\b/.test(w)) ?? false
const culturasRot = a => a.rotacoes?.rotations?.flatMap(r => r.crops.map(c => c.crop)) ?? []

/**
 * Cada dado necessário. `servido(amostras)`: 'real' (a API serve), 'mock' (serve, mas marcado como MOCK) ou null
 * (não serve). `emUso`: o front já consome o valor da API. `precisa`: o que falta do backend enquanto não é real.
 */
export const DADOS = [
  { dado: 'Chuva, ET0 e temperatura por decêndio', front: 'Indicadores do decêndio, resiliência, chuva no ano (lateral)', emUso: true,
    servido: a => (a.decendios?.decendios?.length === 36 ? 'real' : null), precisa: '—' },
  { dado: 'Requisitos das culturas (EcoCrop)', front: 'Temperatura, catálogo "Dados das culturas"', emUso: true,
    servido: a => (a.cultura?.eco_port_code === SOJA ? 'real' : null), precisa: '—' },
  { dado: 'Kc por cultura', front: 'Consumo de água (Kc × ET0) na resiliência', emUso: true,
    servido: a => (a.cultura?.water_requirements?.crop_coefficient ? 'real' : null), precisa: 'Kc calibrado pelo ZARC, se existir' },
  { dado: 'Rotações recomendadas (culturas)', front: 'As rotações da tela', emUso: true,
    servido: a => (a.rotacoes?.rotations?.length ? 'real' : null), precisa: '—' },
  { dado: 'Janelas de plantio e colheita', front: 'Calendário, estágios, fases da resiliência', emUso: true,
    servido: a => (a.rotacoes?.rotations?.[0]?.crops?.[0]?.planting_date ? 'real' : null),
    precisa: 'Ciclos calibrados para cultivares brasileiras (hoje FAO-56)' },
  { dado: 'Ordem (rank) das rotações', front: 'Ordem da lista (a tela não reordena)', emUso: true,
    servido: a => (a.rotacoes?.rotations?.length ? (temMock(a) ? 'mock' : 'real') : null), precisa: 'Ranking calculado' },
  { dado: 'Risco hídrico por cultura', front: 'Selo de clima, resiliência no mapa, período crítico (única fonte; sem conta no front)', emUso: true,
    servido: a => {
      const cs = culturasRot(a)
      if (!cs.length) return null
      return cs.some(c => c.risk?.method === 'MOCK') ? 'mock' : 'real'
    }, precisa: 'Risco calculado (`method: FAO56_SIMPLIFIED_KY`)' },
  { dado: 'Duração dos estágios por cultura', front: 'Fases no calendário, curva de Kc, período crítico e estágios do talhão', emUso: true,
    servido: a => (a.cultura?.water_requirements?.stage_length_days ? 'real' : null),
    precisa: 'Estágios calibrados para cultivares brasileiras' },
  { dado: 'Profundidade das raízes', front: 'Dados das culturas (exibição)', emUso: true,
    servido: a => (a.cultura?.water_requirements?.root_depth_m ? 'real' : null), precisa: '—' },
  { dado: 'Produtividade e preço por cultura', front: '`src/data/perfis.ts` (mock)', emUso: false,
    servido: () => null, precisa: 'Produtividade e preço por cultura e região, com data' },
  { dado: 'Efeito da sequência no solo e nas pragas', front: '`src/data/perfis.ts` (mock)', emUso: false,
    servido: () => null, precisa: 'Efeito agronômico por sequência de culturas' },
  { dado: 'Umidade do solo atual', front: 'Mock no indicador de umidade da cena', emUso: false,
    servido: () => null, precisa: 'Leitura atual com data, origem e unidade' },
  { dado: 'Previsão do tempo', front: 'Fora do escopo atual', emUso: false,
    servido: () => null, precisa: 'Fonte de previsão com horizonte e data de emissão' },
]

const SITUACAO = {
  real_uso: '✅ Real, em uso',
  real_livre: '🟡 Servido pela API, falta integrar no front',
  mock: '🟠 Servido, mas MOCK no backend',
  nenhum: '⬜ Pendente no backend',
}

/** Situação de cada dado a partir das amostras da API. */
export function avaliar(amostras, dados = DADOS) {
  return dados.map(d => {
    const s = d.servido(amostras)
    const situacao = s === 'real' ? (d.emUso ? 'real_uso' : 'real_livre') : s === 'mock' ? 'mock' : 'nenhum'
    return { ...d, situacao }
  })
}

/** Tabela em Markdown, ordenada do mais coberto ao mais pendente. */
export function tabela(itens, data) {
  const ordem = Object.keys(SITUACAO)
  const linhas = [...itens].sort((a, b) => ordem.indexOf(a.situacao) - ordem.indexOf(b.situacao))
    .map(i => `| ${i.dado} | ${SITUACAO[i.situacao]} | ${i.front} | ${i.situacao === 'real_uso' ? '—' : i.precisa} |`)
  const n = s => itens.filter(i => i.situacao === s).length
  return [
    INICIO,
    `_Gerada por \`npm run dados:status\` em ${data}, consultando a API ao vivo. Não editar à mão: ajuste \`scripts/dados-backend.mjs\`._`,
    '',
    `Resumo: ${n('real_uso')} reais em uso, ${n('real_livre')} servidos sem uso no front, ${n('mock')} MOCK no backend, ${n('nenhum')} pendentes.`,
    '',
    '| Dado | Situação | Onde o front usa | O que falta do backend |',
    '|---|---|---|---|',
    ...linhas,
    FIM,
  ].join('\n')
}

/** Troca o bloco entre os marcadores (ou o acrescenta antes de "Dependências futuras"). */
export function atualizarDoc(doc, bloco) {
  const nl = doc.includes('\r\n') ? '\r\n' : '\n'
  const b = bloco.replace(/\n/g, nl)
  const i = doc.indexOf(INICIO), f = doc.indexOf(FIM)
  if (i >= 0 && f > i) return doc.slice(0, i) + b + doc.slice(f + FIM.length)
  const titulo = `## Cobertura dos dados pelo backend${nl}${nl}`
  const ancora = doc.indexOf('## Dependências futuras do backend')
  return ancora >= 0 ? doc.slice(0, ancora) + titulo + b + nl + nl + doc.slice(ancora) : doc + nl + titulo + b + nl
}

const semData = s => s.replace(/em \d{2}\/\d{2}\/\d{4}/, '')

async function json(caminho, init) {
  try {
    const r = await fetch(`${API}${caminho}`, { ...init, signal: AbortSignal.timeout(30_000) })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

async function principal() {
  const q = new URLSearchParams({ lat: String(PONTO.lat), lon: String(PONTO.lon) })
  const [openapi, decendios, cultura, rotacoes] = await Promise.all([
    json('/openapi.json'),
    json(`/api/clima/decendios?${q}`),
    json(`/api/crops/${SOJA}`),
    json('/api/rotations/recommendations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soil_type: 'medium', location: PONTO }),
    }),
  ])
  if (!openapi) {
    console.error(`API indisponível em ${API}: a tabela não foi alterada.`)
    process.exit(2)
  }
  const DOC = fileURLToPath(new URL('../docs/PLANO_INTEGRACAO.md', import.meta.url))
  const itens = avaliar({ openapi, decendios, cultura, rotacoes })
  const bloco = tabela(itens, new Date().toLocaleDateString('pt-BR'))
  const doc = readFileSync(DOC, 'utf8')
  const novo = atualizarDoc(doc, bloco)
  for (const i of itens) console.log(`${SITUACAO[i.situacao].padEnd(46)} ${i.dado}`)
  if (process.argv.includes('--check')) {
    if (semData(novo) !== semData(doc)) {
      console.error('\nA cobertura mudou na API: rode `npm run dados:status` para atualizar o documento.')
      process.exit(1)
    }
    return
  }
  if (novo !== doc) writeFileSync(DOC, novo)
  console.log(novo === doc ? '\nDocumento já estava atualizado.' : `\nTabela atualizada em ${DOC}`)
}

const mesmo = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase()
if (import.meta.url.startsWith('file:') && process.argv[1] && mesmo(fileURLToPath(import.meta.url), process.argv[1])) await principal()
