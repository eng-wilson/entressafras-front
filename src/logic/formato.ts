// Formatação pt-BR de números da tela (HANDOFF-SPEC §6: números arredondados, vírgula decimal).

const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** "230", "1.250". */
export const inteiro = (n: number) => INTEIRO.format(n)

/** Texto padrão para dado ausente (nunca "0"). */
export const SEM_DADO = 'Sem dado'
