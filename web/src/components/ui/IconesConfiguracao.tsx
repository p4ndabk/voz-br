import type { ReactNode } from 'react'

// Icones das secoes das configuracoes: traco de uma cor so (`currentColor`), no mesmo estilo.
function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export const IconeConta = () => (
  <Icone>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icone>
)

export const IconePerfil = () => (
  <Icone>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icone>
)

export const IconeCarteira = () => (
  <Icone>
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </Icone>
)

export const IconeRelays = () => (
  <Icone>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <path d="M12 20h.01" />
  </Icone>
)

export const IconeSons = () => (
  <Icone>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icone>
)

export const IconeSeguranca = () => (
  <Icone>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icone>
)

export const IconeAparelhos = () => (
  <Icone>
    <rect x="2" y="4" width="14" height="11" rx="1" />
    <path d="M6 19h6M9 15v4" />
    <rect x="18" y="8" width="4" height="12" rx="1" />
  </Icone>
)
