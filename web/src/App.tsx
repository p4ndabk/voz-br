import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSessao } from '@/nostr/useSessao'
import { Conta } from '@/pages/Conta'
import { Destravar } from '@/pages/Destravar'
import { Entrar } from '@/pages/entrar/Entrar'
import { Inicio } from '@/pages/Inicio'
import { NaoEncontrada } from '@/pages/NaoEncontrada'

// /estilo so existe em desenvolvimento; no build de producao o ramo some.
const Estilo = import.meta.env.DEV
  ? lazy(() => import('@/pages/Estilo').then((m) => ({ default: m.Estilo })))
  : null

function SomenteDeslogado({ children }: { children: ReactNode }) {
  const fase = useSessao((s) => s.fase)
  return fase === 'dentro' ? <Navigate to="/conta" replace /> : children
}

function SomenteLogado({ children }: { children: ReactNode }) {
  const fase = useSessao((s) => s.fase)
  return fase === 'dentro' ? children : <Navigate to="/entrar" replace />
}

export function App() {
  const fase = useSessao((s) => s.fase)
  const restaurar = useSessao((s) => s.restaurar)

  useEffect(() => {
    void restaurar()
  }, [restaurar])

  // Enquanto le o IndexedDB nao desenhamos nada: evita piscar a tela de entrar.
  if (fase === 'carregando') return null
  if (fase === 'precisa-senha') return <Destravar />

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route
            path="/entrar"
            element={
              <SomenteDeslogado>
                <Entrar />
              </SomenteDeslogado>
            }
          />
          <Route
            path="/conta"
            element={
              <SomenteLogado>
                <Conta />
              </SomenteLogado>
            }
          />
          {Estilo && <Route path="/estilo" element={<Estilo />} />}
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
