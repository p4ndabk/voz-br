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
  // O foco vai ao painel so quando o dialogo abre. `aoFechar` costuma mudar a cada renderizacao do
  // pai, entao fica numa ref: se estivesse nas dependencias, digitar num campo tiraria o foco dele.
  const fechar = useRef(aoFechar)
  useEffect(() => {
    fechar.current = aoFechar
  })

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    painel.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [aberto])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4">
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo sm:p-6"
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
