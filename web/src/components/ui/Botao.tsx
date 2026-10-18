import type { ButtonHTMLAttributes } from 'react'

type Variante = 'principal' | 'secundario'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-cordel border-2 border-borda px-5 py-2.5 ' +
  'font-bold shadow-carimbo transition-transform select-none ' +
  'enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

const variantes: Record<Variante, string> = {
  principal: 'bg-vermelho text-sobre-vermelho',
  secundario: 'bg-superficie text-tinta',
}

export function Botao({
  variante = 'principal',
  className = '',
  type = 'button',
  ...resto
}: Props) {
  return <button type={type} className={`${base} ${variantes[variante]} ${className}`} {...resto} />
}
