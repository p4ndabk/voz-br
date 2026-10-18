import { render, waitFor } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'

const parar = vi.hoisted(() => vi.fn())
const iniciarMensageria = vi.hoisted(() => vi.fn(() => parar))
vi.mock('@/conversas/mensageria', async (original) => ({
  ...(await original<typeof import('@/conversas/mensageria')>()),
  iniciarMensageria,
}))
vi.mock('@/nostr/useRelays', () => ({ useRelays: () => ({ lista: [], conectados: 0, total: 0 }) }))

const eu = criarAssinanteLocal(gerarChave())

beforeEach(async () => {
  await clear()
  parar.mockClear()
  iniciarMensageria.mockClear()
  useSessao.setState({ fase: 'carregando', assinante: null })
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
})

describe('App', () => {
  it('dentro: comeca a receber mensagens; ao sair, para e limpa a memoria da conta', async () => {
    render(<App />)
    await waitFor(() => expect(useSessao.getState().fase).toBe('fora'))

    useConversas.setState({
      conversas: [{ pubkey: 'a'.repeat(64), relaysDica: [], criadaEm: 1, novaPessoa: false }],
      carregada: true,
    })
    useMensagens.setState({ porConversa: { ['a'.repeat(64)]: [] } })
    useSessao.setState({ fase: 'dentro', assinante: eu })
    await waitFor(() => expect(iniciarMensageria).toHaveBeenCalledWith(eu))

    useSessao.setState({ fase: 'fora', assinante: null })
    await waitFor(() => expect(parar).toHaveBeenCalled())
    expect(useConversas.getState().conversas).toEqual([])
    expect(useMensagens.getState().porConversa).toEqual({})
  })

  it('fora: nao recebe nada', async () => {
    render(<App />)
    await waitFor(() => expect(useSessao.getState().fase).toBe('fora'))
    expect(iniciarMensageria).not.toHaveBeenCalled()
  })
})
