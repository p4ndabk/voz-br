import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { Link, Outlet, useMatch } from 'react-router-dom'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { ListaConversas } from './ListaConversas'
import { MenuConta } from './MenuConta'

// Duas colunas como no WhatsApp Web: lista na lateral, conversa no meio.
// RN-WEB-LAYOUT-001: em tela larga as duas aparecem juntas; em tela estreita, uma por vez
// (a lista em /conversas, o conteudo em /conversas/...).
export function LayoutConversas() {
  const carregar = useConversas((s) => s.carregar)
  const naLista = useMatch({ path: '/conversas', end: true }) !== null
  const [busca, setBusca] = useState('')

  // RN-WEB-LAYOUT-003: a lista pertence ao layout e continua montada ao trocar de conversa.
  useEffect(() => {
    void carregar()
  }, [carregar])

  return (
    <div className="mx-auto flex h-dvh max-w-[1400px] border-x-2 border-borda bg-fundo">
      <aside
        aria-label={t.conversas.titulo}
        data-testid="coluna-lista"
        className={`${naLista ? 'flex' : 'hidden'} relative w-full min-w-0 flex-col border-borda bg-superficie md:flex md:w-96 md:shrink-0 md:border-r-2`}
      >
        <header className="flex flex-col gap-3 border-b-2 border-borda p-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" aria-label={t.marca}>
              <Logo tamanho={36} comPalavra palavra={t.marca} />
            </Link>
            <h1 className="font-display text-2xl">{t.conversas.titulo}</h1>
          </div>
          <input
            type="search"
            aria-label={t.conversas.buscar}
            placeholder={t.conversas.buscar}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-cordel border-2 border-borda bg-fundo px-3 py-2"
          />
        </header>
        <div className="flex-1 overflow-y-auto">
          <ListaConversas busca={busca} aoAbrir={() => setBusca('')} />
        </div>
        {/* Botao + fixo no canto da lista: ao alcance do polegar no celular. */}
        <Link
          to="/conversas/nova"
          aria-label={t.conversas.nova}
          title={t.conversas.nova}
          className="absolute bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-borda bg-vermelho text-3xl font-bold leading-none text-sobre-vermelho shadow-carimbo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span aria-hidden="true">+</span>
        </Link>
        <MenuConta />
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
