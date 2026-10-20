import { Link, useMatch, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { fotoLiberada, type Conversa } from '@/conversas/armazem'
import { filtrarConversas } from '@/conversas/buscar'
import { horarioNaLista } from '@/conversas/dias'
import { useConversas } from '@/conversas/useConversas'
import { useGrupos } from '@/grupos/useGrupos'
import type { Grupo } from '@/grupos/tipos'
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

// RN-WEB-GRUPOS-004: o convite fica separado, no topo; a foto de quem convidou nao e baixada.
function ItemConvite({ grupo }: { grupo: Grupo }) {
  const perfil = usePerfil(grupo.admin)
  const { texto: quem } = nomeExibido(perfil, grupo.admin)
  return (
    <li>
      <Link
        to={`/conversas/grupo/${grupo.id}`}
        className="flex items-center gap-3 border-b-2 border-borda bg-fundo px-4 py-3 hover:bg-superficie"
      >
        <Avatar semente={grupo.id} tamanho={48} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold">{grupo.nome}</span>
          <span className="truncate text-sm text-tinta-suave">
            {grupo.aceitou ? t.grupos.aguardando : t.grupos.convidou(quem)}
          </span>
        </span>
        <span className="shrink-0 rounded-cordel border-2 border-borda bg-vermelho px-1.5 text-[11px] font-bold uppercase text-sobre-vermelho">
          {t.grupos.convites}
        </span>
      </Link>
    </li>
  )
}

function ItemGrupo({ grupo, ativa }: { grupo: Grupo; ativa: boolean }) {
  const naoLidas = grupo.naoLidas ?? 0
  return (
    <li>
      <Link
        to={`/conversas/grupo/${grupo.id}`}
        aria-current={ativa ? 'page' : undefined}
        className={`flex items-center gap-3 border-b-2 border-borda px-4 py-3 hover:bg-fundo ${
          ativa ? 'border-l-8 border-l-vermelho bg-fundo pl-2' : ''
        }`}
      >
        <Avatar semente={grupo.id} tamanho={48} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-bold">{grupo.nome}</span>
            {grupo.ultimaMensagemEm && (
              <span className="shrink-0 text-xs text-tinta-suave">
                {horarioNaLista(grupo.ultimaMensagemEm)}
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span
              className={`truncate text-sm ${naoLidas > 0 ? 'font-bold text-tinta' : 'text-tinta-suave'}`}
            >
              {grupo.trecho ?? t.grupos.pessoas(grupo.membros.length)}
            </span>
            {naoLidas > 0 && (
              <span
                aria-label={t.conversas.naoLidas(naoLidas)}
                className="shrink-0 rounded-full border-2 border-borda bg-vermelho px-2 text-xs font-bold text-sobre-vermelho"
              >
                {naoLidas}
              </span>
            )}
            <span className="shrink-0 rounded-cordel border-2 border-borda px-1.5 text-[11px] font-bold uppercase">
              {t.grupos.grupo}
            </span>
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
  const grupoAberto = useMatch('/conversas/grupo/:id')?.params.id
  const grupos = useGrupos((s) => s.grupos)

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

  // Grupo de que sai sem nunca ter conversado nao precisa ficar na lista.
  const termo = busca.trim().toLowerCase()
  const gruposVisiveis = grupos.filter(
    (g) =>
      g.estado !== 'convidado' &&
      !g.excluido &&
      !(g.estado === 'saiu' && g.ultimaMensagemEm === undefined) &&
      g.nome.toLowerCase().includes(termo),
  )
  const convites = grupos.filter((g) => g.estado === 'convidado' && !g.excluido)
  const lista = [
    ...visiveis.map((c) => ({
      tipo: 'conversa' as const,
      c,
      em: c.ultimaMensagemEm ?? c.criadaEm,
    })),
    ...gruposVisiveis.map((g) => ({
      tipo: 'grupo' as const,
      g,
      em: g.ultimaMensagemEm ?? g.alteradoEm ?? g.criadoEm,
    })),
  ].sort((a, b) => b.em - a.em)

  if (
    carregada &&
    conversas.length === 0 &&
    lista.length === 0 &&
    convites.length === 0 &&
    !chave?.ok
  ) {
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
      {convites.length > 0 && termo === '' && (
        <ul aria-label={t.grupos.convites}>
          {convites.map((g) => (
            <ItemConvite key={g.id} grupo={g} />
          ))}
        </ul>
      )}
      {busca.trim() !== '' && lista.length === 0 && !chave?.ok && (
        <p className="m-4 text-center text-tinta-suave">{t.conversas.nadaEncontrado}</p>
      )}
      <ul aria-label={t.conversas.lista}>
        {lista.map((item) =>
          item.tipo === 'conversa' ? (
            <Item key={item.c.pubkey} conversa={item.c} ativa={item.c.pubkey === aberta} />
          ) : (
            <ItemGrupo key={item.g.id} grupo={item.g} ativa={item.g.id === grupoAberto} />
          ),
        )}
      </ul>
    </>
  )
}
