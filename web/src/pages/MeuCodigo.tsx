import { Link } from 'react-router-dom'
import { Botao } from '@/components/ui/Botao'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { QrCode } from '@/components/ui/QrCode'
import { t } from '@/i18n/pt-BR'
import { npubDe } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'

export function MeuCodigo() {
  const assinante = useSessao((s) => s.assinante)
  if (!assinante) return null
  const npub = npubDe(assinante.pubkey)
  // So existe em navegadores com Web Share API (principalmente celulares).
  const podeCompartilhar = typeof navigator.share === 'function'

  const compartilhar = () =>
    navigator.share({ title: t.meuCodigo.titulo, text: `${t.meuCodigo.textoCompartilhar} ${npub}` })

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <h1 className="font-display text-4xl">{t.meuCodigo.titulo}</h1>
      <p className="text-tinta-suave">{t.meuCodigo.intro}</p>
      <QrCode texto={npub} rotulo={t.meuCodigo.titulo} />
      <p className="break-all rounded-cordel border-2 border-borda bg-superficie p-3 font-mono text-sm">
        {npub}
      </p>
      <div className="flex flex-wrap gap-3">
        <BotaoCopiar texto={npub} />
        {podeCompartilhar && (
          <Botao variante="secundario" onClick={() => void compartilhar().catch(() => {})}>
            {t.meuCodigo.compartilhar}
          </Botao>
        )}
      </div>
      <Link to="/conversas" className="font-bold underline underline-offset-4">
        {t.conversas.voltar}
      </Link>
    </main>
  )
}
