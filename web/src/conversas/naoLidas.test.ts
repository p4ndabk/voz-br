import { clear, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from './useConversas'

vi.mock('@/nostr/relays', () => ({ relays: { publicar: vi.fn(), consultar: vi.fn() } }))

const maria = 'a'.repeat(64)
const agora = () => Math.floor(Date.now() / 1000)
const conversa = () => useConversas.getState().conversas.find((c) => c.pubkey === maria)

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
})

describe('mensagens nao lidas', () => {
  it('RN-WEB-CONVERSAS-010: mensagem nova do outro conta e marcarVista zera', async () => {
    await set('voz:desde', agora() - 100)
    await useConversas.getState().registrarRecebida(maria, agora(), 'oi')
    await useConversas.getState().registrarRecebida(maria, agora() + 1, 'oi de novo')
    expect(conversa()?.naoLidas).toBe(2)
    await useConversas.getState().marcarVista(maria)
    expect(conversa()?.naoLidas).toBe(0)
    await useConversas.getState().registrarRecebida(maria, agora() + 5, 'volta')
    expect(conversa()?.naoLidas).toBe(1)
  })

  it('RN-WEB-CONVERSAS-010: mensagem minha nunca conta', async () => {
    await set('voz:desde', agora() - 100)
    await useConversas.getState().registrarRecebida(maria, agora(), 'eu falei', [], true)
    expect(conversa()?.naoLidas ?? 0).toBe(0)
  })

  it('RN-WEB-CONVERSAS-011: historico anterior a este navegador nao conta', async () => {
    await set('voz:desde', agora())
    await useConversas.getState().registrarRecebida(maria, agora() - 5000, 'antiga')
    expect(conversa()?.naoLidas ?? 0).toBe(0)
  })

  it('RN-WEB-CONVERSAS-011: conversa sem controle anterior conta como lida', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().registrarRecebida(maria, 1000, 'velha')
    await useConversas.getState().marcarVista(maria)
    await useConversas.getState().registrarRecebida(maria, 900, 'reentregue')
    expect(conversa()?.naoLidas).toBe(0)
  })
})
