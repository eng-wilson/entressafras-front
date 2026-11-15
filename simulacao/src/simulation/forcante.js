// Forçante climática: de onde vem o clima de cada dia.
// Hoje o cenário gera um clima sintético. A integração com dados reais (docs/INTEGRACAO_DADOS_EXTERNOS.md)
// entrega um objeto com a mesma forma, e nada abaixo daqui muda.
//
// Contrato da safra: { chuva[], tmax[], tmin[], et0[] }, um valor por dia, dia 0 = plantio.
//   chuva mm/dia, tmax e tmin °C, et0 mm/dia. Campos extras (rad, ur, vento, origem) são ignorados aqui.

export function climaDaSafra(cenario, dias) {
    return cenario.clima(dias);
}

export function forcanteDoDia(clima, dia) {
    return { chuva: clima.chuva[dia], tmax: clima.tmax[dia], tmin: clima.tmin[dia], et0: clima.et0[dia] };
}
