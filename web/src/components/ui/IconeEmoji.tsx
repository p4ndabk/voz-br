// Carinha sorrindo em uma cor so (`currentColor`), para abrir os emojis.
export function IconeEmoji({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5c1 1.5 2.3 2.2 4 2.2s3-.7 4-2.2" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="3" />
    </svg>
  )
}
