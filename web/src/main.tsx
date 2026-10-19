import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { prepararSom } from './conversas/som'
import { estaEmMoldura } from './emMoldura'
import { EmMoldura } from './pages/EmMoldura'
import { registrarServiceWorker } from './pwa'
import './styles/index.css'

// RN-WEB-PRIVACIDADE-006: dentro de moldura de outro site nada do app roda.
if (estaEmMoldura()) {
  createRoot(document.getElementById('raiz')!).render(<EmMoldura />)
} else {
  createRoot(document.getElementById('raiz')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  registrarServiceWorker()
  prepararSom()
}
