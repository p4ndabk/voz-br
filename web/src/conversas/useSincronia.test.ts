import { clear, set } from 'idb-keyval'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lerListaPortatil, montarListaPortatil } from '@/nostr/listaPortatil'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { listarTodasConversas } from './armazem'
import { useConversas } from './useConversas'
import { ESPERA_PUBLICAR_MS, iniciarSincronia, useSincronia } from './useSincronia'

const rede = vi.hoisted(() => ({
  remotos: [] as unknown[],
  aceitos: 1,
  conectados: 3,
  publicados: [] as { kind: number; created_at: number; content: string }[],
}))

vi.mock('@/nostr/relays', () => ({
  relays: {
    snapshot: vi.fn(() => []),
    conectados: vi.fn(() => rede.conectados),
    assinar: vi.fn(() => () => {}),
    consultar: vi.fn(async () => rede.remotos),
    publicar: vi.fn(async (evento: { kind: number; created_at: number; content: string }) => {
      rede.publicados.push(evento)
      return { aceitos: rede.aceitos, total: 3, porRelay: {} }
    }),
  },
}))

const eu = criarAssinanteLocal(gerarChave())
const maria = 'a'.repeat(64)
const joao = 'b'.repeat(64)
const agora = () => Math.floor(Date.now() / 1000)

beforeEach(async () => {
  await clear()
  await set('voz:desde', agora() - 1000)
  localStorage.clear()
  rede.remotos = []
  rede.aceitos = 1
  rede.conectados = 3
  rede.publicados = []
  useConversas.setState({ conversas: [], carregada: false })
  useSincronia.setState({ ligada: true, estado: 'parada' })
})

afterEach(() => vi.useRealTimers())

describe('sincronia da lista', () => {
  it('ligada, a sincronia consulta os relays (controle do teste de interruptor)', async () => {
    const { relays } = await import('@/nostr/relays')
    vi.mocked(relays.consultar).mockClear()
    await useSincronia.getState().sincronizarAgora(eu)
    expect(relays.consultar).toHaveBeenCalled()
  })

  it('RN-WEB-SYNC-003: restaura a lista de outro aparelho, inclusive conversa sem mensagem', async () => {
    rede.remotos = [
      await montarListaPortatil(
        eu,
        [{ pubkey: maria, relaysDica: ['wss://dica.exemplo'], criadaEm: 100 }],
        agora(),
      ),
    ]
    await useSincronia.getState().sincronizarAgora(eu)
    expect(useSincronia.getState().estado).toBe('ok')
    expect(useConversas.getState().conversas.map((c) => c.pubkey)).toEqual([maria])
    // A lista remota ja era igual: nao republica.
    expect(rede.publicados).toHaveLength(0)
  })

  it('RN-WEB-SYNC-003: remocao feita no outro aparelho esconde a conversa aqui', async () => {
    await useConversas.getState().abrirOuCriar(maria)
    rede.remotos = [
      await montarListaPortatil(
        eu,
        [
          {
            pubkey: maria,
            relaysDica: [],
            criadaEm: 100,
            ultimaMensagemEm: 200,
            removidaEm: agora() + 60,
          },
        ],
        agora(),
      ),
    ]
    await useSincronia.getState().sincronizarAgora(eu)
    expect(useConversas.getState().conversas).toEqual([])
    expect((await listarTodasConversas())[0]?.removidaEm).toBeGreaterThan(0)
  })

  it('RN-WEB-SYNC-005: sem lista nos relays, publica a daqui (kind 30078, so datas e chaves)', async () => {
    await useConversas.getState().abrirOuCriar(maria, ['wss://dica.exemplo'])
    await useConversas.getState().registrarRecebida(maria, agora(), 'texto privado da mensagem')
    await useSincronia.getState().sincronizarAgora(eu)
    expect(rede.publicados).toHaveLength(1)
    const evento = rede.publicados[0]!
    expect(evento.kind).toBe(30078)
    expect(evento.content).not.toContain('texto privado')
    const lida = await lerListaPortatil(eu, evento)
    expect(lida?.conversas.map((c) => c.pubkey)).toEqual([maria])
    expect(JSON.stringify(lida)).not.toContain('texto privado')
    expect(useSincronia.getState().estado).toBe('ok')
  })

  it('RN-WEB-SYNC-005: a nova lista tem created_at maior que a anterior', async () => {
    const futuro = agora() + 500
    rede.remotos = [
      await montarListaPortatil(eu, [{ pubkey: maria, relaysDica: [], criadaEm: 1 }], futuro),
    ]
    await useConversas.getState().abrirOuCriar(joao)
    await useSincronia.getState().sincronizarAgora(eu)
    expect(rede.publicados[0]?.created_at).toBe(futuro + 1)
  })

  it('RN-WEB-SYNC-005: nenhum relay aceitou: estado falhou', async () => {
    rede.aceitos = 0
    await useConversas.getState().abrirOuCriar(maria)
    await useSincronia.getState().sincronizarAgora(eu)
    expect(useSincronia.getState().estado).toBe('falhou')
  })

  it('RN-WEB-SYNC-005: sem relay conectado e sem lista, nao publica por engano', async () => {
    rede.conectados = 0
    await useConversas.getState().abrirOuCriar(maria)
    await useSincronia.getState().sincronizarAgora(eu)
    expect(rede.publicados).toHaveLength(0)
  })

  it('RN-WEB-SYNC-004: desligada, nada e lido nem publicado', async () => {
    const { relays } = await import('@/nostr/relays')
    vi.mocked(relays.consultar).mockClear()
    useSincronia.getState().definirLigada(false)
    await useConversas.getState().abrirOuCriar(maria)
    await useSincronia.getState().sincronizarAgora(eu)
    expect(relays.consultar).not.toHaveBeenCalled()
    expect(rede.publicados).toHaveLength(0)
    expect(localStorage.getItem('voz:sincronia')).toBe('off')
    useSincronia.getState().definirLigada(true)
    expect(localStorage.getItem('voz:sincronia')).toBeNull()
  })
})

describe('publicacao com espera', () => {
  it('RN-WEB-SYNC-005: uma mudanca so e publicada depois de 5 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const parar = iniciarSincronia(eu)
    await vi.advanceTimersByTimeAsync(2_000) // sincronizacao inicial (lista vazia)
    rede.publicados = []
    await useConversas.getState().abrirOuCriar(maria)
    await vi.advanceTimersByTimeAsync(ESPERA_PUBLICAR_MS - 1_000)
    expect(rede.publicados).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2_000)
    await vi.waitFor(() => expect(rede.publicados).toHaveLength(1))
    parar()
  })

  it('RN-WEB-SYNC-005: varias mudancas seguidas viram uma publicacao so', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const parar = iniciarSincronia(eu)
    await vi.advanceTimersByTimeAsync(2_000)
    rede.publicados = []
    await useConversas.getState().abrirOuCriar(maria)
    await vi.advanceTimersByTimeAsync(2_000)
    await useConversas.getState().abrirOuCriar(joao)
    await vi.advanceTimersByTimeAsync(ESPERA_PUBLICAR_MS + 1_000)
    await vi.waitFor(() => expect(rede.publicados).toHaveLength(1))
    const lida = await lerListaPortatil(eu, rede.publicados[0])
    expect(lida?.conversas).toHaveLength(2)
    parar()
  })

  it('RN-WEB-SYNC-005: mensagem nova numa conversa existente nao dispara publicacao', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await useConversas.getState().abrirOuCriar(maria)
    const parar = iniciarSincronia(eu)
    await vi.advanceTimersByTimeAsync(2_000)
    await vi.waitFor(() => expect(rede.publicados).toHaveLength(1))
    rede.publicados = []
    await useConversas.getState().registrarRecebida(maria, agora() + 1, 'oi')
    await vi.advanceTimersByTimeAsync(ESPERA_PUBLICAR_MS + 2_000)
    expect(rede.publicados).toHaveLength(0)
    parar()
  })
})
