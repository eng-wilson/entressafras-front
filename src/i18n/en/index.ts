// Dicionário português → inglês, dividido por área para cada parte do app manter o seu.
// Chave: o texto exato em português passado a t(); valor: o texto em inglês, com os mesmos {placeholders}.
import { EN_BASE } from './base'
import { EN_COMPONENTES } from './componentes'
import { EN_PAINEL } from './painel'
import { EN_ONBOARDING } from './onboarding'
import { EN_LOGICA } from './logica'
import { EN_DADOS } from './dados'

export const EN: Record<string, string> = {
  ...EN_DADOS, ...EN_LOGICA, ...EN_ONBOARDING, ...EN_PAINEL, ...EN_COMPONENTES, ...EN_BASE,
}
