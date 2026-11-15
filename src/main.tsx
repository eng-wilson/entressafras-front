import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './canvas/canvas.css'
import App from './App'
import { definirIdioma, idiomaInicial, type Idioma } from './i18n'

definirIdioma(idiomaInicial())

/** Trocar o idioma remonta o app (key): textos calculados em memos e na lógica são refeitos no idioma novo. */
function Raiz() {
  const [idioma, setIdioma] = useState(idiomaInicial)
  const trocar = (i: Idioma) => { definirIdioma(i, true); setIdioma(i) }
  return <App key={idioma} onIdioma={trocar} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>
)
