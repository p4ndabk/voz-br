import { describe, expect, it } from 'vitest'
import type { Conversa } from './armazem'
import { mesclar, paraPortatil } from './sincronia'
import type { ConversaPortatil } from '@/nostr/listaPortatil'

const a = 'a'.repeat(64)
const b = 'b'.repeat(64)
const local = (extra: Partial<Conversa> = {}): Conversa => ({
  pubkey: a,
  relaysDica: [],
  criadaEm: 1000,
  novaPessoa: false,
  ...extra,
})
const remota = (extra: Partial<ConversaPortatil> = {}): ConversaPortatil => ({
  pubkey: a,
  relaysDica: [],
  criadaEm: 1000,
  ...extra,
})

describe('paraPortatil', () => {
  it('RN-WEB-SYNC-002: nunca leva o trecho nem texto de mensagem', () => {
    const portatil = paraPortatil(local({ trecho: 'segredo da conversa', ultimaMensagemEm: 5000 }))
    expect(JSON.stringify(portatil)).not.toContain('segredo')
    expect(portatil).not.toHaveProperty('trecho')
    expect(portatil.ultimaMensagemEm).toBeUndefined()
  })

  it('RN-WEB-SYNC-002: com remocao leva a data da ultima mensagem (so a data)', () => {
    expect(paraPortatil(local({ removidaEm: 3000, ultimaMensagemEm: 2000 })).ultimaMensagemEm).toBe(
      2000,
    )
  })
})

describe('mesclar', () => {
  it('RN-WEB-SYNC-003: conversa que so existe fora entra, como lida e sem trecho', () => {
    const r = mesclar([], [remota({ pubkey: b, relaysDica: ['wss://x'] })])
    expect(r.conversas).toHaveLength(1)
    expect(r.conversas[0]).toMatchObject({ pubkey: b, relaysDica: ['wss://x'], novaPessoa: false })
    expect(r.conversas[0]?.trecho).toBeUndefined()
    expect(r.alteradas).toHaveLength(1)
    expect(r.remotoDesatualizado).toBe(false)
  })

  it('RN-WEB-SYNC-003: conversa que so existe aqui fica e manda o remoto atualizar', () => {
    const r = mesclar([local()], [])
    expect(r.conversas).toHaveLength(1)
    expect(r.alteradas).toHaveLength(0)
    expect(r.remotoDesatualizado).toBe(true)
  })

  it('RN-WEB-SYNC-003: apagadoAte fica com o maior e o remoto apaga o trecho local', () => {
    const r = mesclar(
      [local({ apagadoAte: 1500, apagadoPor: 'eu', trecho: 'oi' })],
      [remota({ apagadoAte: 2500, apagadoPor: 'outro' })],
    )
    expect(r.conversas[0]).toMatchObject({ apagadoAte: 2500, apagadoPor: 'outro' })
    expect(r.conversas[0]?.trecho).toBeUndefined()
    expect(r.alteradas).toHaveLength(1)
  })

  it('RN-WEB-SYNC-003: apagado so aqui nao se perde e o remoto e atualizado', () => {
    const r = mesclar([local({ apagadoAte: 2000, apagadoPor: 'eu' })], [remota()])
    expect(r.conversas[0]?.apagadoAte).toBe(2000)
    expect(r.remotoDesatualizado).toBe(true)
  })

  it('RN-WEB-SYNC-003: dicas de relay viram a uniao, no maximo 5', () => {
    const r = mesclar(
      [local({ relaysDica: ['wss://a', 'wss://b'] })],
      [remota({ relaysDica: ['wss://b', 'wss://c', 'wss://d', 'wss://e', 'wss://f'] })],
    )
    expect(r.conversas[0]?.relaysDica).toEqual([
      'wss://a',
      'wss://b',
      'wss://c',
      'wss://d',
      'wss://e',
    ])
  })

  it('RN-WEB-SYNC-003: remocao feita no outro aparelho chega aqui', () => {
    const r = mesclar([local({ ultimaMensagemEm: 1500 })], [remota({ removidaEm: 3000 })])
    expect(r.conversas[0]?.removidaEm).toBe(3000)
    expect(r.alteradas).toHaveLength(1)
  })

  it('RN-WEB-SYNC-003: remocao concorrente: vale a mais nova', () => {
    const r = mesclar([local({ removidaEm: 2000 })], [remota({ removidaEm: 4000 })])
    expect(r.conversas[0]?.removidaEm).toBe(4000)
  })

  it('RN-WEB-SYNC-003: reabertura mais nova guarda a maior data', () => {
    const r = mesclar(
      [local({ removidaEm: 2000, reabertaEm: 2500 })],
      [remota({ removidaEm: 2000 })],
    )
    expect(r.conversas[0]).toMatchObject({ removidaEm: 2000, reabertaEm: 2500 })
    expect(r.remotoDesatualizado).toBe(true)
  })

  it('RN-WEB-SYNC-003: listas iguais nao mudam nada', () => {
    const r = mesclar([local({ relaysDica: ['wss://a'] })], [remota({ relaysDica: ['wss://a'] })])
    expect(r.alteradas).toHaveLength(0)
    expect(r.remotoDesatualizado).toBe(false)
  })
})
