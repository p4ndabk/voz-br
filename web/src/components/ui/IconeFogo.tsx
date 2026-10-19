// Chama em uma cor so (a do texto, `currentColor`): acompanha o tema claro e escuro, sem emoji colorido.
export function IconeFogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12 2C12 2 5 8.5 5 14.5a7 7 0 0 0 14 0c0-3-1.5-5.3-3-7-.3 1.5-1 2.5-2 3.1C14.6 7.5 13.5 4.2 12 2ZM12 20.5c-2 0-3.5-1.5-3.5-3.3 0-1.8 1.5-2.9 2.5-4.4 1.2 1.2 4.5 2.6 4.5 4.4 0 1.8-1.5 3.3-3.5 3.3Z"
      />
    </svg>
  )
}
