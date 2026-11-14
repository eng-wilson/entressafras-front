# Integração com a API Entressafras

Revisão de 14/11/2026. Por decisão do usuário, a fase 2 está adiada e a fase 3 foi antecipada. Nenhuma consulta ao endpoint diário faz parte da implementação atual.

## Contratos disponíveis

Base: `VITE_API_URL`, com fallback para `https://entressafras-backend-production.up.railway.app`.

| Endpoint | Dados | Uso previsto |
|---|---|---|
| `GET /api/clima/decendios?lat&lon` | 36 decêndios climatológicos, fonte e safras | Indicadores de chuva e temperatura e resumo mensal |
| `GET /api/clima/diario?lat&lon&inicio&fim` | Série histórica diária | Adiado; sem serviço, hook, cache ou chamadas no frontend |
| `GET /api/crops` e `/api/crops/{eco_port_code}` | Catálogo e requisitos das culturas | Enriquecimento das culturas na fase 3 |

O contrato diário contém `gwettop` e `gwetroot` históricos, mas não fornece uma leitura atual garantida de umidade. Na consulta de referência para o T-07 em 14/11/2026, a série termina em **31/08/2026**. Esses campos não serão usados para alimentar a lateral ou o indicador de solo nesta etapa. Não há integração de previsão futura neste escopo.

## Fase 1 — comportamento implementado

- Chuva: `chuva_media` do decêndio selecionado, em mm; título “Chuva do decêndio”.
- Temperatura: `tmin_media` e `tmax_media` do decêndio selecionado; arredondamento apenas nos rótulos.
- Meses: ícones e tooltips continuam usando a soma dos três decêndios do mês.
- Cache climatológico: 7 dias, até 20 pontos, chave `entressafras.clima.decendios.v1`.
- Carregamento, “Sem dado” e nova tentativa; ausência nunca vira zero ou mock climático.
- Umidade do solo e demais dados ilustrativos permanecem mock.
- Pendência conhecida: paridade visual com a referência ainda não aprovada. Os goldens antigos também refletem chuva mensal e precisam ser tratados como referência anterior à mudança de produto; manter explícitas as diferenças, sem aumentar a tolerância para ocultá-las.

## Fase 2 — adiada

Por decisão do usuário, não implementar nem consultar dados diários neste momento. O código iniciado foi retirado. Não criar tipos, serviço, hook, cache ou interface para essa série. Uma eventual retomada exige revisar o contrato e definir separadamente o escopo.

## Fase 3 — catálogo de culturas

Implementada com os contratos verificados no backend em 14/11/2026:

- Mapeamento explícito das espécies em `src/data/culturas.ts`. A busca por nome científico em `/api/crops` confirma o código antes de consultar `/api/crops/{eco_port_code}`. Nome científico e código do detalhe também são validados.
- Soja: `Glycine max`, código 1150; milho: `Zea mays`, código 2175. As demais espécies locais têm seus códigos verificados; Crotalária ochroleuca fica sem referência, sem substituição por outra espécie.
- Marandu, Piatã e Paiaguás compartilham a referência geral de `Brachiaria brizantha` (536), com indicação explícita de que os dados não são específicos da cultivar.
- Cache próprio de sete dias, até vinte registros, chave `entressafras.culturas.v1`, com validação, cancelamento, tratamento de erro e nova tentativa. Sem dependências novas.
- Temperatura: valores dentro da faixa ótima são “Bom”; fora da ótima são “Atenção”; além dos limites absolutos são “Risco”. Comparações usam valores brutos e os rótulos são arredondados. As quatro marcas e o gradiente acompanham a referência da espécie, em vez dos antigos limiares fixos por cultura.
- Limites térmicos ausentes ou incompletos: mostrar “Sem referência”, preservando os valores climáticos. Falha do catálogo nunca vira uma classificação positiva nem restaura os antigos limiares silenciosamente.
- Geada: apenas semeadura/emergência, com `killing_early_growth` informado e `tmin_extremo_medio` histórico menor ou igual a esse limite. O chip diz “Geada · Risco histórico”. Não usar médias como prova de geada, nem aplicar `killing_rest` a uma cultura em crescimento. Se o campo letal for null, não inventar um limite.
- “Ver todos os dados” abre “Dados das culturas”, com seletor das culturas locais, temperatura, chuva anual (mm/ano), ciclo (dias), pH e requisitos de solo. Fechamento por botão ou Escape, foco contido no diálogo e retorno ao botão de origem.
- Chuva anual é exibida como referência separada. Não substituir consumo por ciclo na `CompareTable`, nem dividir requisitos anuais para gerar suposta exigência por decêndio. Chuva do decêndio, consumo por ciclo e chuva anual são grandezas distintas.
- Solo, produtividade, ciclos simulados, ranking e adequação das rotações continuam ilustrativos. A fase 3 integra requisitos gerais do catálogo, sem alegar validar recomendações agronômicas ou prever geadas futuras.

Validação: testes do serviço e cache, faixas e extremos térmicos, ausência de referência, catálogo acessível, erro/nova tentativa e ausência de chamadas diárias. A pendência anterior de paridade com a referência permanece registrada separadamente.

## Dependências futuras do backend

- Umidade atual ou recente: aguardar um contrato que defina disponibilidade, atualização, data de referência, origem e unidade. Só então substituir o mock da lateral e a lógica do indicador de solo.
- Previsão futura: depende de uma fonte ou endpoint de previsão com horizonte, data de emissão e proveniência. Não está coberta pelos endpoints históricos atuais.
