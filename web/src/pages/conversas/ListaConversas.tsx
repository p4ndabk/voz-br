import { Link, useMatch, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { fotoLiberada, type Conversa } from '@/conversas/armazem'
import { filtrarConversas } from '@/conversas/buscar'
import { horarioNaLista } from '@/conversas/dias'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { lerChaveDoAmigo } from '@/nostr/contatos'
import { nomeExibido, npubAbreviada } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'
import { useSessao } from '@/nostr/useSessao'
import { usePerfil } from '@/nostr/usePerfil'

function Item({ conversa, ativa }: { conversa: Conversa; ativa: boolean }) {
  const perfil = usePerfil(conversa.pubkey)
  const { texto: nome } = nomeExibido(perfil, conversa.pubkey)
  const naoLidas = conversa.naoLidas ?? 0

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
        <Avatar
          semente={conversa.pubkey}
          foto={fotoLiberada(conversa) ? perfil?.foto : undefined}
          tamanho={48}
        />
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
            <span
              className={`truncate text-sm ${naoLidas > 0 ? 'font-bold text-tinta' : 'text-tinta-suave'}`}
            >
              {conversa.trecho ?? t.conversas.semMensagens}
            </span>
            {naoLidas > 0 && (
              <span
                aria-label={t.conversas.naoLidas(naoLidas)}
                className="shrink-0 rounded-full border-2 border-borda bg-vermelho px-2 text-xs font-bold text-sobre-vermelho"
              >
                {naoLidas}
              </span>
            )}
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

interface Propriedades {
  busca?: string
  aoAbrir?: () => void
}

// RN-WEB-LAYOUT-006 e RN-WEB-CONVERSAS-009: filtra sem sair da lista; uma chave colada vira "Conversar com...".
export function ListaConversas({ busca = '', aoAbrir }: Propriedades) {
  const navigate = useNavigate()
  const conversas = useConversas((s) => s.conversas)
  const carregada = useConversas((s) => s.carregada)
  const abrirOuCriar = useConversas((s) => s.abrirOuCriar)
  const perfis = usePerfis((s) => s.perfis)
  const minhaPubkey = useSessao((s) => s.assinante?.pubkey ?? '')
  const aberta = useMatch('/conversas/:pubkey')?.params.pubkey

  const nomes: Record<string, string | undefined> = {}
  for (const c of conversas) {
    const { texto, temNome } = nomeExibido(perfis[c.pubkey], c.pubkey)
    nomes[c.pubkey] = temNome ? texto : undefined
  }
  const visiveis = filtrarConversas(conversas, busca, nomes)
  const chave = busca.trim() === '' ? null : lerChaveDoAmigo(busca, minhaPubkey)

  const conversarCom = async (pubkey: string, relays: string[]) => {
    const { conversa } = await abrirOuCriar(pubkey, relays)
    aoAbrir?.()
    navigate(`/conversas/${conversa.pubkey}`)
  }

  if (carregada && conversas.length === 0 && !chave?.ok) {
    return (
      <p className="m-4 rounded-cordel border-2 border-dashed border-borda p-6 text-center">
        {t.conversas.vazio}
      </p>
    )
  }

  return (
    <>
      {chave?.ok && (
        <button
          type="button"
          onClick={() => void conversarCom(chave.pubkey, chave.relays)}
          className="flex w-full items-center gap-3 border-b-2 border-borda bg-fundo px-4 py-3 text-left font-bold hover:bg-superficie"
        >
          {t.conversas.conversarCom(npubAbreviada(chave.pubkey))}
        </button>
      )}
      {busca.trim() !== '' && visiveis.length === 0 && !chave?.ok && (
        <p className="m-4 text-center text-tinta-suave">{t.conversas.nadaEncontrado}</p>
      )}
      <ul aria-label={t.conversas.lista}>
        {visiveis.map((c) => (
          <Item key={c.pubkey} conversa={c} ativa={c.pubkey === aberta} />
        ))}
      </ul>
    </>
  )
}
