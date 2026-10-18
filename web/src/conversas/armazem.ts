import { del, entries, get, set } from 'idb-keyval'

// RN-WEB-CONVERSAS-006: a lista de conversas vive so no IndexedDB deste navegador.
// Uma sala = eu + uma pubkey (RN-WEB-CONVERSAS-001); a chave do registro e a pubkey do amigo.
export interface Conversa {
  pubkey: string
  relaysDica: string[]
  criadaEm: number
  ultimaMensagemEm?: number
  trecho?: string
  novaPessoa: boolean
}

const PREFIXO = 'voz:conversa:'

export async function listarConversas(): Promise<Conversa[]> {
  const todas = await entries()
  return todas
    .filter(([chave]) => typeof chave === 'string' && chave.startsWith(PREFIXO))
    .map(([, valor]) => valor as Conversa)
}

export function obterConversa(pubkey: string): Promise<Conversa | undefined> {
  return get<Conversa>(PREFIXO + pubkey)
}

export function salvarConversa(conversa: Conversa): Promise<void> {
  return set(PREFIXO + conversa.pubkey, conversa)
}

export function removerConversaSalva(pubkey: string): Promise<void> {
  return del(PREFIXO + pubkey)
}
