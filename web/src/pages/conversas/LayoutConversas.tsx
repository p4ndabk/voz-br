import { useEffect } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { ListaConversas } from './ListaConversas'

const botao =
  'inline-flex items-center rounded-cordel border-2 border-borda px-3 py-1.5 text-sm font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

// Duas colunas como no WhatsApp Web: lista na lateral, conversa no meio.
// RN-WEB-LAYOUT-001: em tela larga as duas aparecem juntas; em tela estreita, uma por vez
// (a lista em /conversas, o conteudo em /conversas/...).
export function LayoutConversas() {
  const carregar = useConversas((s) => s.carregar)
  const naLista = useMatch({ path: '/conversas', end: true }) !== null

  // RN-WEB-LAYOUT-003: a lista pertence ao layout e continua montada ao trocar de conversa.
  useEffect(() => {
    void carregar()
  }, [carregar])

  return (
    <div className="mx-auto flex h-dvh max-w-[1400px] border-x-2 border-borda bg-fundo">
      <aside
        aria-label={t.conversas.titulo}
        data-testid="coluna-lista"
        className={`${naLista ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-borda bg-superficie md:flex md:w-96 md:shrink-0 md:border-r-2`}
      >
        <header className="flex flex-col gap-3 border-b-2 border-borda p-4">
          <h1 className="font-display text-3xl">{t.conversas.titulo}</h1>
          <nav className="flex flex-wrap gap-2">
            <Link to="/conversas/nova" className={`${botao} bg-vermelho text-sobre-vermelho`}>
              {t.conversas.nova}
            </Link>
            <Link to="/meu-codigo" className={`${botao} bg-superficie`}>
              {t.conversas.meuCodigo}
            </Link>
            <Link to="/conta" className={`${botao} bg-superficie`}>
              {t.minhaConta}
            </Link>
          </nav>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ListaConversas />
        </div>
      </aside>

      <section
        data-testid="coluna-conversa"
        className={`${naLista ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}
      >
        <Outlet />
      </section>
    </div>
  )
}
