# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste `VITE_API_URL`. Sem configuração, usa a API Entressafras no Railway.

## Dados de clima

Estado da integração com a API (endpoints, origem de cada dado da tela e pendências): [docs/INTEGRACAO_API.md](docs/INTEGRACAO_API.md). Não há chamadas ao endpoint diário.

O indicador de chuva usa `chuva_media` do decêndio selecionado; temperaturas também usam médias históricas por decêndio. A escala da chuva vai de 0 a 150 mm, com marcas em 20, 50 e 100 mm. As classificações ilustrativas foram ajustadas para um terço dos limites mensais: abaixo de 20 mm seco; abaixo de 50 pouca chuva; até 100 chuva boa; acima de 100 muita chuva. Essas faixas não são recomendações agronômicas. Os ícones e tooltips dos meses continuam resumindo o total mensal (soma dos três decêndios).

Cache em memória e localStorage por 7 dias (até 20 pontos). Para limpar, execute `localStorage.removeItem('entressafras.clima.decendios.v1')` e recarregue. Em falhas, use "Tentar de novo". Dados ausentes aparecem como "Sem dado".

Solo, ciclos simulados, produção e rotações continuam ilustrativos. As médias históricas suavizam extremos e não constituem previsão de geada.

## Catálogo de culturas (fase 3)

O app consulta `/api/crops?q=...` e `/api/crops/{eco_port_code}` na mesma API. Os requisitos são gerais da espécie, com cache de sete dias (até vinte registros) em `entressafras.culturas.v1`. Para limpar, remova essa chave do localStorage e recarregue.

O indicador térmico usa as faixas ótima e absoluta do EcoCrop para soja/milho. Em falha ou referência incompleta, mantém mínima e máxima e informa “Sem referência”. Limites letais iniciais, quando disponíveis, só são comparados com extremos históricos na semeadura/emergência, sem previsão de geada.

“Ver todos os dados” abre os requisitos das culturas: temperatura, chuva anual em mm/ano, ciclo, pH e solo. A chuva anual não substitui o consumo por ciclo da comparação. Cultivares de brizantha compartilham a referência geral da espécie; Crotalária ochroleuca permanece sem referência.

### Validação da fase 1

120 testes unitários passam; TypeScript, build e lint sem erros. O E2E de falha da API, slider e recuperação passa. Os cinco goldens Windows foram gerados a partir da referência, com rodapé mascarado. A paridade app/referência permanece pendente: cinco cenários falham (~3% de pixels), com diferenças nos indicadores e painel lateral. Uma cópia isolada de HEAD também falhou no cenário inicial (30.008 pixels), confirmando divergência anterior à integração. A tolerância de 1% foi mantida.
