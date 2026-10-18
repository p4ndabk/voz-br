import { afterEach, describe, expect, it, vi } from 'vitest'
import { gerarChave, pubkeyDe } from './chaves'
import { entrarComExtensao, extensaoDisponivel } from './nip07'

const pubkey = pubkeyDe(gerarChave())

function instalar(nostr: unknown) {
  ;(window as unknown as { nostr?: unknown }).nostr = nostr
}

afterEach(() => instalar(undefined))

describe('entrarComExtensao', () => {
  it('sem extensao: informa e nao entra', async () => {
    expect(extensaoDisponivel()).toBe(false)
    await expect(entrarComExtensao()).rejects.toMatchObject({ motivo: 'sem-extensao' })
  })

  it('RN-WEB-AUTH-006: extensao sem nip44 nao entra', async () => {
    instalar({ getPublicKey: async () => pubkey, signEvent: vi.fn() })
    await expect(entrarComExtensao()).rejects.toMatchObject({ motivo: 'sem-nip44' })
  })

  it('pedido recusado na extensao vira "recusado"', async () => {
    instalar({
      getPublicKey: async () => Promise.reject(new Error('user rejected')),
      signEvent: vi.fn(),
      nip44: { encrypt: vi.fn(), decrypt: vi.fn() },
    })
    await expect(entrarComExtensao()).rejects.toMatchObject({ motivo: 'recusado' })
  })

  it('RN-WEB-AUTH-002: entra so com a chave publica e delega assinatura e cifra a extensao', async () => {
    const signEvent = vi.fn(async (e) => ({ ...e, id: 'x', pubkey, sig: 's' }))
    const encrypt = vi.fn(async () => 'cifrado')
    instalar({ getPublicKey: async () => pubkey, signEvent, nip44: { encrypt, decrypt: vi.fn() } })

    const assinante = await entrarComExtensao()
    expect(assinante.pubkey).toBe(pubkey)
    expect(assinante.exportarNsec).toBeUndefined()
    await assinante.assinar({ kind: 1, created_at: 1, tags: [], content: 'oi' })
    expect(signEvent).toHaveBeenCalledOnce()
    expect(await assinante.nip44.cifrar('outro', 'oi')).toBe('cifrado')
  })
})
