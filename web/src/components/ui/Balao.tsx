import type { ReactNode } from 'react'

interface Props {
  autor: 'meu' | 'outro'
  hora?: string
  // Mensagem em que fui marcado: borda e sombra vermelhas.
  destaque?: boolean
  children: ReactNode
}

// Meu balao: vermelho, a direita. Do outro: papel, a esquerda.
export function Balao({ autor, hora, destaque, children }: Props) {
  const meu = autor === 'meu'
  return (
    <div className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-cordel border-2 px-3 py-2 shadow-carimbo-pequeno ${
          destaque ? 'border-vermelho' : 'border-borda'
        } ${meu ? 'bg-vermelho text-sobre-vermelho' : 'bg-superficie text-tinta'}`}
      >
        <p className="whitespace-pre-wrap break-words">{children}</p>
        {hora && <p className="mt-1 text-right text-xs opacity-80">{hora}</p>}
      </div>
    </div>
  )
}
