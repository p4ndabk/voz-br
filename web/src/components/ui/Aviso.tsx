import type { ReactNode } from 'react'

interface Props {
  tom?: 'info' | 'erro'
  children: ReactNode
}

export function Aviso({ tom = 'info', children }: Props) {
  const erro = tom === 'erro'
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className={`rounded-cordel border-2 border-borda px-4 py-3 ${
        erro ? 'bg-vermelho text-sobre-vermelho' : 'bg-superficie text-tinta'
      }`}
    >
      {children}
    </div>
  )
}
