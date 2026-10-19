interface Props {
  tamanho?: number
  // Mostra a palavra "Voz" ao lado do selo.
  comPalavra?: boolean
  palavra?: string
}

// Selo preto com um balao de fala (a "voz") e a moldura vermelha, no traco do Cordel.
// As cores vem dos tokens (currentColor/variaveis), nada de hexadecimal aqui.
export function Logo({ tamanho = 32, comPalavra = false, palavra = 'Voz' }: Props) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={tamanho}
        height={tamanho}
        viewBox="0 0 32 32"
        role={comPalavra ? undefined : 'img'}
        aria-label={comPalavra ? undefined : palavra}
        aria-hidden={comPalavra ? true : undefined}
        className="shrink-0"
      >
        <rect width="32" height="32" className="fill-tinta" />
        <rect
          x="2.5"
          y="2.5"
          width="27"
          height="27"
          className="fill-none stroke-vermelho"
          strokeWidth="2"
        />
        <path d="M7 8h18v11H15l-5 5v-5H7z" className="fill-fundo" />
        <path d="M11 11h3l2 5 2-5h3l-3.5 7h-3z" className="fill-vermelho" />
      </svg>
      {comPalavra && <span className="font-display text-3xl leading-none">{palavra}</span>}
    </span>
  )
}
