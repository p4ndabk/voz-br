import { nip19 } from 'nostr-tools'

export type ResultadoChaveAmigo =
  | { ok: true; pubkey: string; relays: string[] }
  | { ok: false; motivo: 'vazia' | 'segredo' | 'invalida' | 'propria' }

const HEX_64 = /^[0-9a-f]{64}$/i
const MAXIMO_RELAYS_DICA = 5

function relaysValidos(relays: string[] | undefined): string[] {
  return (relays ?? [])
    .filter((url) => url.startsWith('wss://') || url.startsWith('ws://'))
    .slice(0, MAXIMO_RELAYS_DICA)
}

// RN-WEB-CONVERSAS-002, 003 e 004: valida a chave do amigo (npub, nprofile, hex ou nostr:...),
// recusa nsec (chave secreta) e a propria chave.
export function lerChaveDoAmigo(texto: string, minhaPubkey: string): ResultadoChaveAmigo {
  const limpo = texto.trim().replace(/^nostr:/i, '')
  if (limpo === '') return { ok: false, motivo: 'vazia' }
  if (limpo.toLowerCase().startsWith('nsec1')) return { ok: false, motivo: 'segredo' }

  let pubkey: string
  let relays: string[] = []
  if (HEX_64.test(limpo)) {
    pubkey = limpo.toLowerCase()
  } else {
    try {
      const decodificado = nip19.decode(limpo)
      if (decodificado.type === 'npub') {
        pubkey = decodificado.data
      } else if (decodificado.type === 'nprofile') {
        pubkey = decodificado.data.pubkey
        relays = relaysValidos(decodificado.data.relays)
      } else {
        return { ok: false, motivo: 'invalida' }
      }
    } catch {
      return { ok: false, motivo: 'invalida' }
    }
  }

  if (pubkey === minhaPubkey) return { ok: false, motivo: 'propria' }
  return { ok: true, pubkey, relays }
}
