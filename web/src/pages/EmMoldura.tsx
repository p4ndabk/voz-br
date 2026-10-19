import { t } from '@/i18n/pt-BR'

// Mostrado no lugar do app quando a pagina foi aberta dentro de outro site.
export function EmMoldura() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 p-6">
      <p>{t.moldura.texto}</p>
      <a
        href={window.location.href}
        target="_top"
        className="rounded-cordel border-2 border-borda bg-superficie px-4 py-2 font-bold shadow-carimbo-pequeno"
      >
        {t.moldura.abrir}
      </a>
    </main>
  )
}
