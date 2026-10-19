import { clear, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listarConversas, listarTodasConversas } from './armazem'
import { useConversas } from './useConversas'

vi.mock('@/nostr/relays', () => ({ relays: { publicar: vi.fn(), consultar: vi.fn() } }))

const maria = 'a'.repeat(64)
const agora = () => Math.floor(Date.now() / 1000)
const visivel = () => useConversas.getState().conversas.some((c) => c.pubkey === maria)

beforeEach(async () => {
  await clear()
  await set('voz:desde', agora() - 1000)
  useConversas.setState({ conversas: [], carregada: false })
})

describe('remover da lista com marcador', () => {
  it('RN-WEB-SYNC-003: remover esconde a conversa mas guarda o marcador', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    expect(visivel()).toBe(false)
    expect(await listarConversas()).toEqual([])
    const [guardada] = await listarTodasConversas()
    expect(guardada?.removidaEm).toBeGreaterThan(0)
  })

  it('RN-WEB-SYNC-003: ao recarregar a conversa removida continua fora da lista', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    useConversas.setState({ conversas: [], carregada: false })
    await useConversas.getState().carregar()
    expect(visivel()).toBe(false)
  })

  it('RN-WEB-SYNC-003: mensagem do historico (mais antiga que a remocao) nao ressuscita', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    await useConversas.getState().registrarRecebida(maria, agora() - 500, 'antiga')
    expect(visivel()).toBe(false)
  })

  it('RN-WEB-SYNC-003: mensagem mais nova que a remocao ressuscita a conversa', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    await useConversas.getState().registrarRecebida(maria, agora() + 5, 'oi de novo')
    expect(visivel()).toBe(true)
  })

  it('RN-WEB-SYNC-003: abrir a conversa de novo (Nova conversa) a traz de volta', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    await useConversas.getState().abrirOuCriar(maria)
    expect(visivel()).toBe(true)
    const [guardada] = await listarTodasConversas()
    expect(guardada?.reabertaEm).toBeGreaterThanOrEqual(guardada?.removidaEm ?? 0)
  })
})
