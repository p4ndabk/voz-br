import { bytesToHex, hexToBytes } from 'nostr-tools/utils'
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'

export type ResultadoNsec =
  { ok: true; chave: Uint8Array } | { ok: false; motivo: 'vazia' | 'chave-publica' | 'invalida' }

// RN-WEB-AUTH-003 e RN-WEB-AUTH-004: valida a nsec colada antes de qualquer uso.
export function lerNsec(texto: string): ResultadoNsec {
  const limpo = texto.trim().replace(/^nostr:/, '')
  if (limpo === '') return { ok: false, motivo: 'vazia' }
  if (limpo.startsWith('npub1') || limpo.startsWith('nprofile1')) {
    return { ok: false, motivo: 'chave-publica' }
  }
  if (!limpo.startsWith('nsec1')) return { ok: false, motivo: 'invalida' }
  try {
    const decodificado = nip19.decode(limpo)
    if (decodificado.type !== 'nsec') return { ok: false, motivo: 'invalida' }
    return { ok: true, chave: decodificado.data }
  } catch {
    return { ok: false, motivo: 'invalida' }
  }
}

export function gerarChave(): Uint8Array {
  return generateSecretKey()
}

export function nsecDe(chave: Uint8Array): string {
  return nip19.nsecEncode(chave)
}

export function pubkeyDe(chave: Uint8Array): string {
  return getPublicKey(chave)
}

export function npubDe(pubkey: string): string {
  return nip19.npubEncode(pubkey)
}

export { bytesToHex, hexToBytes }
