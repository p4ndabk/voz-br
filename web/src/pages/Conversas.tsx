import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Identidade } from '@/components/ui/Identidade'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'

const formatadorHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const formatadorDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function horario(segundos: number): string {
  const data = new Date(segundos * 1000)
  const hoje = new Date()
  return data.toDateString() === hoje.toDateString()
    ? formatadorHora.format(data)
    : formatadorDia.format(data)
}

export function Conversas() {
  const conversas = useConversas((s) => s.conversas)
  const carregada = useConversas((s) => s.carregada)
  const carregar = useConversas((s) => s.carregar)

  useEffect(() => {
    void carregar()
  }, [carregar])

  const botaoLink =
    'inline-flex rounded-cordel border-2 border-borda px-4 py-2 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl">{t.conversas.titulo}</h1>
        <nav className="flex flex-wrap gap-3">
          <Link to="/conversas/nova" className={`${botaoLink} bg-vermelho text-sobre-vermelho`}>
            {t.conversas.nova}
          </Link>
          <Link to="/meu-codigo" className={`${botaoLink} bg-superficie`}>
            {t.conversas.meuCodigo}
          </Link>
          <Link to="/conta" className={`${botaoLink} bg-superficie`}>
            {t.minhaConta}
          </Link>
        </nav>
      </header>

      {carregada && conversas.length === 0 && (
        <p className="rounded-cordel border-2 border-dashed border-borda p-6 text-center text-lg">
          {t.conversas.vazio}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {conversas.map((c) => (
          <li
            key={c.pubkey}
            className="flex items-center justify-between gap-3 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo-pequeno"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <Identidade pubkey={c.pubkey} />
              <p className="truncate pl-1 text-sm text-tinta-suave">
                {c.trecho ?? t.conversas.semMensagens}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {c.novaPessoa && (
                <span className="rounded-cordel border-2 border-borda bg-vermelho px-2 text-xs font-bold uppercase text-sobre-vermelho">
                  {t.conversas.novaPessoa}
                </span>
              )}
              {c.ultimaMensagemEm && (
                <span className="text-xs text-tinta-suave">{horario(c.ultimaMensagemEm)}</span>
              )}
              <Link
                to={`/conversas/${c.pubkey}`}
                className="font-bold underline underline-offset-4"
              >
                {t.conversas.abrir}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
