import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Identidade } from '@/components/ui/Identidade'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'
import { npubDe } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'

// RN-WEB-AUTH-009: a nsec so aparece depois de confirmacao e some em 60 s.
const TEMPO_NSEC_VISIVEL_MS = 60_000

export function Conta() {
  const navigate = useNavigate()
  const assinante = useSessao((s) => s.assinante)
  const sair = useSessao((s) => s.sair)
  const [modalChave, setModalChave] = useState(false)
  const [nsecVisivel, setNsecVisivel] = useState<string>()
  const [modalSair, setModalSair] = useState(false)

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
  const guardaChave = assinante.metodo === 'nsec'

  const fecharChave = () => {
    setNsecVisivel(undefined)
    setModalChave(false)
  }

  const confirmarSaida = async () => {
    await sair()
    navigate('/')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-4xl">{t.conta.titulo}</h1>
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

      <div className="flex flex-wrap gap-3">
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

      <Modal
        aberto={modalSair}
        titulo={t.conta.sairTitulo}
        aoFechar={() => setModalSair(false)}
        acoes={<Botao onClick={confirmarSaida}>{t.conta.confirmarSair}</Botao>}
      >
        {guardaChave ? t.conta.sairAviso.nsec : t.conta.sairAviso.padrao}
      </Modal>
    </main>
  )
}
