import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ModalSair } from '@/components/ModalSair'
import {
  IconeAparelhos,
  IconeCarteira,
  IconeConta,
  IconePerfil,
  IconeRelays,
  IconeSeguranca,
  IconeSons,
} from '@/components/ui/IconesConfiguracao'
import { t } from '@/i18n/pt-BR'
import { useAlturaVisivel } from '../conversas/useAlturaVisivel'

const GRUPOS = [
  {
    titulo: t.configuracoes.grupoConta,
    secoes: [
      { caminho: 'conta', rotulo: t.configuracoes.conta, icone: <IconeConta /> },
      { caminho: 'perfil', rotulo: t.configuracoes.perfil, icone: <IconePerfil /> },
      { caminho: 'carteira', rotulo: t.configuracoes.carteira, icone: <IconeCarteira /> },
      { caminho: 'seguranca', rotulo: t.configuracoes.seguranca, icone: <IconeSeguranca /> },
    ],
  },
  {
    titulo: t.configuracoes.grupoApp,
    secoes: [
      { caminho: 'relays', rotulo: t.configuracoes.relays, icone: <IconeRelays /> },
      { caminho: 'sons', rotulo: t.configuracoes.sons, icone: <IconeSons /> },
      {
        caminho: 'sincronizacao',
        rotulo: t.configuracoes.sincronizacao,
        icone: <IconeAparelhos />,
      },
    ],
  },
]

const BASE = '/configuracoes'

function IconeSair() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

// RN-WEB-LAYOUT-008: tela de configuracoes inteira, sem a lista de conversas: menu de secoes de um
// lado e a secao escolhida do outro. No celular, uma de cada vez (o menu em /configuracoes).
export function LayoutConfiguracoes() {
  const { pathname } = useLocation()
  const estiloVisivel = useAlturaVisivel()
  const [sair, setSair] = useState(false)
  const noMenu = pathname.replace(/\/$/, '') === BASE
  // Em tela larga o indice mostra "Minha conta"; por isso ela vale como ativa tambem nele.
  const secaoAtual = noMenu ? 'conta' : pathname.split('/')[2]

  return (
    <div
      style={estiloVisivel}
      className="mx-auto flex h-dvh w-full max-w-[1400px] border-x-2 border-borda bg-fundo"
    >
      <aside
        aria-label={t.configuracoes.titulo}
        data-testid="menu-configuracoes"
        className={`${noMenu ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-borda bg-superficie md:flex md:w-72 md:shrink-0 md:border-r-2`}
      >
        <header className="flex items-center gap-3 p-4 pb-2">
          <Link
            to="/conversas"
            aria-label={t.configuracoes.voltarConversas}
            className="rounded-cordel border-2 border-borda px-2.5 py-1 font-bold shadow-carimbo-pequeno transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            ←
          </Link>
          <h1 className="truncate font-display text-3xl md:text-2xl">{t.configuracoes.titulo}</h1>
        </header>
        <nav aria-label={t.configuracoes.menu} className="flex-1 overflow-y-auto px-3 pb-3">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="mt-4 first:mt-2">
              <p className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wider text-tinta-suave">
                {grupo.titulo}
              </p>
              <ul className="flex flex-col gap-1">
                {grupo.secoes.map(({ caminho, rotulo, icone }) => {
                  const ativa = secaoAtual === caminho
                  return (
                    <li key={caminho}>
                      <Link
                        to={`${BASE}/${caminho}`}
                        aria-current={ativa ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-cordel border-2 px-3 py-2.5 font-bold transition-all duration-150 ${
                          ativa
                            ? // No celular, no menu (nada aberto ainda), ninguem fica destacado.
                              noMenu
                              ? 'border-transparent hover:bg-fundo md:border-borda md:bg-fundo md:shadow-carimbo-pequeno'
                              : 'border-borda bg-fundo shadow-carimbo-pequeno'
                            : 'border-transparent hover:bg-fundo'
                        }`}
                      >
                        <span className={ativa ? 'text-vermelho' : 'text-tinta-suave'}>
                          {icone}
                        </span>
                        <span className="flex-1">{rotulo}</span>
                        <span aria-hidden="true" className="text-tinta-suave md:hidden">
                          ›
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={() => setSair(true)}
            className="flex w-full items-center gap-3 rounded-cordel border-2 border-transparent px-3 py-2.5 text-left font-bold text-vermelho transition-colors hover:border-borda hover:bg-fundo"
          >
            <IconeSair />
            {t.configuracoes.sair}
          </button>
        </div>
        <ModalSair aberto={sair} aoFechar={() => setSair(false)} />
      </aside>

      <section
        data-testid="conteudo-configuracoes"
        className={`${noMenu ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}
      >
        {/* A secao entra com um deslize curto; trocar de secao nao e um corte seco. */}
        <div key={pathname} className="secao-entra flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
