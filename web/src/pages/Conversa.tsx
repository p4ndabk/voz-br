import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Botao } from '@/components/ui/Botao'
import { Identidade } from '@/components/ui/Identidade'
import { Modal } from '@/components/ui/Modal'
import { Selo } from '@/components/ui/Selo'
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

const MARGEM_DO_FIM_PX = 80
const SEM_MENSAGENS: never[] = []

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
  const [modal, setModal] = useState(false)
  const [novas, setNovas] = useState(false)
  const rolagem = useRef<HTMLDivElement>(null)
  const pertoDoFim = useRef(true)
  const ultimaQuantidade = useRef(0)

  useEffect(() => {
    void carregar().then(() => marcarVista(pubkey))
    void carregarMensagens(pubkey)
  }, [carregar, carregarMensagens, marcarVista, pubkey])

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
    <main className="mx-auto flex h-dvh max-w-xl flex-col gap-3 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-borda pb-3">
        <Identidade pubkey={conversa.pubkey} tamanho={44} />
        {/* RN-WEB-CONVERSAS-007 e RN-WEB-MENSAGENS-008: o selo Privado esta sempre a vista. */}
        <Selo tipo="privado" />
      </header>
      <p className="text-sm text-tinta-suave">{t.conversas.privado}</p>
      <AvisoPrivacidade
        pubkey={conversa.pubkey}
        nome={nomeExibido(perfil, conversa.pubkey).texto}
      />

      <div className="relative flex-1 overflow-hidden">
        <div ref={rolagem} onScroll={aoRolar} className="h-full overflow-y-auto pr-1">
          {mensagens.length === 0 ? (
            <p className="text-tinta-suave">{t.conversas.semMensagens}</p>
          ) : (
            <ListaMensagens
              mensagens={mensagens}
              minhaPubkey={assinante.pubkey}
              aoTentarDeNovo={(id) => void reenviarMensagem(assinante, id)}
            />
          )}
        </div>
        {novas && (
          <button
            type="button"
            onClick={irParaOFim}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-cordel border-2 border-borda bg-vermelho px-4 py-1.5 text-sm font-bold text-sobre-vermelho shadow-carimbo-pequeno"
          >
            {t.mensagens.novas}
          </button>
        )}
      </div>

      <CampoMensagem aoEnviar={(texto) => void enviarMensagem(assinante, conversa.pubkey, texto)} />

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/conversas" className="font-bold underline underline-offset-4">
          {t.conversas.voltar}
        </Link>
        <Botao variante="secundario" onClick={() => setModal(true)}>
          {t.conversas.remover}
        </Botao>
      </footer>
      <Modal
        aberto={modal}
        titulo={t.conversas.removerTitulo}
        aoFechar={() => setModal(false)}
        acoes={<Botao onClick={confirmarRemocao}>{t.conversas.confirmarRemover}</Botao>}
      >
        {t.conversas.removerAviso}
      </Modal>
    </main>
  )
}
