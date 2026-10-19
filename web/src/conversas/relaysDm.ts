import type { NostrEvent } from 'nostr-tools'
import { KIND_RELAYS_DM, relaysDoEvento } from '@/nostr/dm'
import { GRACA_PERFIL_MS, relaysDePerfil, relaysPadrao } from '@/nostr/config'
import { maisRecente } from '@/nostr/perfis'
import { relays } from '@/nostr/relays'

// Lista de DM (kind 10050) mais recente de uma pessoa. Procura nos relays em uso e nos de perfil
// (RN-WEB-RELAYS-008): quem usa relay proprio e achado por onde os amigos costumam olhar.
export async function eventoRelaysDm(pubkey: string): Promise<NostrEvent | null> {
  try {
    const urls = [...new Set([...relays.snapshot().map((r) => r.url), ...relaysDePerfil])]
    const eventos = await relays.consultar(
      { kinds: [KIND_RELAYS_DM], authors: [pubkey], limit: 3 },
      undefined,
      urls,
      { suficiente: (achados) => achados.length > 0, gracaMs: GRACA_PERFIL_MS },
    )
    return maisRecente(eventos, pubkey, KIND_RELAYS_DM)
  } catch {
    return null
  }
}

async function relaysDm(pubkey: string): Promise<string[]> {
  return relaysDoEvento(await eventoRelaysDm(pubkey))
}

export const relaysDeDmDe = relaysDm

// Lista da pessoa logada, ja carregada por `useMeusRelays` (evita consultar a cada mensagem).
let minhaLista: { pubkey: string; urls: string[] } | null = null

export function definirMinhaLista(pubkey: string, urls: string[]): void {
  minhaLista = urls.length > 0 ? { pubkey, urls } : null
}

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

// RN-WEB-RELAYS-007: a minha lista (kind 10050); sem ela, os relays padrao.
export async function meusRelaysDm(minhaPubkey: string): Promise<string[]> {
  if (minhaLista?.pubkey === minhaPubkey) return [...minhaLista.urls]
  const meus = await relaysDm(minhaPubkey)
  return meus.length > 0 ? meus : [...relaysPadrao]
}
