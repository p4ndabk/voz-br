import { Link } from 'react-router-dom'
import { IndicadorRelays } from '@/components/ui/IndicadorRelays'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'

export function Inicio() {
  const dentro = useSessao((s) => s.fase === 'dentro')
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-between px-4 py-10">
      <div className="flex flex-1 flex-col items-start justify-center gap-6">
        <h1 className="border-2 border-borda bg-tinta px-4 py-1 font-display text-6xl text-fundo shadow-carimbo">
          {t.marca}
        </h1>
        <p className="font-display text-3xl leading-tight">{t.lema}</p>
        <p className="text-lg text-tinta-suave">{t.descricao}</p>
        <Link
          to={dentro ? '/conversas' : '/entrar'}
          className="inline-flex rounded-cordel border-2 border-borda bg-vermelho px-6 py-3 text-lg font-bold text-sobre-vermelho shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {dentro ? t.conversas.titulo : t.entrar}
        </Link>
      </div>
      <footer className="pt-10">
        <IndicadorRelays />
      </footer>
    </main>
  )
}
