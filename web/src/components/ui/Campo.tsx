import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  ajuda?: string
  erro?: string
}

export function Campo({ rotulo, ajuda, erro, className = '', ...resto }: Props) {
  const id = useId()
  const idAjuda = `${id}-ajuda`
  const idErro = `${id}-erro`
  const descricao = [ajuda ? idAjuda : '', erro ? idErro : ''].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-bold">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao || undefined}
        className={`rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave ${className}`}
        {...resto}
      />
      {ajuda && (
        <p id={idAjuda} className="text-sm text-tinta-suave">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm font-bold text-vermelho">
          {erro}
        </p>
      )}
    </div>
  )
}
