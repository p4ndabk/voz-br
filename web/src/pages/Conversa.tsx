import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Botao } from '@/components/ui/Botao'
import { Identidade } from '@/components/ui/Identidade'
import { Modal } from '@/components/ui/Modal'
import { Selo } from '@/components/ui/Selo'
import { apagarHistorico } from '@/conversas/apagar'
import { dataDe } from '@/conversas/dias'
import { enviarMensagem, reenviarMensagem } from '@/conversas/mensageria'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { useSessao } from '@/nostr/useSessao'
import { usePerfil } from '@/nostr/usePerfil'
import { AvisoPrivacidade } from './conversa/AvisoPrivacidade'
import { CampoMensagem } from './conversa/CampoMensagem'
import { ListaMensagens } from './conversa/ListaMensagens'
import { ModalApagarHistorico } from './conversa/ModalApagarHistorico'

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
  const [novas, setNovas] = useState(false)
  const rolagem = useRef<HTMLDivElement>(null)
  const pertoDoFim = useRef(true)
  const ultimaQuantidade = useRef(0)

  useEffect(() => {
    void carregar().then(() => marcarVista(pubkey))
    void carregarMensagens(pubkey)
  }, [carregar, carregarMensagens, marcarVista, pubkey])

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
        <div className="min-w-0 flex-1">
          <Identidade pubkey={conversa.pubkey} tamanho={44} />
        </div>
        {/* RN-WEB-CONVERSAS-007 e RN-WEB-MENSAGENS-008: o selo Privado esta sempre a vista. */}
        <Selo tipo="privado" />
        <Botao
          variante="secundario"
          className="px-3 py-1.5 text-sm"
          onClick={() => setApagando(true)}
        >
          {t.apagar.botao}
        </Botao>
        <Botao variante="secundario" className="px-3 py-1.5 text-sm" onClick={() => setModal(true)}>
          {t.conversas.remover}
        </Botao>
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
              />
            )}
          </div>
        </div>
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
