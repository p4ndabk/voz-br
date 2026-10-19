import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ModalSair } from '@/components/ModalSair'
import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfil } from '@/nostr/usePerfil'
import { useSessao } from '@/nostr/useSessao'

const item =
  'inline-flex items-center rounded-cordel border-2 border-borda bg-superficie px-3 py-1.5 text-sm font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'

const ativo = 'bg-tinta text-fundo'

// RN-WEB-LAYOUT-004: perfil, codigo e saida ficam sempre no pe da lateral das conversas.
export function MenuConta() {
  const assinante = useSessao((s) => s.assinante)
  const perfil = usePerfil(assinante?.pubkey ?? '')
  const [modalSair, setModalSair] = useState(false)
  if (!assinante) return null
  const { texto: nome } = nomeExibido(perfil, assinante.pubkey)

  return (
    <footer className="flex flex-col gap-3 border-t-2 border-borda bg-superficie p-4">
      <Link to="/conta" className="flex items-center gap-3" aria-label={t.minhaConta}>
        <Avatar semente={assinante.pubkey} foto={perfil?.foto} tamanho={40} />
        <span className="min-w-0 flex-1 truncate font-bold">{nome}</span>
      </Link>
      <nav aria-label={t.minhaConta} className="flex flex-wrap gap-2">
        <NavLink
          to="/conta/perfil"
          className={({ isActive }) => `${item} ${isActive ? ativo : ''}`}
        >
          {t.conta.editarPerfil}
        </NavLink>
        <NavLink to="/meu-codigo" className={({ isActive }) => `${item} ${isActive ? ativo : ''}`}>
          {t.conversas.meuCodigo}
        </NavLink>
        <button type="button" className={item} onClick={() => setModalSair(true)}>
          {t.conta.sair}
        </button>
      </nav>
      <ModalSair aberto={modalSair} aoFechar={() => setModalSair(false)} />
    </footer>
  )
}
