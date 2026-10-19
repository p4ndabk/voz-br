import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { prepararSom } from './conversas/som'
import { registrarServiceWorker } from './pwa'
import './styles/index.css'

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registrarServiceWorker()
prepararSom()
