import { Link } from 'react-router-dom'
import { t } from '@/i18n/pt-BR'

export function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-4">
      <h1 className="font-display text-4xl">{t.naoEncontrada.titulo}</h1>
      <Link to="/" className="font-bold underline underline-offset-4">
        {t.naoEncontrada.voltar}
      </Link>
    </main>
  )
}
