import { Link } from 'react-router-dom'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Identidade } from '@/components/ui/Identidade'
import { t } from '@/i18n/pt-BR'
import { npubDe } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'

// Configuracoes > Minha conta: quem sou, a chave publica, o codigo para o amigo. (Sair fica no menu.)
export function SecaoConta() {
  const assinante = useSessao((s) => s.assinante)
  if (!assinante) return null
  const npub = npubDe(assinante.pubkey)

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.conta.titulo} voltarPara="/configuracoes" soNoCelular />
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
        <Link
          to="/meu-codigo"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.conversas.meuCodigo}
        </Link>
      </div>
    </main>
  )
}
