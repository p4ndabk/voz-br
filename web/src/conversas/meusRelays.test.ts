import { clear, get } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { relaysPadrao } from '@/nostr/config'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { ErroSalvarRelays, useMeusRelays, validarRelay } from './meusRelays'
import { meusRelaysDm } from './relaysDm'

const rede = vi.hoisted(() => ({
  eventos: [] as unknown[],
  publicados: [] as {
    evento: { kind: number; tags: string[][]; created_at: number }
    urls?: readonly string[]
  }[],
  aceitos: 1,
  definidos: [] as string[][],
}))

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    snapshot: vi.fn(() => [{ url: 'wss://a', estado: 'conectado' }]),
    consultar: vi.fn(async () => rede.eventos),
    publicar: vi.fn(async (evento: never, _t?: number, urls?: readonly string[]) => {
      rede.publicados.push({ evento, urls })
      return { aceitos: rede.aceitos, total: urls?.length ?? 0, porRelay: {} }
    }),
    definirRelays: vi.fn((urls: string[]) => rede.definidos.push(urls)),
  },
}))

const ana = criarAssinanteLocal(gerarChave())

async function listaDe(urls: string[], criadoEm: number) {
  return JSON.parse(
    JSON.stringify(
      await ana.assinar({
        kind: 10050,
        created_at: criadoEm,
        tags: urls.map((u) => ['relay', u]),
        content: '',
      }),
    ),
  )
}

beforeEach(async () => {
  await clear()
  useMeusRelays.getState().limpar()
  rede.eventos = []
  rede.publicados = []
  rede.aceitos = 1
  rede.definidos = []
})

// RN-WEB-RELAYS-007
describe('validarRelay', () => {
  it('aceita wss:// e tira a barra final', () => {
    expect(validarRelay('  wss://meu.relay.com/ ', [])).toEqual({
      ok: true,
      url: 'wss://meu.relay.com',
    })
  })

  it('recusa o que nao e wss://', () => {
    for (const ruim of ['', 'meu.relay.com', 'http://x.com', 'ws://x.com', 'wss://', 'wss:// x']) {
      expect(validarRelay(ruim, [])).toEqual({ ok: false, motivo: 'formato' })
    }
  })

  it('recusa repetido (sem diferenciar maiusculas) e o sexto', () => {
    expect(validarRelay('wss://A.com/', ['wss://a.com'])).toEqual({
      ok: false,
      motivo: 'duplicado',
    })
    const cinco = ['wss://1', 'wss://2', 'wss://3', 'wss://4', 'wss://5'].map((u) => u + '.com')
    expect(validarRelay('wss://6.com', cinco)).toEqual({ ok: false, motivo: 'limite' })
  })
})

describe('carregar', () => {
  it('sem lista em lugar nenhum: valem os padrao', async () => {
    await useMeusRelays.getState().carregar(ana.pubkey)
    expect(useMeusRelays.getState()).toMatchObject({ lista: [], carregada: true })
    expect(await meusRelaysDm(ana.pubkey).catch(() => [])).toEqual([...relaysPadrao])
  })

  it('usa o kind 10050 achado nos relays, aplica nas conexoes e guarda no cache', async () => {
    rede.eventos = [await listaDe(['wss://meu.com', 'wss://b.com'], 1000)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    expect(useMeusRelays.getState().lista).toEqual(['wss://meu.com', 'wss://b.com'])
    expect(rede.definidos.at(-1)).toEqual(['wss://meu.com', 'wss://b.com'])
    expect(await meusRelaysDm(ana.pubkey)).toEqual(['wss://meu.com', 'wss://b.com'])
    expect(await get(`voz:relays-dm:${ana.pubkey}`)).toMatchObject({ criadoEm: 1000 })
  })

  it('sem rede, abre com o cache', async () => {
    rede.eventos = [await listaDe(['wss://meu.com'], 1000)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    useMeusRelays.getState().limpar()
    rede.eventos = []
    await useMeusRelays.getState().carregar(ana.pubkey)
    expect(useMeusRelays.getState().lista).toEqual(['wss://meu.com'])
  })

  it('lista mais nova nos relays vence o cache', async () => {
    rede.eventos = [await listaDe(['wss://velho.com'], 1000)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    rede.eventos = [await listaDe(['wss://novo.com'], 2000)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    expect(useMeusRelays.getState().lista).toEqual(['wss://novo.com'])
  })
})

// RN-WEB-RELAYS-008
describe('salvar', () => {
  it('publica o kind 10050 na uniao de antigos, novos e relays de perfil, e passa a valer', async () => {
    const r = await useMeusRelays.getState().salvar(ana, ['wss://meu.com', 'wss://b.com'], 5000)

    expect(r.aceitos).toBe(1)
    const { evento, urls } = rede.publicados[0]!
    expect(evento.kind).toBe(10050)
    expect(evento.tags).toEqual([
      ['relay', 'wss://meu.com'],
      ['relay', 'wss://b.com'],
    ])
    expect(urls).toEqual(
      expect.arrayContaining([
        ...relaysPadrao,
        'wss://meu.com',
        'wss://b.com',
        'wss://purplepag.es',
      ]),
    )
    expect(useMeusRelays.getState().lista).toEqual(['wss://meu.com', 'wss://b.com'])
    expect(rede.definidos.at(-1)).toEqual(['wss://meu.com', 'wss://b.com'])
    expect(await meusRelaysDm(ana.pubkey)).toEqual(['wss://meu.com', 'wss://b.com'])
  })

  it('nenhum relay aceitou: erro e a lista anterior continua', async () => {
    rede.eventos = [await listaDe(['wss://antigo.com'], 1000)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    rede.aceitos = 0
    await expect(useMeusRelays.getState().salvar(ana, ['wss://novo.com'])).rejects.toMatchObject({
      motivo: 'nenhum-relay',
    })
    expect(useMeusRelays.getState().lista).toEqual(['wss://antigo.com'])
  })

  it('o evento novo e sempre mais novo que a lista anterior', async () => {
    rede.eventos = [await listaDe(['wss://antigo.com'], 9_999_999_999)]
    await useMeusRelays.getState().carregar(ana.pubkey)
    await useMeusRelays.getState().salvar(ana, ['wss://novo.com'], 100)
    expect(rede.publicados[0]!.evento.created_at).toBe(10_000_000_000)
  })

  it('lista vazia ou com mais de 5 nao e salva', async () => {
    await expect(useMeusRelays.getState().salvar(ana, [])).rejects.toBeInstanceOf(ErroSalvarRelays)
    const seis = Array.from({ length: 6 }, (_, i) => `wss://r${i}.com`)
    await expect(useMeusRelays.getState().salvar(ana, seis)).rejects.toMatchObject({
      motivo: 'invalida',
    })
    expect(rede.publicados).toHaveLength(0)
  })
})

describe('limpar', () => {
  it('ao sair, volta aos relays padrao', async () => {
    await useMeusRelays.getState().salvar(ana, ['wss://meu.com'])
    useMeusRelays.getState().limpar()
    expect(rede.definidos.at(-1)).toEqual([...relaysPadrao])
    expect(useMeusRelays.getState().lista).toEqual([])
  })
})
