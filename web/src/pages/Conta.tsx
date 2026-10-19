import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Botao } from '@/components/ui/Botao'
import { Identidade } from '@/components/ui/Identidade'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { ModalSair } from '@/components/ModalSair'
import { Modal } from '@/components/ui/Modal'
import {
  desligarNotificacoes,
  estadoNotificacoes,
  ligarNotificacoes,
  type EstadoNotificacoes,
} from '@/conversas/notificacoes'
import { t } from '@/i18n/pt-BR'
import { npubDe } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'

// RN-WEB-AUTH-009: a nsec so aparece depois de confirmacao e some em 60 s.
const TEMPO_NSEC_VISIVEL_MS = 60_000

export function Conta() {
  const assinante = useSessao((s) => s.assinante)
  const [modalChave, setModalChave] = useState(false)
  const [nsecVisivel, setNsecVisivel] = useState<string>()
  const [modalSair, setModalSair] = useState(false)
  const [avisos, setAvisos] = useState<EstadoNotificacoes>(estadoNotificacoes)

  useEffect(() => {
    if (!nsecVisivel) return
    const t60 = setTimeout(() => {
      setNsecVisivel(undefined)
      setModalChave(false)
    }, TEMPO_NSEC_VISIVEL_MS)
    return () => clearTimeout(t60)
  }, [nsecVisivel])

  if (!assinante) return null
  const npub = npubDe(assinante.pubkey)

  const fecharChave = () => {
    setNsecVisivel(undefined)
    setModalChave(false)
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.conta.titulo} voltarPara="/conversas" />
      <Identidade pubkey={assinante.pubkey} tamanho={56} />
      <p className="text-tinta-suave">{t.conta.metodo[assinante.metodo]}</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t.conta.chavePublica}</h2>
        <p className="break-all rounded-cordel border-2 border-borda bg-superficie p-3 font-mono text-sm">
          {npub}
        </p>
        <p className="text-sm text-tinta-suave">{t.conta.chavePublicaAjuda}</p>
        <div>
          <BotaoCopiar texto={npub} />
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="avisos-navegador">
        <h2 id="avisos-navegador" className="font-bold">
          {t.notificacoes.secao}
        </h2>
        <p className="text-sm text-tinta-suave">{t.notificacoes.ajuda}</p>
        {avisos === 'ligada' && <p role="status">{t.notificacoes.ligados}</p>}
        {avisos === 'bloqueada' && <Aviso tom="erro">{t.notificacoes.bloqueada}</Aviso>}
        {avisos === 'indisponivel' && <p>{t.notificacoes.indisponivel}</p>}
        {(avisos === 'desligada' || avisos === 'ligada') && (
          <div>
            <Botao
              variante="secundario"
              onClick={async () => {
                if (avisos === 'ligada') {
                  desligarNotificacoes()
                  setAvisos(estadoNotificacoes())
                } else {
                  setAvisos(await ligarNotificacoes())
                }
              }}
            >
              {avisos === 'ligada' ? t.notificacoes.desligar : t.notificacoes.ligar}
            </Botao>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/conta/perfil"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.conta.editarPerfil}
        </Link>
        <Link
          to="/conta/relays"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.relaysConfig.link}
        </Link>
        {assinante.exportarNsec && (
          <Botao variante="secundario" onClick={() => setModalChave(true)}>
            {t.conta.verChave}
          </Botao>
        )}
        <Botao variante="secundario" onClick={() => setModalSair(true)}>
          {t.conta.sair}
        </Botao>
      </div>

      <Modal
        aberto={modalChave}
        titulo={t.conta.verChaveTitulo}
        aoFechar={fecharChave}
        acoes={
          !nsecVisivel && (
            <Botao onClick={() => setNsecVisivel(assinante.exportarNsec?.())}>
              {t.conta.mostrar}
            </Botao>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <Aviso tom="erro">{t.conta.verChaveAviso}</Aviso>
          {nsecVisivel && (
            <>
              <p className="break-all rounded-cordel border-2 border-borda bg-fundo p-3 font-mono text-sm">
                {nsecVisivel}
              </p>
              <div>
                <BotaoCopiar texto={nsecVisivel} />
              </div>
            </>
          )}
        </div>
      </Modal>

      <ModalSair aberto={modalSair} aoFechar={() => setModalSair(false)} />
    </main>
  )
}
