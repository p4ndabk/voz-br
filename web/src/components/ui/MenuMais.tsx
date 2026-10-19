import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { t } from '@/i18n/pt-BR'

export interface ItemMenu {
  rotulo: string
  // Icone antes do texto (em uma cor so); fica fora do nome lido por leitores de tela.
  icone?: ReactNode
  aoEscolher: () => void
}

// Menu de acoes secundarias, aberto por tres pontinhos na vertical (como no WhatsApp). Fecha com Esc, clique fora ou ao escolher um item.
export function MenuMais({ itens, icone }: { itens: ItemMenu[]; icone?: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
        aria-label={t.mais}
        title={t.mais}
        className="inline-flex h-9 w-9 items-center justify-center rounded-cordel border-2 border-borda bg-superficie shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {icone}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="12" cy="4.5" r="2.3" />
          <circle cx="12" cy="12" r="2.3" />
          <circle cx="12" cy="19.5" r="2.3" />
        </svg>
      </button>
      {aberto && (
        <ul
          id={id}
          role="menu"
          className="absolute right-0 z-20 mt-2 flex min-w-48 flex-col rounded-cordel border-2 border-borda bg-superficie shadow-carimbo"
        >
          {itens.map((item) => (
            <li key={item.rotulo} role="none">
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-fundo"
                onClick={() => {
                  setAberto(false)
                  item.aoEscolher()
                }}
              >
                <span className="flex items-center gap-2">
                  {item.icone}
                  {item.rotulo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
