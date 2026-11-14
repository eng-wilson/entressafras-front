/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API Entressafras (sem barra final). Padrão: produção no Railway. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
