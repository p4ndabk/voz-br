import { useState } from 'react'
import { t } from '@/i18n/pt-BR'
import { npubAbreviada, nomeExibido } from '@/nostr/perfis'
import { npubDe } from '@/nostr/signer/chaves'
import { usePerfil } from '@/nostr/usePerfil'
import { Avatar } from './Avatar'
import { BotaoCopiar } from './BotaoCopiar'
import { Modal } from './Modal'
import { QrCode } from './QrCode'

interface Props {
  pubkey: string
  tamanho?: number
}

export function LinhaIdentidade({ pubkey, tamanho }: Props) {
  const perfil = usePerfil(pubkey)
  const { texto, temNome } = nomeExibido(perfil, pubkey)
  // Enquanto carrega nao dizemos "sem nome": evita piscar e parecer erro.
  const semNome = perfil !== undefined && !temNome

  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <Avatar semente={pubkey} tamanho={tamanho} foto={perfil?.foto} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-bold">{texto}</span>
        <span className="truncate text-sm text-tinta-suave">
          {semNome ? t.perfil.semNome : temNome ? npubAbreviada(pubkey) : ''}
        </span>
      </span>
    </span>
  )
}

// RN-WEB-PERFIL-005: onde aparece uma pessoa, a chave completa esta a um toque.
export function Identidade({ pubkey, tamanho = 40 }: Props) {
  const [aberto, setAberto] = useState(false)
  const perfil = usePerfil(pubkey)
  const { texto } = nomeExibido(perfil, pubkey)
  const npub = npubDe(pubkey)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={t.perfil.verChave(texto)}
        className="inline-flex max-w-full rounded-cordel p-1 hover:bg-superficie"
      >
        <LinhaIdentidade pubkey={pubkey} tamanho={tamanho} />
      </button>
      <Modal aberto={aberto} titulo={t.perfil.cartaoTitulo} aoFechar={() => setAberto(false)}>
        <div className="flex flex-col gap-4">
          <LinhaIdentidade pubkey={pubkey} tamanho={56} />
          <div className="flex flex-col gap-1">
            <h3 className="font-bold">{t.perfil.chavePublica}</h3>
            {/* RN-WEB-PERFIL-006: o cartao sempre mostra a chave, nao so o nome. */}
            <p className="break-all rounded-cordel border-2 border-borda bg-fundo p-3 font-mono text-sm">
              {npub}
            </p>
          </div>
          <p className="text-sm text-tinta-suave">{t.perfil.alerta}</p>
          <div className="flex flex-col items-start gap-3">
            <QrCode texto={npub} rotulo={t.perfil.chavePublica} tamanho={180} />
            <BotaoCopiar texto={npub} />
          </div>
        </div>
      </Modal>
    </>
  )
}
