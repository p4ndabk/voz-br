import { nip19 } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { lerChaveDoAmigo } from './contatos'
import { gerarChave, nsecDe, npubDe, pubkeyDe } from './signer/chaves'

const eu = pubkeyDe(gerarChave())
const amigo = pubkeyDe(gerarChave())

describe('lerChaveDoAmigo', () => {
  it('aceita npub, hex, nostr:npub e espacos', () => {
    const esperado = { ok: true, pubkey: amigo, relays: [] }
    expect(lerChaveDoAmigo(npubDe(amigo), eu)).toEqual(esperado)
    expect(lerChaveDoAmigo(amigo, eu)).toEqual(esperado)
    expect(lerChaveDoAmigo(amigo.toUpperCase(), eu)).toEqual(esperado)
    expect(lerChaveDoAmigo(`nostr:${npubDe(amigo)}`, eu)).toEqual(esperado)
    expect(lerChaveDoAmigo(`  ${npubDe(amigo)}\n`, eu)).toEqual(esperado)
  })

  it('nprofile traz os relays de dica (so ws/wss, no maximo 5)', () => {
    const nprofile = nip19.nprofileEncode({
      pubkey: amigo,
      relays: [
        'wss://a',
        'https://nao-e-relay',
        'wss://b',
        'wss://c',
        'wss://d',
        'wss://e',
        'wss://f',
      ],
    })
    expect(lerChaveDoAmigo(nprofile, eu)).toEqual({
      ok: true,
      pubkey: amigo,
      relays: ['wss://a', 'wss://b', 'wss://c', 'wss://d', 'wss://e'],
    })
  })

  it('RN-WEB-CONVERSAS-002: chave invalida ou vazia e recusada', () => {
    expect(lerChaveDoAmigo('', eu)).toEqual({ ok: false, motivo: 'vazia' })
    expect(lerChaveDoAmigo('   ', eu)).toEqual({ ok: false, motivo: 'vazia' })
    expect(lerChaveDoAmigo('npub1xyz', eu)).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerChaveDoAmigo('abc123', eu)).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerChaveDoAmigo('z'.repeat(64), eu)).toEqual({ ok: false, motivo: 'invalida' })
  })

  it('RN-WEB-CONVERSAS-002: outros codigos bech32 (note, nevent) nao servem', () => {
    expect(lerChaveDoAmigo(nip19.noteEncode('a'.repeat(64)), eu)).toEqual({
      ok: false,
      motivo: 'invalida',
    })
  })

  it('RN-WEB-CONVERSAS-003: nsec e reconhecida como segredo', () => {
    expect(lerChaveDoAmigo(nsecDe(gerarChave()), eu)).toEqual({ ok: false, motivo: 'segredo' })
    expect(lerChaveDoAmigo('nsec1abc', eu)).toEqual({ ok: false, motivo: 'segredo' })
    expect(lerChaveDoAmigo('nostr:NSEC1abc', eu)).toEqual({ ok: false, motivo: 'segredo' })
  })

  it('RN-WEB-CONVERSAS-004: a propria chave e recusada em qualquer formato', () => {
    expect(lerChaveDoAmigo(npubDe(eu), eu)).toEqual({ ok: false, motivo: 'propria' })
    expect(lerChaveDoAmigo(eu, eu)).toEqual({ ok: false, motivo: 'propria' })
  })
})
