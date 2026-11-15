// Formatação de números da tela no idioma atual (HANDOFF-SPEC §6: números arredondados, vírgula decimal em pt).
import { numero } from '../i18n'

/** "230", "1.250" (en: "1,250"). */
export const inteiro = (n: number) => numero(n, { maximumFractionDigits: 0 })

/** Texto padrão para dado ausente (nunca "0"). */
export const SEM_DADO = 'Sem dado'
