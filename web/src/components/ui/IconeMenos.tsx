// Sinal de menos em uma cor so (`currentColor`), para "Remover da lista".
export function IconeMenos({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="square"
    >
      <path d="M4.5 12h15" />
    </svg>
  )
}
