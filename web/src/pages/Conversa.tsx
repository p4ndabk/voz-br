import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Botao } from '@/components/ui/Botao'
import { Fogo } from '@/components/ui/Fogo'
import { Identidade } from '@/components/ui/Identidade'
import { Modal } from '@/components/ui/Modal'
import { Selo } from '@/components/ui/Selo'
import { apagarHistorico } from '@/conversas/apagar'
import { dataDe } from '@/conversas/dias'
import { enviarMensagem, reenviarMensagem } from '@/conversas/mensageria'
import { registrarQueima } from '@/conversas/queima'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { t } from '@/i18n/pt-BR'
import { enderecoLightningValido, nomeExibido } from '@/nostr/perfis'
import { useSessao } from '@/nostr/useSessao'
import { usePerfil } from '@/nostr/usePerfil'
import { usePerfis } from '@/nostr/perfisStore'
import { AvisoPrivacidade } from './conversa/AvisoPrivacidade'
import { CampoMensagem } from './conversa/CampoMensagem'
import { ListaMensagens } from './conversa/ListaMensagens'
import { MenuMais } from '@/components/ui/MenuMais'
import { ModalApagarHistorico } from './conversa/ModalApagarHistorico'
import { ModalZap } from './conversa/ModalZap'

const MARGEM_DO_FIM_PX = 80
const SEM_MENSAGENS: never[] = []

// Coluna do meio do layout de conversas: cabecalho, mensagens (rolagem propria) e campo de texto.
export function Conversa() {
  const { pubkey = '' } = useParams()
  const navigate = useNavigate()
  const assinante = useSessao((s) => s.assinante)
  const conversa = useConversas((s) => s.conversas.find((c) => c.pubkey === pubkey))
  const carregada = useConversas((s) => s.carregada)
  const carregar = useConversas((s) => s.carregar)
  const marcarVista = useConversas((s) => s.marcarVista)
  const remover = useConversas((s) => s.remover)
  const mensagens = useMensagens((s) => s.porConversa[pubkey]) ?? SEM_MENSAGENS
  const carregarMensagens = useMensagens((s) => s.carregar)
  const perfil = usePerfil(pubkey)
  const meuPerfil = usePerfil(assinante?.pubkey ?? pubkey)
  const [modal, setModal] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [zapando, setZapando] = useState(false)
  const [atualizandoPerfil, setAtualizandoPerfil] = useState(false)
  const [novas, setNovas] = useState(false)
  // RN-WEB-APAGAR-010 a 012: mensagens queimando agora (null = nenhuma) e como.
  const [queima, setQueima] = useState<{
    ids: ReadonlySet<string>
    modo: 'fogo' | 'suave'
  } | null>(null)
  const terminarQueima = useRef<(() => void) | null>(null)

  // O perfil em cache pode ser antigo (a pessoa pode ter configurado o Lightning depois):
  // ao abrir o zap, busca de novo nos relays. Enquanto isso o dialogo diz que esta procurando.
  const abrirZap = () => {
    setZapando(true)
    setAtualizandoPerfil(true)
    void usePerfis
      .getState()
      .recarregar(pubkey)
      .finally(() => setAtualizandoPerfil(false))
  }
  const rolagem = useRef<HTMLDivElement>(null)
  const pertoDoFim = useRef(true)
  const ultimaQuantidade = useRef(0)

  useEffect(() => {
    void carregar().then(() => marcarVista(pubkey))
    void carregarMensagens(pubkey)
  }, [carregar, carregarMensagens, marcarVista, pubkey])

  // RN-WEB-CONVERSAS-010: mensagem que chega com a conversa aberta e a aba visivel ja nasce lida;
  // com a aba em segundo plano, fica como nao lida ate a pessoa voltar.
  const naoLidas = conversa?.naoLidas ?? 0
  useEffect(() => {
    const marcar = () => {
      if (document.visibilityState === 'visible') void marcarVista(pubkey)
    }
    if (naoLidas > 0) marcar()
    document.addEventListener('visibilitychange', marcar)
    return () => document.removeEventListener('visibilitychange', marcar)
  }, [naoLidas, marcarVista, pubkey])

  // Esta conversa esta aberta e visivel: e ela que mostra o fogo quando o historico e apagado
  // (por mim ou a pedido do amigo). O apagamento de verdade ja aconteceu quando isto roda.
  useEffect(
    () =>
      registrarQueima(pubkey, (limite) => {
        const ids = new Set(
          (useMensagens.getState().porConversa[pubkey] ?? [])
            .filter((m) => m.criadoEm <= limite)
            .map((m) => m.id),
        )
        if (ids.size === 0) return Promise.resolve()
        const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        // --h: 0 = embaixo da area visivel, 1 = em cima; a mensagem pega fogo quando a frente chega.
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
          if (reduzido) setTimeout(() => terminarQueima.current?.(), 500)
        })
      }),
    [pubkey],
  )

  // Trocar de conversa recomeca do fim, sem herdar a posicao da anterior.
  useEffect(() => {
    pertoDoFim.current = true
    ultimaQuantidade.current = 0
  }, [pubkey])

  const irParaOFim = () => {
    const el = rolagem.current
    if (el) el.scrollTop = el.scrollHeight
    pertoDoFim.current = true
    setNovas(false)
  }

  // Mensagem nova: rola sozinho se eu ja estava no fim (ou fui eu que escrevi); senao avisa.
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

  // A area de rolagem so existe depois que a conversa carrega.
  const montada = Boolean(conversa && assinante)

  // Quem estava no fim continua no fim quando a area muda de tamanho (aviso de privacidade que
  // aparece, teclado do celular, fontes que terminam de carregar).
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

  if (carregada && !conversa) return <Navigate to="/conversas" replace />
  if (!conversa || !assinante) return null

  const confirmarRemocao = async () => {
    await remover(conversa.pubkey)
    navigate('/conversas')
  }

  const aoRolar = () => {
    const el = rolagem.current
    if (!el) return
    pertoDoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEM_DO_FIM_PX
    if (pertoDoFim.current) setNovas(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b-2 border-borda bg-superficie px-4 py-3">
        {/* Em tela estreita a lista some enquanto a conversa esta aberta: precisa de um caminho de volta. */}
        <Link
          to="/conversas"
          aria-label={t.conversas.voltar}
          className="rounded-cordel border-2 border-borda px-2.5 py-1 font-bold md:hidden"
        >
          ←
        </Link>
        <div className="min-w-[12rem] flex-1">
          <Identidade pubkey={conversa.pubkey} tamanho={44} />
        </div>
        {/* RN-WEB-CONVERSAS-007 e RN-WEB-MENSAGENS-008: o selo Privado esta sempre a vista. */}
        <Selo tipo="privado" />
        {/* RN-WEB-ZAP-001: o botao sempre aparece; sem endereco Lightning o dialogo explica por que nao da. */}
        <Botao className="px-3 py-1.5 text-sm" onClick={abrirZap}>
          {t.zap.botao}
        </Botao>
        <MenuMais
          itens={[
            { rotulo: t.apagar.botao, aoEscolher: () => setApagando(true) },
            { rotulo: t.conversas.remover, aoEscolher: () => setModal(true) },
          ]}
        />
      </header>

      <div className="flex flex-col gap-2 px-4 pt-3">
        <p className="text-sm text-tinta-suave">{t.conversas.privado}</p>
        <AvisoPrivacidade
          pubkey={conversa.pubkey}
          nome={nomeExibido(perfil, conversa.pubkey).texto}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={rolagem} onScroll={aoRolar} className="h-full overflow-y-auto px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {/* A sala continua, vazia, com a marca de quando o historico foi apagado. */}
            {conversa.apagadoAte !== undefined && (
              <p
                data-testid="linha-apagado"
                className="mb-3 rounded-cordel border-2 border-dashed border-borda px-3 py-1.5 text-center text-sm text-tinta-suave"
              >
                {conversa.apagadoPor === 'outro'
                  ? t.apagar.linhaOutro(
                      nomeExibido(perfil, conversa.pubkey).texto,
                      dataDe(conversa.apagadoAte),
                    )
                  : t.apagar.linhaEu(dataDe(conversa.apagadoAte))}
              </p>
            )}
            {mensagens.length === 0 ? (
              conversa.apagadoAte === undefined && (
                <p className="text-tinta-suave">{t.conversas.semMensagens}</p>
              )
            ) : (
              <ListaMensagens
                mensagens={mensagens}
                minhaPubkey={assinante.pubkey}
                aoTentarDeNovo={(id) => void reenviarMensagem(assinante, id)}
                queimando={queima?.ids}
                modoDaQueima={queima?.modo}
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
          <CampoMensagem
            aoEnviar={(texto) => void enviarMensagem(assinante, conversa.pubkey, texto)}
          />
        </div>
      </div>

      {apagando && (
        <ModalApagarHistorico
          nome={nomeExibido(perfil, conversa.pubkey).texto}
          aoFechar={() => setApagando(false)}
          aoApagar={() =>
            apagarHistorico(
              assinante,
              conversa.pubkey,
              nomeExibido(meuPerfil, assinante.pubkey).texto,
            )
          }
        />
      )}

      <ModalZap
        aberto={zapando}
        aoFechar={() => setZapando(false)}
        nome={nomeExibido(perfil, conversa.pubkey).texto}
        pubkey={conversa.pubkey}
        procurandoPerfil={perfil === undefined || atualizandoPerfil}
        endereco={
          perfil?.lightning && enderecoLightningValido(perfil.lightning)
            ? perfil.lightning
            : undefined
        }
        assinante={assinante}
      />

      <Modal
        aberto={modal}
        titulo={t.conversas.removerTitulo}
        aoFechar={() => setModal(false)}
        acoes={<Botao onClick={confirmarRemocao}>{t.conversas.confirmarRemover}</Botao>}
      >
        {t.conversas.removerAviso}
      </Modal>
    </div>
  )
}
