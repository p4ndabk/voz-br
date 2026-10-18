import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from './useConversas'

// RN-WEB-CONVERSAS-006: nada aqui fala com relay. Se falasse, estes mocks pegariam.
const publicar = vi.hoisted(() => vi.fn())
const consultar = vi.hoisted(() => vi.fn())
vi.mock('@/nostr/relays', () => ({ relays: { publicar, consultar } }))

const maria = 'a'.repeat(64)
const joao = 'b'.repeat(64)

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  publicar.mockClear()
  consultar.mockClear()
})

const lista = () => useConversas.getState().conversas.map((c) => c.pubkey)

describe('useConversas', () => {
  it('cria a conversa e guarda os relays de dica', async () => {
    const { conversa, criada } = await useConversas.getState().abrirOuCriar(maria, ['wss://x'])
    expect(criada).toBe(true)
    expect(conversa).toMatchObject({ pubkey: maria, relaysDica: ['wss://x'], novaPessoa: false })
    expect(lista()).toEqual([maria])
  })

  it('RN-WEB-CONVERSAS-005: pubkey repetida abre a existente, sem duplicar', async () => {
    const primeira = await useConversas.getState().abrirOuCriar(maria)
    const segunda = await useConversas.getState().abrirOuCriar(maria)
    expect(segunda.criada).toBe(false)
    expect(segunda.conversa).toEqual(primeira.conversa)
    expect(lista()).toEqual([maria])
  })

  it('sobrevive a recarregar a pagina (le do IndexedDB)', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    useConversas.setState({ conversas: [], carregada: false })
    await useConversas.getState().carregar()
    expect(lista()).toEqual([maria])
    expect(useConversas.getState().carregada).toBe(true)
  })

  it('ordena pela ultima mensagem, mais recente primeiro', async () => {
    await useConversas.getState().registrarRecebida(maria, 1000, 'oi')
    await useConversas.getState().registrarRecebida(joao, 2000, 'e ai')
    expect(lista()).toEqual([joao, maria])
    await useConversas.getState().registrarRecebida(maria, 3000, 'voltei')
    expect(lista()).toEqual([maria, joao])
  })

  it('mensagem de quem nao tem sala cria a sala como "Nova pessoa"', async () => {
    const conversa = await useConversas.getState().registrarRecebida(joao, 2000, 'oi')
    expect(conversa).toMatchObject({ pubkey: joao, novaPessoa: true, trecho: 'oi' })
  })

  it('mensagem em sala que eu criei nao a marca como nova pessoa', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    const conversa = await useConversas.getState().registrarRecebida(maria, 2000, 'oi')
    expect(conversa.novaPessoa).toBe(false)
  })

  it('mensagem atrasada nao troca o trecho da mais nova', async () => {
    await useConversas.getState().registrarRecebida(maria, 3000, 'nova')
    const conversa = await useConversas.getState().registrarRecebida(maria, 1000, 'velha')
    expect(conversa).toMatchObject({ ultimaMensagemEm: 3000, trecho: 'nova' })
  })

  it('marcarVista tira o selo "Nova pessoa"', async () => {
    await useConversas.getState().registrarRecebida(joao, 2000, 'oi')
    await useConversas.getState().marcarVista(joao)
    expect(useConversas.getState().conversas[0]?.novaPessoa).toBe(false)
  })

  it('RN-WEB-CONVERSAS-008: remover tira da lista e do armazenamento, sem tocar em relay', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().remover(maria)
    expect(lista()).toEqual([])
    useConversas.setState({ conversas: [] })
    await useConversas.getState().carregar()
    expect(lista()).toEqual([])
    expect(publicar).not.toHaveBeenCalled()
  })

  it('RN-WEB-CONVERSAS-006: criar, abrir e remover nao falam com nenhum relay', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().abrirOuCriar(maria)
    await useConversas.getState().registrarRecebida(joao, 1, 'oi')
    await useConversas.getState().remover(maria)
    expect(publicar).not.toHaveBeenCalled()
    expect(consultar).not.toHaveBeenCalled()
  })
})
