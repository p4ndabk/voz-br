import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { t } from '@/i18n/pt-BR'

export interface ItemMenu {
  rotulo: string
  aoEscolher: () => void
}

// Menu de acoes secundarias. Fecha com Esc, clique fora ou ao escolher um item.
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
        className="inline-flex items-center gap-1 rounded-cordel border-2 border-borda bg-superficie px-3 py-1.5 text-sm font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {icone}
        {t.mais}
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
                {item.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
