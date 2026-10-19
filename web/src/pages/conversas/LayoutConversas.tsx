import { useEffect, useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { Link, Outlet, useMatch } from 'react-router-dom'
import { marcarIconeDaAba } from '@/conversas/iconeDaAba'
import { useConversas } from '@/conversas/useConversas'
import { useGrupos } from '@/grupos/useGrupos'
import { t } from '@/i18n/pt-BR'
import { ListaConversas } from './ListaConversas'
import { MenuConta } from './MenuConta'
import { useAlturaVisivel } from './useAlturaVisivel'

const botao =
  'inline-flex items-center rounded-cordel border-2 border-borda px-3 py-1.5 text-sm font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

// Duas colunas como no WhatsApp Web: lista na lateral, conversa no meio.
// RN-WEB-LAYOUT-001: em tela larga as duas aparecem juntas; em tela estreita, uma por vez
// (a lista em /conversas, o conteudo em /conversas/...).
export function LayoutConversas() {
  const carregar = useConversas((s) => s.carregar)
  const carregarGrupos = useGrupos((s) => s.carregar)
  const naLista = useMatch({ path: '/conversas', end: true }) !== null
  const [busca, setBusca] = useState('')
  const estiloVisivel = useAlturaVisivel()

  // RN-WEB-CONVERSAS-010: o titulo da aba mostra quantas mensagens ainda nao li.
  const naoLidasConversas = useConversas((s) =>
    s.conversas.reduce((soma, c) => soma + (c.naoLidas ?? 0), 0),
  )
  const naoLidasGrupos = useGrupos((s) => s.grupos.reduce((soma, g) => soma + (g.naoLidas ?? 0), 0))
  const naoLidas = naoLidasConversas + naoLidasGrupos
  useEffect(() => {
    document.title = naoLidas > 0 ? `(${naoLidas}) ${t.marca}` : t.marca
    marcarIconeDaAba(naoLidas > 0)
    return () => {
      document.title = t.marca
      marcarIconeDaAba(false)
    }
  }, [naoLidas])

  // RN-WEB-LAYOUT-003: a lista pertence ao layout e continua montada ao trocar de conversa.
  useEffect(() => {
    void carregar()
    void carregarGrupos()
  }, [carregar, carregarGrupos])

  return (
    <div
      style={estiloVisivel}
      className="mx-auto flex h-dvh w-full max-w-[1400px] border-x-2 border-borda bg-fundo"
    >
      <aside
        aria-label={t.conversas.titulo}
        data-testid="coluna-lista"
        className={`${naLista ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-borda bg-superficie md:flex md:w-96 md:shrink-0 md:border-r-2`}
      >
        <header className="flex flex-col gap-3 border-b-2 border-borda p-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" aria-label={t.marca}>
              <Logo tamanho={36} comPalavra palavra={t.marca} />
            </Link>
            <h1 className="font-display text-2xl">{t.conversas.titulo}</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link to="/conversas/nova" className={`${botao} bg-vermelho text-sobre-vermelho`}>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="mr-2 h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
              >
                <path d="M8 2v12M2 8h12" />
              </svg>
              {t.conversas.nova}
            </Link>
            <Link to="/conversas/grupo/novo" className={`${botao} bg-superficie`}>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="mr-2 h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
              >
                <path d="M8 2v12M2 8h12" />
              </svg>
              {t.grupos.novo}
            </Link>
          </nav>
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
