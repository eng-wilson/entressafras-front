// Rotações exibidas na tela: vêm da API (App) e chegam aos componentes por contexto, sem passar por cada nível.
import { createContext, useContext } from 'react'
import { CONJUNTO_LOCAL, type ConjuntoRotacoes } from '../data/mock'

/** Sem provedor (testes de componente isolado), vale o conjunto local. */
export const ConjuntoContext = createContext<ConjuntoRotacoes>(CONJUNTO_LOCAL)
export const useConjunto = () => useContext(ConjuntoContext)
