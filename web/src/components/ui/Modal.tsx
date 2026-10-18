import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '@/i18n/pt-BR'
import { Botao } from './Botao'

interface Props {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  acoes?: ReactNode
  children: ReactNode
}

export function Modal({ aberto, titulo, aoFechar, acoes, children }: Props) {
  const idTitulo = useId()
  const painel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    painel.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4">
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="w-full max-w-md rounded-cordel border-2 border-borda bg-superficie p-6 shadow-carimbo"
      >
        <h2 id={idTitulo} className="mb-3 font-display text-2xl">
          {titulo}
        </h2>
        <div className="mb-5">{children}</div>
        <div className="flex flex-wrap justify-end gap-3">
          {acoes}
          <Botao variante="secundario" onClick={aoFechar}>
            {t.modal.fechar}
          </Botao>
        </div>
      </div>
    </div>
  )
}
