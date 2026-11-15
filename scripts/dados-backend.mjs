// Cobertura dos dados necessários pelo backend, conferida na API ao vivo.
//
//   npm run dados:status            consulta a API e reescreve a tabela em docs/INTEGRACAO_API.md
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

const rot0 = a => a.rotacoes?.rotations?.[0]
const crop0 = a => rot0(a)?.crops?.[0]
/** Dado da resposta de rotações: real, ou MOCK quando o servidor avisa em `warnings`. */
const deRotacoes = (a, tem) => (tem(a) ? (temMock(a) ? 'mock' : 'real') : null)

/**
 * Cada dado que a tela precisa. `fonte`: a amostra de onde ele sai (se ela falhar, a situação é "fora do ar", não
 * "pendente"). `servido(amostras)`: 'real', 'mock' (servido, mas marcado MOCK) ou null (não servido). `emUso`: o front
 * já consome o valor da API. `precisa`: o que falta do backend enquanto não é real.
 */
export const DADOS = [
  { dado: 'Chuva, ET0 e temperatura por decêndio', fonte: 'decendios', front: 'Indicadores do decêndio, consumo de água (tabela e memória), chuva no ano (lateral)', emUso: true,
    servido: a => (a.decendios?.decendios?.length === 36 ? 'real' : null), precisa: '—' },
  { dado: 'Requisitos das culturas (EcoCrop)', fonte: 'cultura', front: 'Temperatura, catálogo "Dados das culturas"', emUso: true,
    servido: a => (a.cultura?.eco_port_code === SOJA ? 'real' : null), precisa: '—' },
  { dado: 'Kc por cultura', fonte: 'cultura', front: 'Consumo de água (Kc × ET0)', emUso: true,
    servido: a => (a.cultura?.water_requirements?.crop_coefficient ? 'real' : null), precisa: 'Kc calibrado pelo ZARC, se existir' },
  { dado: 'Duração dos estágios por cultura', fonte: 'cultura', front: 'Fases no calendário, curva de Kc, período crítico e estágios do talhão', emUso: true,
    servido: a => (a.cultura?.water_requirements?.stage_length_days ? 'real' : null), precisa: 'Estágios calibrados para cultivares brasileiras' },
  { dado: 'Profundidade das raízes', fonte: 'cultura', front: 'Dados das culturas (exibição)', emUso: true,
    servido: a => (a.cultura?.water_requirements?.root_depth_m ? 'real' : null), precisa: '—' },
  { dado: 'Rotações recomendadas (culturas)', fonte: 'rotacoes', front: 'As rotações da tela', emUso: true,
    servido: a => (a.rotacoes?.rotations?.length ? 'real' : null), precisa: '—' },
  { dado: 'Janelas de plantio e colheita', fonte: 'rotacoes', front: 'Calendário, estágios, fases', emUso: true,
    servido: a => (crop0(a)?.planting_date ? 'real' : null), precisa: '—' },
  { dado: 'Origem das datas (calendário GGCMI/CONAB)', fonte: 'rotacoes', front: 'Memória de cálculo', emUso: true,
    servido: a => (crop0(a)?.calendar ? 'real' : null), precisa: '—' },
  { dado: 'Ordem das rotações pelas prioridades', fonte: 'rotacoes', front: 'Ordem da lista; "O que importa" vai à API (água não entra)', emUso: true,
    servido: a => deRotacoes(a, x => x.rotacoes?.priorities && x.rotacoes?.rotations?.length), precisa: 'Ranking calculado' },
  { dado: 'Risco hídrico por cultura', fonte: 'rotacoes', front: 'Selo de clima, período crítico, resiliência por safra', emUso: true,
    servido: a => {
      const cs = culturasRot(a)
      if (!cs.length) return null
      return cs.some(c => c.risk?.method === 'MOCK') || temMock(a) ? 'mock' : 'real'
    }, precisa: 'Risco calculado (método diferente de MOCK)' },
  { dado: 'Atendimento à demanda por fase (ISNA)', fonte: 'rotacoes', front: 'Widget "Água para a cultura" e "Atenção no ciclo"', emUso: true,
    servido: a => {
      const cs = culturasRot(a)
      if (!cs.some(c => c.risk?.mean_isna)) return null
      return cs.some(c => c.risk?.method === 'MOCK') || temMock(a) ? 'mock' : 'real'
    }, precisa: 'Atendimento calculado (método diferente de MOCK)' },
  { dado: 'Ky por estágio (sensibilidade ao déficit)', fonte: 'cultura', front: 'Sensibilidade da fase em "Atenção no ciclo"', emUso: true,
    servido: a => (a.cultura?.water_requirements?.yield_response_factor ? 'real' : null), precisa: '—' },
  { dado: 'Atendimento à demanda dia a dia ou por decêndio', fonte: null, front: 'Não há: dentro da fase o valor é constante', emUso: false,
    servido: () => null, precisa: 'Série ETa, ETc e água na zona das raízes por dia ou decêndio, vinculada à rotação' },
  { dado: 'Escalas 0–100 (segurança hídrica, produtividade, solo)', fonte: 'rotacoes', front: 'Mapa de aptidão (3 dos 4 eixos)', emUso: true,
    servido: a => deRotacoes(a, x => rot0(x)?.scores), precisa: 'Escalas calculadas' },
  { dado: 'Proteção do solo planejada', fonte: 'rotacoes', front: 'Saúde do solo: nota e texto (cobertura viva, troca de família)', emUso: true,
    servido: a => (rot0(a)?.soil_protection ? 'real' : null), precisa: '—' },
  { dado: 'Solo usado na simulação (textura, água por metro)', fonte: 'rotacoes', front: 'Lateral (solo estimado quando não informado), memória de cálculo', emUso: true,
    servido: a => (a.rotacoes?.soil?.texture_class ? 'real' : null), precisa: '—' },
  { dado: 'Propriedades do solo superficial (SoilGrids)', fonte: 'rotacoes', front: 'Memória de cálculo (só exibição)', emUso: true,
    servido: a => (a.rotacoes?.soil_properties ? 'real' : null), precisa: '—' },
  { dado: 'Economia de água da rotação', fonte: null, front: 'Eixo "Economia de água" (`src/data/perfis.ts`, mock)', emUso: false,
    servido: () => null, precisa: 'Indicador de consumo ou eficiência de água por rotação' },
  { dado: 'Produção (sc/ha) e preço por cultura', fonte: null, front: 'Tabela de comparação e receita (`src/data/perfis.ts`, mock)', emUso: false,
    servido: () => null, precisa: 'Produtividade e preço por cultura e região, com data' },
  { dado: 'Efeito da sequência nas pragas', fonte: null, front: 'Selo "Mais pragas" e texto (`src/data/perfis.ts`, mock)', emUso: false,
    servido: () => null, precisa: 'Efeito da sequência de culturas nas pragas' },
  { dado: 'Umidade do solo atual', fonte: null, front: 'Não exibida (o widget mostra o atendimento à demanda)', emUso: false,
    servido: () => null, precisa: 'Leitura atual com data, origem e unidade' },
  { dado: 'Previsão do tempo', fonte: null, front: 'Fora do escopo atual', emUso: false,
    servido: () => null, precisa: 'Fonte de previsão com horizonte e data de emissão' },
]

const SITUACAO = {
  real_uso: '✅ Real, em uso',
  real_livre: '🟡 Servido pela API, falta integrar no front',
  mock: '🟠 Servido, mas MOCK no backend',
  fora: '❌ Endpoint fora do ar na consulta',
  nenhum: '⬜ Pendente no backend',
}

/** Situação de cada dado a partir das amostras da API. */
export function avaliar(amostras, dados = DADOS) {
  return dados.map(d => {
    if (d.fonte && amostras.falhou?.[d.fonte]) return { ...d, situacao: 'fora' }
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
    // A recomendação simula cada rotação com balanço diário e pode passar de um minuto.
    const r = await fetch(`${API}${caminho}`, { ...init, signal: AbortSignal.timeout(150_000) })
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
      // Como a tela pede: sem textura (a API estima o solo), com histórico e todas as prioridades.
      body: JSON.stringify({ location: PONTO, crop_history: [SOJA, 2175], priorities: { productivity: 1, water_security: 1, soil_protection: 1 } }),
    }),
  ])
  if (!openapi) {
    console.error(`API indisponível em ${API}: a tabela não foi alterada.`)
    process.exit(2)
  }
  const DOC = fileURLToPath(new URL('../docs/INTEGRACAO_API.md', import.meta.url))
  const falhou = { decendios: !decendios, cultura: !cultura, rotacoes: !rotacoes }
  const itens = avaliar({ openapi, decendios, cultura, rotacoes, falhou })
  const bloco = tabela(itens, new Date().toLocaleDateString('pt-BR'))
  const doc = readFileSync(DOC, 'utf8')
  const novo = atualizarDoc(doc, bloco)
  for (const i of itens) console.log(`${SITUACAO[i.situacao].padEnd(46)} ${i.dado}`)
  const fora = Object.entries(falhou).filter(([, f]) => f).map(([k]) => k)
  if (fora.length) {
    // Endpoint fora do ar não muda o que o backend cobre: a tabela do documento fica como estava.
    console.error(`
Fora do ar nesta consulta: ${fora.join(', ')}. O documento não foi alterado; tente de novo.`)
    process.exit(3)
  }
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
