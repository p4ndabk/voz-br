import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Fogo } from '@/components/ui/Fogo'
import { IconeFogo } from '@/components/ui/IconeFogo'
import { IconeMenos } from '@/components/ui/IconeMenos'
import { MenuMais } from '@/components/ui/MenuMais'
import { Modal } from '@/components/ui/Modal'
import { Selo } from '@/components/ui/Selo'
import { Avatar } from '@/components/ui/Avatar'
import { registrarQueima } from '@/conversas/queima'
import { tocarFogo } from '@/conversas/som'
import { useMensagens } from '@/conversas/useMensagens'
import {
  aceitarConvite,
  encerrarGrupo,
  encerrarGrupoEApagar,
  excluirGrupo,
  limparMeuHistorico,
  limparParaTodos,
  recusarConvite,
  sairDoGrupo,
} from '@/grupos/acoes'
import { enviarMensagemDeGrupo, reenviarMensagemDeGrupo } from '@/grupos/enviar'
import { chaveDaConversa } from '@/grupos/tipos'
import { useGrupos } from '@/grupos/useGrupos'
import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'
import { useSessao } from '@/nostr/useSessao'
import { CampoMensagem } from '../conversa/CampoMensagem'
import { ListaMensagens } from '../conversa/ListaMensagens'
import { ModalApagarHistorico } from '../conversa/ModalApagarHistorico'
import { ModalMembros } from './ModalMembros'

const MARGEM_DO_FIM_PX = 80
const SEM_MENSAGENS: never[] = []

type Janela =
  'membros' | 'limpar' | 'limpar-todos' | 'sair' | 'encerrar' | 'encerrar-apagar' | 'excluir' | null

// Coluna do meio para um grupo: mesmo desenho da conversa de dois, com o nome de quem escreve, a lista
// de membros e o menu do admin (RN-WEB-GRUPOS-003, 006 e 009).
export function Grupo() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const assinante = useSessao((s) => s.assinante)
  const grupo = useGrupos((s) => s.grupos.find((g) => g.id === id))
  const carregada = useGrupos((s) => s.carregada)
  const carregar = useGrupos((s) => s.carregar)
  const marcarVisto = useGrupos((s) => s.marcarVisto)
  const chave = chaveDaConversa(id)
  const mensagens = useMensagens((s) => s.porConversa[chave]) ?? SEM_MENSAGENS
  const carregarMensagens = useMensagens((s) => s.carregar)
  const perfis = usePerfis((s) => s.perfis)
  const [janela, setJanela] = useState<Janela>(null)
  const [novas, setNovas] = useState(false)
  const [queima, setQueima] = useState<{ ids: ReadonlySet<string>; modo: 'fogo' | 'suave' } | null>(
    null,
  )
  const terminarQueima = useRef<(() => void) | null>(null)
  const rolagem = useRef<HTMLDivElement>(null)
  const pertoDoFim = useRef(true)
  const ultimaQuantidade = useRef(0)

  useEffect(() => {
    void carregar().then(() => marcarVisto(id))
    void carregarMensagens(chave)
  }, [carregar, carregarMensagens, marcarVisto, id, chave])

  // Mensagem que chega com o grupo aberto e a aba visivel ja nasce lida (RN-WEB-CONVERSAS-010).
  const naoLidas = grupo?.naoLidas ?? 0
  useEffect(() => {
    const marcar = () => {
      if (document.visibilityState === 'visible') void marcarVisto(id)
    }
    if (naoLidas > 0) marcar()
    document.addEventListener('visibilitychange', marcar)
    return () => document.removeEventListener('visibilitychange', marcar)
  }, [naoLidas, marcarVisto, id])

  // Os nomes de quem escreve precisam estar carregados.
  const membrosChave = grupo ? [...grupo.membros, ...grupo.pendentes].join(',') : ''
  useEffect(() => {
    for (const pk of membrosChave.split(',').filter(Boolean)) void usePerfis.getState().carregar(pk)
  }, [membrosChave])

  // RN-WEB-GRUPOS-015: quem ja aceitou e ainda nao entrou reenvia o pedido ao abrir o grupo (o admin
  // responde com a lista atual se o primeiro pedido ou a resposta se perderam).
  const aguardandoAdmin = grupo?.estado === 'convidado' && grupo.aceitou === true
  const meuPerfilNome = assinante
    ? nomeExibido(perfis[assinante.pubkey], assinante.pubkey).texto
    : ''
  useEffect(() => {
    if (aguardandoAdmin && assinante) void aceitarConvite(assinante, id, meuPerfilNome)
    // so ao abrir: o nome muda quando o perfil carrega e nao deve disparar outro envio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aguardandoAdmin, id])

  // O fogo da conversa de dois, para o historico do grupo (RN-WEB-APAGAR-010 a 012).
  useEffect(
    () =>
      registrarQueima(chave, (limite) => {
        const ids = new Set(
          (useMensagens.getState().porConversa[chave] ?? [])
            .filter((m) => m.criadoEm <= limite)
            .map((m) => m.id),
        )
        if (ids.size === 0) return Promise.resolve()
        const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        const area = rolagem.current?.parentElement?.getBoundingClientRect()
        for (const el of rolagem.current?.querySelectorAll<HTMLElement>('[data-mensagem]') ?? []) {
          const caixa = el.getBoundingClientRect()
          const h = area
            ? 1 - (caixa.top + caixa.height / 2 - area.top) / Math.max(area.height, 1)
            : 0
          el.style.setProperty('--h', String(Math.min(Math.max(h, 0), 1)))
        }
        return new Promise<void>((resolver) => {
          terminarQueima.current = () => {
            terminarQueima.current = null
            setQueima(null)
            resolver()
          }
          setQueima({ ids, modo: reduzido ? 'suave' : 'fogo' })
          if (!reduzido) tocarFogo()
          if (reduzido) setTimeout(() => terminarQueima.current?.(), 500)
        })
      }),
    [chave],
  )

  useEffect(() => {
    pertoDoFim.current = true
    ultimaQuantidade.current = 0
  }, [id])

  const irParaOFim = () => {
    const el = rolagem.current
    if (el) el.scrollTop = el.scrollHeight
    pertoDoFim.current = true
    setNovas(false)
  }

  useEffect(() => {
    if (mensagens.length <= ultimaQuantidade.current) {
      ultimaQuantidade.current = mensagens.length
      return
    }
    const minha = mensagens[mensagens.length - 1]?.autor === assinante?.pubkey
    ultimaQuantidade.current = mensagens.length
    if (pertoDoFim.current || minha) irParaOFim()
    else setNovas(true)
  }, [mensagens, assinante?.pubkey])

  const montada = Boolean(grupo && assinante && grupo.estado !== 'convidado')
  useEffect(() => {
    const el = rolagem.current
    if (!montada || !el || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(() => {
      if (pertoDoFim.current) el.scrollTop = el.scrollHeight
    })
    observador.observe(el)
    if (el.firstElementChild) observador.observe(el.firstElementChild)
    return () => observador.disconnect()
  }, [montada])

  if (carregada && (!grupo || grupo.excluido)) return <Navigate to="/conversas" replace />
  if (!grupo || !assinante) return null

  const eu = assinante.pubkey
  const meuNome = nomeExibido(perfis[eu], eu).texto
  const nomeDe = (pk: string) => nomeExibido(perfis[pk], pk).texto
  const souAdmin = grupo.admin === eu
  const ativo = grupo.estado === 'ativo'
  const podeEscrever = ativo && grupo.membros.length > 1
  const fechar = () => setJanela(null)

  const aoRolar = () => {
    const el = rolagem.current
    if (!el) return
    pertoDoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEM_DO_FIM_PX
    if (pertoDoFim.current) setNovas(false)
  }

  const itemExcluir = {
    rotulo: t.grupos.excluir,
    icone: <IconeMenos />,
    aoEscolher: () => setJanela('excluir' as const),
  }
  const itensDoMenu = [
    ...(grupo.estado === 'convidado'
      ? []
      : [{ rotulo: t.grupos.membros, aoEscolher: () => setJanela('membros' as const) }]),
    ...(grupo.estado !== 'convidado'
      ? [
          {
            rotulo: t.grupos.limpar,
            icone: <IconeFogo />,
            aoEscolher: () => setJanela('limpar' as const),
          },
        ]
      : []),
    ...(souAdmin && ativo
      ? [
          {
            rotulo: t.grupos.limparTodos,
            icone: <IconeFogo />,
            aoEscolher: () => setJanela('limpar-todos' as const),
          },
          { rotulo: t.grupos.passarCargo, aoEscolher: () => setJanela('membros' as const) },
          {
            rotulo: t.grupos.encerrarGrupo,
            icone: <IconeMenos />,
            aoEscolher: () => setJanela('encerrar' as const),
          },
          {
            rotulo: t.grupos.encerrarApagar,
            icone: <IconeFogo />,
            aoEscolher: () => setJanela('encerrar-apagar' as const),
          },
        ]
      : []),
    ...(!souAdmin && ativo
      ? [
          {
            rotulo: t.grupos.sair,
            icone: <IconeMenos />,
            aoEscolher: () => setJanela('sair' as const),
          },
        ]
      : []),
    ...(grupo.estado !== 'convidado' ? [itemExcluir] : []),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b-2 border-borda bg-superficie px-4 py-3">
        <Link
          to="/conversas"
          aria-label={t.conversas.voltar}
          className="rounded-cordel border-2 border-borda px-2.5 py-1 font-bold md:hidden"
        >
          ←
        </Link>
        <div className="flex min-w-[12rem] flex-1 items-center gap-3">
          <Avatar semente={grupo.id} tamanho={44} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-bold">{grupo.nome}</span>
            <span className="truncate text-sm text-tinta-suave">
              {t.grupos.grupo} · {t.grupos.pessoas(grupo.membros.length)}
            </span>
          </span>
        </div>
        <Selo tipo="privado" />
        <MenuMais itens={itensDoMenu} />
      </header>

      {grupo.estado === 'convidado' ? (
        <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-8">
          <p className="font-bold">{t.grupos.convidou(nomeDe(grupo.admin))}</p>
          {grupo.aceitou ? (
            <>
              <p role="status" className="font-bold text-vermelho">
                {t.grupos.aguardando}
              </p>
              <p className="text-tinta-suave">{t.grupos.aguardandoAjuda}</p>
            </>
          ) : (
            <p className="text-tinta-suave">{t.grupos.conviteAviso}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Botao onClick={() => void aceitarConvite(assinante, grupo.id, meuNome)}>
              {grupo.aceitou ? t.grupos.reenviar : t.grupos.aceitar}
            </Botao>
            <Botao
              variante="secundario"
              onClick={async () => {
                await recusarConvite(assinante, grupo.id, meuNome)
                navigate('/conversas')
              }}
            >
              {t.grupos.recusar}
            </Botao>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 px-4 pt-3">
            <p className="text-sm text-tinta-suave">{t.grupos.privado}</p>
            {(grupo.estado === 'saiu' ||
              grupo.estado === 'removido' ||
              grupo.estado === 'encerrado') && <Aviso>{t.grupos[grupo.estado]}</Aviso>}
          </div>

          <div className="relative min-h-0 flex-1">
            <div ref={rolagem} onScroll={aoRolar} className="h-full overflow-y-auto px-4 py-3">
              <div className="mx-auto max-w-3xl">
                {mensagens.length === 0 ? (
                  <p className="text-tinta-suave">
                    {podeEscrever || !ativo ? t.grupos.semMensagens : t.grupos.ninguemAindaTitulo}
                  </p>
                ) : (
                  <ListaMensagens
                    mensagens={mensagens}
                    minhaPubkey={eu}
                    aoTentarDeNovo={(mid) => void reenviarMensagemDeGrupo(assinante, mid)}
                    queimando={queima?.ids}
                    modoDaQueima={queima?.modo}
                    nomeDe={nomeDe}
                  />
                )}
              </div>
            </div>
            {queima?.modo === 'fogo' && <Fogo aoTerminar={() => terminarQueima.current?.()} />}
            {queima && (
              <p role="status" className="sr-only">
                {t.apagar.queimando}
              </p>
            )}
            {novas && (
              <button
                type="button"
                onClick={irParaOFim}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-cordel border-2 border-borda bg-vermelho px-4 py-1.5 text-sm font-bold text-sobre-vermelho shadow-carimbo-pequeno"
              >
                {t.mensagens.novas}
              </button>
            )}
          </div>

          <div className="bg-superficie px-4 pb-3">
            <div className="mx-auto max-w-3xl">
              {podeEscrever ? (
                <CampoMensagem
                  aoEnviar={(texto) => void enviarMensagemDeGrupo(assinante, grupo, texto)}
                />
              ) : (
                ativo && (
                  <p className="border-t-2 border-borda pt-3 text-sm text-tinta-suave">
                    {t.grupos.ninguemAindaTexto}
                  </p>
                )
              )}
            </div>
          </div>
        </>
      )}

      {janela === 'membros' && (
        <ModalMembros grupo={grupo} assinante={assinante} aoFechar={fechar} />
      )}
      {janela === 'limpar' && (
        <ModalApagarHistorico
          titulo={t.grupos.limparTitulo}
          aviso={t.grupos.limparAviso}
          botao={t.grupos.limparConfirmar}
          aoFechar={fechar}
          aoApagar={() => limparMeuHistorico(grupo.id)}
        />
      )}
      {janela === 'encerrar-apagar' && (
        <ModalApagarHistorico
          titulo={t.grupos.encerrarApagarTitulo}
          aviso={t.grupos.encerrarApagarAviso}
          botao={t.grupos.encerrarConfirmar}
          aoFechar={fechar}
          aoApagar={() => encerrarGrupoEApagar(assinante, grupo.id, meuNome)}
        />
      )}
      {janela === 'excluir' && (
        <ModalApagarHistorico
          titulo={t.grupos.excluirTitulo}
          aviso={t.grupos.excluirAviso}
          botao={t.grupos.excluir}
          aoFechar={fechar}
          aoApagar={async () => {
            await excluirGrupo(assinante, grupo.id, meuNome)
            navigate('/conversas')
          }}
        />
      )}
      {janela === 'limpar-todos' && (
        <ModalApagarHistorico
          titulo={t.grupos.limparTodosTitulo}
          aviso={t.grupos.limparTodosAviso}
          botao={t.grupos.limparConfirmar}
          aoFechar={fechar}
          aoApagar={() => limparParaTodos(assinante, grupo.id, meuNome)}
        />
      )}
      <Modal
        aberto={janela === 'sair'}
        titulo={t.grupos.sairTitulo}
        aoFechar={fechar}
        acoes={
          <Botao
            onClick={async () => {
              await sairDoGrupo(assinante, grupo.id, meuNome)
              fechar()
            }}
          >
            {t.grupos.sairConfirmar}
          </Botao>
        }
      >
        {t.grupos.sairAviso}
      </Modal>
      <Modal
        aberto={janela === 'encerrar'}
        titulo={t.grupos.encerrarTitulo}
        aoFechar={fechar}
        acoes={
          <Botao
            onClick={async () => {
              await encerrarGrupo(assinante, grupo.id)
              fechar()
            }}
          >
            {t.grupos.encerrarConfirmar}
          </Botao>
        }
      >
        {t.grupos.encerrarAviso}
      </Modal>
    </div>
  )
}
