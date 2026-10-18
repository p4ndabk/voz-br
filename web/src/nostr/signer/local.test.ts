import { verifyEvent } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { gerarChave, lerNsec, nsecDe, npubDe, pubkeyDe } from './chaves'
import { criarAssinanteLocal } from './local'

describe('lerNsec', () => {
  const chave = gerarChave()

  it('RN-WEB-AUTH-003: aceita nsec valida, com espacos e prefixo nostr:', () => {
    const nsec = nsecDe(chave)
    for (const entrada of [nsec, `  ${nsec}\n`, `nostr:${nsec}`]) {
      const r = lerNsec(entrada)
      expect(r.ok).toBe(true)
      if (r.ok) expect(pubkeyDe(r.chave)).toBe(pubkeyDe(chave))
    }
  })

  it('RN-WEB-AUTH-003: recusa texto que nao e nsec valida', () => {
    expect(lerNsec('')).toEqual({ ok: false, motivo: 'vazia' })
    expect(lerNsec('nsec1abc')).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerNsec('qualquer coisa')).toEqual({ ok: false, motivo: 'invalida' })
    expect(lerNsec(pubkeyDe(chave))).toEqual({ ok: false, motivo: 'invalida' })
  })

  it('RN-WEB-AUTH-004: npub no campo de nsec tem motivo proprio', () => {
    expect(lerNsec(npubDe(pubkeyDe(chave)))).toEqual({ ok: false, motivo: 'chave-publica' })
  })
})

describe('criarAssinanteLocal', () => {
  it('assina eventos que verificam e expoe a pubkey', async () => {
    const chave = gerarChave()
    const assinante = criarAssinanteLocal(chave)
    const evento = await assinante.assinar({ kind: 1, created_at: 1, tags: [], content: 'oi' })
    expect(evento.pubkey).toBe(assinante.pubkey)
    expect(verifyEvent(evento)).toBe(true)
  })

  it('cifra com NIP-44 e so o outro lado le', async () => {
    const a = criarAssinanteLocal(gerarChave())
    const b = criarAssinanteLocal(gerarChave())
    const intruso = criarAssinanteLocal(gerarChave())
    const cifrado = await a.nip44.cifrar(b.pubkey, 'oi, tudo bem?')
    expect(cifrado).not.toContain('oi, tudo bem?')
    expect(await b.nip44.decifrar(a.pubkey, cifrado)).toBe('oi, tudo bem?')
    await expect(intruso.nip44.decifrar(a.pubkey, cifrado)).rejects.toThrow()
  })

  it('exportarNsec devolve a mesma chave', () => {
    const chave = gerarChave()
    expect(criarAssinanteLocal(chave).exportarNsec?.()).toBe(nsecDe(chave))
  })
})
