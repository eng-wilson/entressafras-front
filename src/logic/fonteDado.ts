// Nome curto da fonte do dado, para o selo em mono ("FONTE · NASA POWER"): o trecho antes do primeiro parêntese,
// vírgula ou ponto e vírgula do texto que a API manda em `fonte`. Sem texto, sem selo.
export function fonteCurta(fonte: string | null | undefined): string | null {
  const curta = fonte?.split(/\s*[(,;]/)[0].trim()
  return curta ? curta : null
}
