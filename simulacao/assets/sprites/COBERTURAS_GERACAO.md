# Arte das coberturas — 15/11/2026

Continuação das etapas 7 e 8 de `../../docs/PLANO_ASSETS_CROPS.md`.
Geração pelo `image_gen` integrado, sem API/CLI externo. Referências visuais:
`milheto/milheto_fases_progresso.jpg` para gramíneas e
`soja/soja_fases_progresso.png` para leguminosas. As referências orientam
pintura, iluminação, contorno e volume; a anatomia é específica de cada cultura.

## Entregáveis

Nas pastas `brizantha_marandu`, `brizantha_piata`, `brizantha_paiaguas`,
`ruziziensis`, `crotalaria_juncea`, `crotalaria_spectabilis` e
`crotalaria_ochroleuca`:

- `fases-pintadas.png`: prancha original gerada, cinco plantas isoladas.
- `arte-<fase>.png` e `arte-<fase>.dados.png`: recortes e máscaras RGBA.
- `manifest.json`: todas as fases e três variantes normais apontam para arte.

Os PNGs procedurais anteriores permanecem preservados. As três variantes
reutilizam a mesma pintura, como nas culturas existentes; não representam
três pinturas independentes. Alongamento reutiliza touceira/tapete; dessecação
reutiliza sementes. Nas crotalárias, `MAT` é a referência de vagens maduras
reutilizada por corte/rolagem e palhada. Ela não desenha palha sobre o solo:
o comportamento de fim do ciclo continua sendo responsabilidade do renderizador.

## Especificações dos prompts

Pedido comum: production botanical farming game sprite sheet, match reference
painted dimensional leaves, thin organic dark contours and warm upper-right
light. Exactly five whole isolated plants, landscape 1536×1024, common baseline,
ample white gutters, no overlap, no roots, soil, pots, shadows, text, labels,
glow or gradients. Flat pure white background including gaps between leaves.
As pranchas brancas seguem o método de recorte já usado no milheto/sorgo;
tentativas com transparência geraram halo e foram descartadas.

Especificação de cada cultura e sequência das cinco plantas:

| Cultura | Anatomia solicitada | Sequência |
|---|---|---|
| Marandu | Broad dark green arching blades, dense upright basal tussock, unilateral finger-like racemes, never cylindrical millet spikes | Emerging two leaves; young tillering; dense established tussock; flowering green racemes; tan seed racemes with green foliage |
| Piatã | Finer narrower blades, slender stems, less bulky mid-height tussock, delicate unilateral racemes | Seedling; young tillering; established narrow-leaf tuft; flowering; tan seed racemes |
| Paiaguás | Exceptionally leafy dense bright green tussock, many lush arching blades, fine stalks, foliage remains green in seed stage | Seedling; lush tillering; dense leafy tuft; flowering; green tuft with tan racemes |
| Ruziziensis | Decumbent spreading stems, visible horizontal basal runners and nodes, light green arching blades, low carpet-like growth | Seedling; spreading young tuft; established decumbent carpet; flowering; tan seed racemes |
| Juncea | Tall erect woody legume, simple lanceolate leaves, long terminal gold yellow pea-flower racemes, inflated oval pods | Cotyledon seedling; vegetative; flowering; green pods; tan pods retaining some green leaves |
| Spectabilis | Compact branched upright shrub, simple broad obovate leaves, yellow pea flowers with dark reddish stripes, inflated oval pods | Cotyledon seedling; vegetative; flowering; green pods; tan pods retaining some green leaves |
| Ochroleuca | Branched woody legume, trifoliate leaves with three narrow lanceolate leaflets, pale cream yellow pea flowers, inflated pods | Cotyledon seedling; vegetative; flowering; green pods; tan pods retaining some green trifoliate leaves |

## Reprodução e verificação

Na raiz do repositório, com o Chromium do Playwright disponível:

```sh
node simulacao/scripts/preparar-coberturas.mjs
```

O script usa as pranchas locais, sem gerar novas imagens. Separa componentes
conectados para preservar pontas que ultrapassam a coluna vizinha sem tocar
a outra planta; isola o branco e calibra colo/resolução para cada fase.
Preserva as flores claras das leguminosas. Não redesenha plantas.

Verifica o carregador real, todas as posturas, variantes e estados reprodutivos,
alpha idêntico entre cor e máscara, ausência de fallback procedural, composição
de déficit hídrico/N/S/K e todas as plantas da lavoura em todas as fases,
saudáveis e sob déficit hídrico. Salva evidências em
`../../scratch/coberturas/validacao.json` e `galeria.png`.

O exportador `exportar-base-sprites.mjs` produz bases procedurais; sua execução
também regrava manifestos. Depois de usá-lo, execute o preparador de coberturas
para reaplicar os manifestos da arte final.

## Limites

Máscaras são derivadas da cor pelo método existente (`mascaraDaCor`): u/v e
idade são aproximados. Folhas, colmos e órgãos reprodutivos verdes nem sempre
são separáveis pela cor. As posturas e perdas reprodutivas usam a adaptação
geométrica existente, não desenhos independentes de danos. A validação é de
integração e leitura visual, não certificação botânica/agronômica.
