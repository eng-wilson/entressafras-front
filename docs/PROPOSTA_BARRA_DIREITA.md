# Barra direita: explicar e orientar a decisão

Proposta de UX baseada na captura e no código de `Inspector.tsx`, `aptidao.ts`, `diagnostico.ts` e `rank.ts`. Implementada em 15/11/2026 após a crítica e a escolha de priorizar a explicação do risco, incluindo a barra completa.

## Implementação e linguagem visual

- Princípios das Human Interface Guidelines e padrões do SwiftUI adaptados ao React: fonte do sistema, estilos tipográficos em `rem`, cores semânticas, listas agrupadas, separadores discretos e navegação para detalhes. A referência visual enviada pelo usuário orienta o fundo branco, os grupos cinza, a seleção azul e os símbolos em fundos suaves. O azul identifica ações e seleção na barra; verde, âmbar e vermelho continuam representando estados.
- Principal atenção e efeito da fase aparecem antes das datas; o percentual do ciclo fica separado da fase crítica. Aviso de risco provisório junto da conclusão, sem presumir personalização ao talhão.
- “Ver fase no calendário” troca para o calendário, posiciona e foca o cursor na fase. “Comparar alternativas” inclui a rotação selecionada e outra opção recebida da API, sem afirmar que ela é melhor.
- Requisitos são consultados por cultura, independentemente da posição do cursor na simulação. Solo/pragas e metodologia usam seções expansíveis; exemplos locais permanecem identificados como ilustrativos.
- Painel vira seção de largura completa em telas compactas, com atalhos para acessar os detalhes e voltar à área de trabalho. O calendário/tabela conserva rolagem horizontal própria. Controles de ação têm pelo menos 44 px de altura e foco visível.
- Acessibilidade: metadados com maior contraste, estados sem risco neutros, anúncio de mudança de seleção e respeito à preferência de movimento reduzido. A implementação web não usa componentes nativos nem promete suporte a Dynamic Type do iOS.

Referências oficiais: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) e [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

Os problemas e a sequência abaixo registram a motivação original; recomendações de manejo específicas e motivos do ranking continuam dependentes de dados validados do backend.

### Simplificação visual

A referência de componentes enviada pelo usuário foi aplicada ao resumo: posição do ranking em um bloco azul, culturas em linhas compactas com datas e status à direita, cultura do período selecionada em azul, e limitações/cuidados com ícones em fundos semânticos. A seleção da cultura navega para seu plantio e acompanha alterações no calendário. A posição mostra somente a ordem entre as opções recebidas; não inventa total de candidatas, aprovação em filtros ou dados de cobertura que a API não entregou.

A primeira versão usava barras de risco e uma linha do ciclo por cultura. Esses gráficos foram substituídos pelo painel **Atenção no ciclo**, na barra direita, conforme a correção de posicionamento solicitada pelo usuário. Ele apresenta os momentos de restrição do cenário local, a resposta por fase e as verificações possíveis. A barra esquerda conserva somente os dados e ajustes do talhão.

Cada momento pode ser aberto no calendário e na cena. A faixa agora é navegável com slider, leitura da data e navegação entre os momentos de atenção. As linhas de momentos, datas/requisitos, solo, pragas e fontes abrem telas de detalhe dentro do painel, com “Voltar”, Escape e foco restaurado, seguindo a navegação de listas do SwiftUI. O contexto geral da API e o aviso de dado provisório permanecem visíveis, sem duplicação de cabeçalhos ou ações de comparação. Detalhes da análise local: [ATENCAO_NO_CICLO.md](ATENCAO_NO_CICLO.md).

## Problemas prioritários

1. **A explicação do ranking não tem sustentação.** “Por que ficou em 2º” apresenta risco, solo e pragas, mas a posição vem pronta da API. Solo e pragas são ilustrativos. Trocar por “Benefícios e pontos de atenção”; mostrar a posição separadamente como “2ª na ordem da API”. Só explicar a posição quando o backend fornecer os motivos.
2. **O risco aparece três vezes sem orientar a decisão.** Resumo, datas e motivos repetem percentuais. Usar o resumo para a conclusão, o detalhe para a evidência e uma ação para explorar alternativas.
3. **Desvantagens não têm próximo passo.** Para cada problema, apresentar: o que acontece → quando → por que importa → o que conferir → ação disponível.
4. **A qualidade do dado está longe da conclusão.** O risco atualmente pode vir marcado como MOCK; solo, pragas e receita também são ilustrativos. Exibir a condição junto de cada informação, com detalhes recolhidos em “Origem e limites dos dados”.
5. **Os nomes podem confundir a sequência.** O título usa “Soja depois sorgo”, embora o calendário mostre soja seguida de sorgo. Preferir “Soja → sorgo” e explicitar “1ª safra” / “2ª safra”.

## Ordem proposta

1. **Seleção e conclusão curta:** nome da sequência, posição na API e principal ponto de atenção. Dados provisórios devem ser visíveis neste bloco.
2. **O que merece atenção:** até dois problemas prioritários, com consequência e próximo passo. Os demais ficam em “Outros pontos”.
3. **Benefícios e concessões:** mostrar vantagens e limitações juntas, sem sugerir que todas as dimensões melhoram. Comparações precisam usar a mesma base e explicitar dados ilustrativos.
4. **Datas por safra:** plantio, colheita e fase crítica. O clique em uma fase deve selecionar seu período no calendário e na cena.
5. **Entenda os dados:** definição do percentual, fonte, período histórico, método e informações ausentes. Reaproveitar a memória de cálculo existente.

## Exemplos de texto e comportamento

### Quando há período crítico

> **Atenção à água no milho safrinha**
>
> A API aponta a floração e o enchimento de grãos como a fase crítica, entre [datas da API].
>
> **Por que importa:** esta fase merece atenção no planejamento hídrico.
>
> **Próximo passo:** compare com uma alternativa de menor risco informado. Confira a janela de plantio com assistência técnica antes de mudar o calendário.
>
> [Ver período no calendário] [Comparar rotações]
>
> **Dado provisório:** o risco recebido ainda não foi calculado com o clima deste talhão.

Não prometer que antecipar o plantio ou irrigar reduz o percentual. Uma alteração exige nova simulação da API; o front não deve estimar o efeito nem inventar uma dose de irrigação.

### Quando não há alerta hídrico

> **Sem alerta hídrico pelos critérios exibidos**
>
> Confira os benefícios e limitações antes de escolher. O indicador cobre falta de água; outros riscos não são avaliados aqui.

Um resultado provisório precisa manter o aviso visível mesmo com selo verde. “Sem dado” deve ter aparência neutra e orientar a conferir os dados, sem produzir uma conclusão favorável.

### Solo, pragas e retorno

- **Solo:** exibir a justificativa disponível com “Ilustrativo”. Não inferir um manejo específico a partir de uma nota mock.
- **Pragas:** identificar quais organismos e qual fonte sustentam uma alegação antes de oferecer manejo. A afirmação genérica de que uma cultura não hospeda as principais pragas da soja precisa de validação.
- **Retorno:** usar “Receita bruta ilustrativa”, pois sacas × preço não representa lucro. Exibir custos ausentes antes de sugerir uma decisão econômica.

## Layout e interação

- Manter o painel de 320 px como ponto de partida, com texto principal de pelo menos 14 px, entrelinha confortável e seções separadas por espaço.
- Priorizar um botão por problema. “Ver período no calendário” é mais concreto que “Saiba mais”. Usar “Entender os indicadores” no lugar de “Ver todos os dados”.
- Cor acompanha texto e ícone; não deve ser o único sinal de risco. Evitar aparência igualmente positiva para benefícios e pontos de atenção.
- Recolher fontes extensas em uma seção acessível por teclado, deixando a condição provisória junto da conclusão.
- Sincronizar seleção, fase e comparação. Manter o contexto da rotação ao abrir detalhes e indicar quando o calendário está mostrando outra fase.

## Sequência de implementação

1. Corrigir título da sequência, promessa de explicação do ranking e identificação de dados provisórios.
2. Criar o bloco de atenção usando `diag.decisivo` e conectar a ação ao calendário existente.
3. Conectar a comparação e mostrar diferenças verificáveis, sem atribuir causalidade ao ranking.
4. Solicitar ao backend motivos do ranking e recomendações de manejo com fonte, condições de aplicação e limites. Até lá, oferecer exploração e validação, sem gerar prescrições específicas.

## Como verificar se melhorou

Em um teste curto, pedir ao usuário para identificar a sequência, explicar o principal risco, localizar a fase crítica e comparar uma alternativa. Verificar também se ele reconhece quais dados são provisórios e se distingue receita de lucro. Incluir cenários favorável, arriscado, sem risco recebido e API em carregamento.
