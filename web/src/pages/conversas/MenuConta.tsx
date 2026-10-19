import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { IconeEngrenagem } from '@/components/ui/IconeEngrenagem'
import { IconeQr } from '@/components/ui/IconeQr'
import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfil } from '@/nostr/usePerfil'
import { useSessao } from '@/nostr/useSessao'

const botao =
  'rounded-cordel border-2 border-borda bg-superficie shadow-carimbo-pequeno hover:bg-fundo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

const ativo = 'bg-fundo border-l-8 border-l-vermelho'

// RN-WEB-LAYOUT-004: o pe da lateral tem so dois botoes claros: a conta (nome, foto e a engrenagem de
// configuracoes) e o codigo para o amigo. Perfil, relays, senha e sair ficam dentro da conta.
export function MenuConta() {
  const assinante = useSessao((s) => s.assinante)
  const perfil = usePerfil(assinante?.pubkey ?? '')
  if (!assinante) return null
  const { texto: nome } = nomeExibido(perfil, assinante.pubkey)

  return (
    <footer className="flex items-stretch gap-2 border-t-2 border-borda bg-superficie p-3">
      <NavLink
        to="/configuracoes"
        aria-label={t.minhaConta}
        className={({ isActive }) =>
          `${botao} flex min-w-0 flex-1 items-center gap-3 px-3 py-2 ${isActive ? ativo : ''}`
        }
      >
        <Avatar semente={assinante.pubkey} foto={perfil?.foto} tamanho={40} />
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate font-bold">{nome}</span>
          <span className="truncate text-xs text-tinta-suave">{t.conta.configuracoes}</span>
        </span>
        <IconeEngrenagem className="h-6 w-6 shrink-0" />
      </NavLink>
      <NavLink
        to="/meu-codigo"
        aria-label={t.conversas.meuCodigo}
        title={t.conversas.meuCodigo}
        className={({ isActive }) =>
          `${botao} flex w-14 shrink-0 items-center justify-center ${isActive ? ativo : ''}`
        }
      >
        <IconeQr className="h-6 w-6" />
      </NavLink>
    </footer>
  )
}
