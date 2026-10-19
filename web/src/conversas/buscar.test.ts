import { npubDe } from '@/nostr/perfis'
import { describe, expect, it } from 'vitest'
import type { Conversa } from './armazem'
import { filtrarConversas } from './buscar'

const a = 'a'.repeat(64)
const b = 'b'.repeat(64)
const conversa = (pubkey: string, trecho?: string): Conversa => ({
  pubkey,
  relaysDica: [],
  criadaEm: 1,
  novaPessoa: false,
  trecho,
})
const todas = [conversa(a, 'vamos ao debate de amanhã'), conversa(b, 'oi')]
const nomes = { [a]: 'José', [b]: 'Maria' }

describe('filtrarConversas', () => {
  it('RN-WEB-LAYOUT-006: termo vazio devolve todas', () => {
    expect(filtrarConversas(todas, '  ', nomes)).toEqual(todas)
  })
  it('RN-WEB-LAYOUT-006: acha pelo nome, sem acento nem caixa', () => {
    expect(filtrarConversas(todas, 'jose', nomes).map((c) => c.pubkey)).toEqual([a])
  })
  it('RN-WEB-LAYOUT-006: acha pelo trecho da ultima mensagem', () => {
    expect(filtrarConversas(todas, 'AMANHA', nomes).map((c) => c.pubkey)).toEqual([a])
  })
  it('RN-WEB-LAYOUT-006: acha por pedaco do npub', () => {
    const npub = npubDe(b)
    expect(filtrarConversas(todas, npub.slice(0, 20), nomes).map((c) => c.pubkey)).toEqual([b])
  })
  it('RN-WEB-LAYOUT-006: sem resultado devolve lista vazia', () => {
    expect(filtrarConversas(todas, 'zzz', nomes)).toEqual([])
  })
})
