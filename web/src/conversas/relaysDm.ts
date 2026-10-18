import { KIND_RELAYS_DM, relaysDoEvento } from '@/nostr/dm'
import { relaysPadrao } from '@/nostr/config'
import { maisRecente } from '@/nostr/perfis'
import { relays } from '@/nostr/relays'

async function relaysDm(pubkey: string): Promise<string[]> {
  try {
    const eventos = await relays.consultar({ kinds: [KIND_RELAYS_DM], authors: [pubkey], limit: 3 })
    return relaysDoEvento(maisRecente(eventos, pubkey, KIND_RELAYS_DM))
  } catch {
    return []
  }
}

export const relaysDeDmDe = relaysDm

// Relays para onde mandar o embrulho do amigo: a lista de DM dele (kind 10050). Sem ela,
// as dicas do nprofile e os relays padrao do Voz, avisando que ele pode nao receber.
export async function relaysDoAmigo(
  pubkey: string,
  dicas: string[],
): Promise<{ urls: string[]; semRelaysDm: boolean }> {
  const dele = await relaysDm(pubkey)
  if (dele.length > 0) return { urls: dele, semRelaysDm: false }
  return { urls: [...new Set([...dicas, ...relaysPadrao])], semRelaysDm: true }
}

export async function meusRelaysDm(minhaPubkey: string): Promise<string[]> {
  const meus = await relaysDm(minhaPubkey)
  return meus.length > 0 ? meus : [...relaysPadrao]
}
