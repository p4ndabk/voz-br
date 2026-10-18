import { Link, useMatch } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import type { Conversa } from '@/conversas/armazem'
import { horarioNaLista } from '@/conversas/dias'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfil } from '@/nostr/usePerfil'

function Item({ conversa, ativa }: { conversa: Conversa; ativa: boolean }) {
  const perfil = usePerfil(conversa.pubkey)
  const { texto: nome } = nomeExibido(perfil, conversa.pubkey)

  return (
    <li>
      {/* RN-WEB-LAYOUT-002: a conversa aberta fica destacada (e marcada para leitores de tela). */}
      <Link
        to={`/conversas/${conversa.pubkey}`}
        aria-current={ativa ? 'page' : undefined}
        className={`flex items-center gap-3 border-b-2 border-borda px-4 py-3 hover:bg-fundo ${
          ativa ? 'border-l-8 border-l-vermelho bg-fundo pl-2' : ''
        }`}
      >
        <Avatar semente={conversa.pubkey} foto={perfil?.foto} tamanho={48} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-bold">{nome}</span>
            {conversa.ultimaMensagemEm && (
              <span className="shrink-0 text-xs text-tinta-suave">
                {horarioNaLista(conversa.ultimaMensagemEm)}
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-tinta-suave">
              {conversa.trecho ?? t.conversas.semMensagens}
            </span>
            {conversa.novaPessoa && (
              <span className="shrink-0 rounded-cordel border-2 border-borda bg-vermelho px-1.5 text-[11px] font-bold uppercase text-sobre-vermelho">
                {t.conversas.novaPessoa}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

export function ListaConversas() {
  const conversas = useConversas((s) => s.conversas)
  const carregada = useConversas((s) => s.carregada)
  const aberta = useMatch('/conversas/:pubkey')?.params.pubkey

  if (carregada && conversas.length === 0) {
    return (
      <p className="m-4 rounded-cordel border-2 border-dashed border-borda p-6 text-center">
        {t.conversas.vazio}
      </p>
    )
  }

  return (
    <ul aria-label={t.conversas.lista}>
      {conversas.map((c) => (
        <Item key={c.pubkey} conversa={c} ativa={c.pubkey === aberta} />
      ))}
    </ul>
  )
}
