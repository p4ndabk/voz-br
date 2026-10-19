import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ModalSair } from '@/components/ModalSair'
import { t } from '@/i18n/pt-BR'
import { useAlturaVisivel } from '../conversas/useAlturaVisivel'

const SECOES = [
  { caminho: 'conta', rotulo: t.configuracoes.conta },
  { caminho: 'perfil', rotulo: t.configuracoes.perfil },
  { caminho: 'carteira', rotulo: t.configuracoes.carteira },
  { caminho: 'relays', rotulo: t.configuracoes.relays },
  { caminho: 'sons', rotulo: t.configuracoes.sons },
  { caminho: 'seguranca', rotulo: t.configuracoes.seguranca },
  { caminho: 'sincronizacao', rotulo: t.configuracoes.sincronizacao },
] as const

const BASE = '/configuracoes'

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
        className={`${noMenu ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-borda bg-superficie md:flex md:w-80 md:shrink-0 md:border-r-2`}
      >
        <header className="flex items-center gap-3 border-b-2 border-borda p-4">
          <Link
            to="/conversas"
            aria-label={t.configuracoes.voltarConversas}
            className="rounded-cordel border-2 border-borda px-2.5 py-1 font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            ←
          </Link>
          <h1 className="font-display text-3xl">{t.configuracoes.titulo}</h1>
        </header>
        <nav aria-label={t.configuracoes.menu} className="flex-1 overflow-y-auto">
          <ul>
            {SECOES.map(({ caminho, rotulo }) => {
              const ativa = secaoAtual === caminho
              return (
                <li key={caminho}>
                  <Link
                    to={`${BASE}/${caminho}`}
                    aria-current={ativa ? 'page' : undefined}
                    className={`flex items-center justify-between border-b-2 border-borda px-4 py-3.5 font-bold hover:bg-fundo ${
                      // No celular, no menu (nada aberto ainda), ninguem fica destacado.
                      ativa
                        ? noMenu
                          ? 'md:border-l-8 md:border-l-vermelho md:bg-fundo md:pl-2'
                          : 'border-l-8 border-l-vermelho bg-fundo pl-2'
                        : ''
                    }`}
                  >
                    {rotulo}
                    <span aria-hidden="true" className="text-tinta-suave md:hidden">
                      ›
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t-2 border-borda p-3">
          <button
            type="button"
            onClick={() => setSair(true)}
            className="w-full rounded-cordel border-2 border-borda bg-superficie px-4 py-2.5 text-left font-bold shadow-carimbo-pequeno hover:bg-fundo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            {t.configuracoes.sair}
          </button>
        </div>
        <ModalSair aberto={sair} aoFechar={() => setSair(false)} />
      </aside>

      <section
        data-testid="conteudo-configuracoes"
        className={`${noMenu ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}
      >
        <Outlet />
      </section>
    </div>
  )
}
