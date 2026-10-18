import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarEmbrulhos, type EventoNostr } from '@/nostr/dm'
import { relaysPadrao } from '@/nostr/config'
import { gerarChave } from '@/nostr/signer/chaves'
import { embrulhoComSeloForjado } from '@/nostr/suporteDeTeste'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import type { Assinante } from '@/nostr/signer/tipos'
import { embrulhosDaMensagem, obterMensagem, salvarMensagem } from './armazemMensagens'
import {
  enviarMensagem,
  garantirRelaysDm,
  iniciarMensageria,
  iniciarRecebimento,
  LIMITE_MENSAGEM,
  reenviarMensagem,
  validarTexto,
} from './mensageria'
import { useConversas } from './useConversas'
import { useMensagens } from './useMensagens'

// Relay falso em memoria: guarda o que e publicado e entrega eventos a quem se inscreveu.
const rede = vi.hoisted(() => ({
  publicados: [] as { evento: EventoNostr; urls?: readonly string[] }[],
  listasDm: new Map<string, EventoNostr>(),
  aceitos: 1,
  falhaAoPublicar: false,
  ouvinte: null as ((evento: unknown, relay: string) => void) | null,
  inscricoes: [] as { filtro: object; urls?: readonly string[] }[],
  cancelou: false,
}))

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    publicar: vi.fn(async (evento: EventoNostr, _t?: number, urls?: readonly string[]) => {
      if (rede.falhaAoPublicar) throw new Error('rede caiu')
      rede.publicados.push({ evento, urls })
      return { aceitos: rede.aceitos, total: urls?.length ?? 3 }
    }),
    consultar: vi.fn(async (filtro: { kinds: number[]; authors: string[] }) => {
      const evento = rede.listasDm.get(filtro.authors[0] ?? '')
      return filtro.kinds[0] === 10050 && evento ? [evento] : []
    }),
    inscrever: vi.fn(
      (filtro: object, ouvinte: (e: unknown, r: string) => void, urls?: readonly string[]) => {
        rede.ouvinte = ouvinte
        rede.inscricoes.push({ filtro, urls })
        return () => {
          rede.cancelou = true
        }
      },
    ),
  },
}))

const ana = criarAssinanteLocal(gerarChave()) // eu
const bia = criarAssinanteLocal(gerarChave()) // amiga
const carla = criarAssinanteLocal(gerarChave())

async function listaDm(dono: Assinante, urls: string[]) {
  const evento = await dono.assinar({
    kind: 10050,
    created_at: 1000,
    tags: urls.map((u) => ['relay', u]),
    content: '',
  })
  rede.listasDm.set(dono.pubkey, JSON.parse(JSON.stringify(evento)))
}

const mensagensDaBia = () => useMensagens.getState().porConversa[bia.pubkey] ?? []

async function entregar(evento: EventoNostr) {
  rede.ouvinte?.(JSON.parse(JSON.stringify(evento)), 'wss://x')
}

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  rede.publicados = []
  rede.listasDm.clear()
  rede.aceitos = 1
  rede.falhaAoPublicar = false
  rede.ouvinte = null
  rede.inscricoes = []
  rede.cancelou = false
  await useConversas.getState().abrirOuCriar(bia.pubkey, ['wss://dica'])
})

describe('validarTexto', () => {
  it('RN-WEB-MENSAGENS-004 e 005: vazio e longo demais nao passam; 4000 passa', () => {
    expect(validarTexto('')).toBe('vazio')
    expect(validarTexto('   \n ')).toBe('vazio')
    expect(validarTexto('a'.repeat(LIMITE_MENSAGEM))).toBe('ok')
    expect(validarTexto('a'.repeat(LIMITE_MENSAGEM + 1))).toBe('longo')
  })
})

describe('enviarMensagem', () => {
  it('manda o embrulho do amigo para os relays de DM dele e fica "enviada"', async () => {
    await listaDm(bia, ['wss://dm-da-bia'])
    const mensagem = await enviarMensagem(ana, bia.pubkey, '  oi, tudo bem?  ')

    expect(mensagem).toMatchObject({
      texto: 'oi, tudo bem?',
      estado: 'enviando',
      autor: ana.pubkey,
    })
    expect(mensagensDaBia()).toHaveLength(1)
    expect(mensagensDaBia()[0]).toMatchObject({ estado: 'enviada', semRelaysDm: false })

    const paraBia = rede.publicados.find((p) => p.evento.tags[0]?.[1] === bia.pubkey)
    expect(paraBia?.urls).toEqual(['wss://dm-da-bia'])
    const paraMim = rede.publicados.find((p) => p.evento.tags[0]?.[1] === ana.pubkey)
    expect(paraMim?.urls).toEqual([...relaysPadrao]) // sem lista propria: padrao
  })

  it('RN-WEB-MENSAGENS-003: o texto nunca vai em claro para os relays', async () => {
    await listaDm(bia, ['wss://dm-da-bia'])
    await enviarMensagem(ana, bia.pubkey, 'segredo-politico-123')
    expect(rede.publicados).toHaveLength(2)
    expect(JSON.stringify(rede.publicados)).not.toContain('segredo-politico-123')
  })

  it('atualiza a lista de conversas com o trecho e a hora', async () => {
    await enviarMensagem(ana, bia.pubkey, 'oi\n\ntudo bem?')
    const conversa = useConversas.getState().conversas[0]
    expect(conversa?.trecho).toBe('oi tudo bem?')
    expect(conversa?.ultimaMensagemEm).toBeTypeOf('number')
  })

  it('guarda as chaves efemeras e os eventos dos dois embrulhos (para apagar e reenviar)', async () => {
    const mensagem = await enviarMensagem(ana, bia.pubkey, 'oi')
    const salvos = await embrulhosDaMensagem(mensagem.id)
    expect(salvos).toHaveLength(2)
    expect(salvos.map((s) => s.paraMim).sort()).toEqual([false, true])
    for (const s of salvos) expect(s.chaveEfemera).toMatch(/^[0-9a-f]{64}$/)
  })

  it('amigo sem lista de DM: usa dicas e relays padrao, e marca a mensagem', async () => {
    await enviarMensagem(ana, bia.pubkey, 'oi')
    const paraBia = rede.publicados.find((p) => p.evento.tags[0]?.[1] === bia.pubkey)
    expect(paraBia?.urls).toEqual(['wss://dica', ...relaysPadrao])
    expect(mensagensDaBia()[0]?.semRelaysDm).toBe(true)
  })

  it('RN-WEB-MENSAGENS-009: sem OK de nenhum relay do amigo, fica "falhou"', async () => {
    rede.aceitos = 0
    await enviarMensagem(ana, bia.pubkey, 'oi')
    expect(mensagensDaBia()[0]?.estado).toBe('falhou')
  })

  it('erro de rede ao publicar tambem vira "falhou" (nao lanca)', async () => {
    rede.falhaAoPublicar = true
    await expect(enviarMensagem(ana, bia.pubkey, 'oi')).resolves.toBeDefined()
    expect(mensagensDaBia()[0]?.estado).toBe('falhou')
  })

  it('RN-WEB-MENSAGENS-004: texto vazio ou longo demais nem chega a ser montado', async () => {
    await expect(enviarMensagem(ana, bia.pubkey, '   ')).rejects.toThrow()
    await expect(enviarMensagem(ana, bia.pubkey, 'a'.repeat(4001))).rejects.toThrow()
    expect(rede.publicados).toHaveLength(0)
    expect(mensagensDaBia()).toHaveLength(0)
  })
})

describe('reenviarMensagem', () => {
  it('"Tentar de novo" reenvia os mesmos embrulhos e nao duplica o balao', async () => {
    rede.aceitos = 0
    const mensagem = await enviarMensagem(ana, bia.pubkey, 'oi')
    const primeiraRodada = rede.publicados.map((p) => p.evento.id)
    expect(mensagensDaBia()[0]?.estado).toBe('falhou')

    rede.aceitos = 1
    rede.publicados = []
    await reenviarMensagem(ana, mensagem.id)

    expect(mensagensDaBia()).toHaveLength(1)
    expect(mensagensDaBia()[0]?.estado).toBe('enviada')
    expect(rede.publicados.map((p) => p.evento.id).sort()).toEqual([...primeiraRodada].sort())
  })

  it('mensagem ja enviada nao e reenviada', async () => {
    const mensagem = await enviarMensagem(ana, bia.pubkey, 'oi')
    rede.publicados = []
    await reenviarMensagem(ana, mensagem.id)
    expect(rede.publicados).toHaveLength(0)
  })
})

describe('recebimento', () => {
  async function embrulhoDe(de: Assinante, para: Assinante, texto: string, agora?: number) {
    const { paraAmigo } = await criarEmbrulhos(de, para.pubkey, texto, undefined, agora)
    return paraAmigo.evento
  }

  it('assina os embrulhos enderecados a mim, nos meus relays de DM', async () => {
    await listaDm(ana, ['wss://meu-dm'])
    const parar = iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.inscricoes).toHaveLength(1))
    expect(rede.inscricoes[0]).toEqual({
      filtro: { kinds: [1059], '#p': [ana.pubkey], limit: 500 },
      urls: ['wss://meu-dm'],
    })
    parar()
    expect(rede.cancelou).toBe(true)
  })

  it('mensagem do amigo aparece na conversa, com a hora do rumor', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    await entregar(await embrulhoDe(bia, ana, 'tudo! e Platão?', 1_700_000_000))

    await vi.waitFor(() => expect(mensagensDaBia()).toHaveLength(1))
    expect(mensagensDaBia()[0]).toMatchObject({
      texto: 'tudo! e Platão?',
      autor: bia.pubkey,
      criadoEm: 1_700_000_000,
      estado: 'recebida',
    })
    expect(useConversas.getState().conversas[0]).toMatchObject({
      trecho: 'tudo! e Platão?',
      ultimaMensagemEm: 1_700_000_000,
    })
  })

  it('quem nunca falou comigo vira conversa "Nova pessoa"', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    await entregar(await embrulhoDe(carla, ana, 'oi, sou a Carla'))
    await vi.waitFor(() =>
      expect(
        useConversas.getState().conversas.find((c) => c.pubkey === carla.pubkey),
      ).toMatchObject({
        novaPessoa: true,
        trecho: 'oi, sou a Carla',
      }),
    )
  })

  it('mesma mensagem por dois relays aparece uma vez so', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    const embrulho = await embrulhoDe(bia, ana, 'oi')
    await entregar(embrulho)
    await entregar(embrulho)
    // mesma mensagem, embrulho diferente (outro relay tem outra copia): mesmo rumor
    await vi.waitFor(() => expect(mensagensDaBia()).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(mensagensDaBia()).toHaveLength(1)
  })

  it('RN-WEB-MENSAGENS-007: ordena pelo created_at do rumor, nao pela ordem de chegada', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    await entregar(await embrulhoDe(bia, ana, 'terceira', 3000))
    await entregar(await embrulhoDe(bia, ana, 'primeira', 1000))
    await entregar(await embrulhoDe(bia, ana, 'segunda', 2000))
    await vi.waitFor(() => expect(mensagensDaBia()).toHaveLength(3))
    expect(mensagensDaBia().map((m) => m.texto)).toEqual(['primeira', 'segunda', 'terceira'])
  })

  it('a minha propria copia (de outro aparelho) vira "enviada" e nao e "Nova pessoa"', async () => {
    useConversas.setState({ conversas: [] })
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    const { paraMim } = await criarEmbrulhos(ana, carla.pubkey, 'escrevi pelo celular', undefined)
    await entregar(paraMim.evento)
    await vi.waitFor(() =>
      expect(useMensagens.getState().porConversa[carla.pubkey]).toHaveLength(1),
    )
    expect(useMensagens.getState().porConversa[carla.pubkey]?.[0]?.estado).toBe('enviada')
    expect(
      useConversas.getState().conversas.find((c) => c.pubkey === carla.pubkey)?.novaPessoa,
    ).toBe(false)
  })

  it('a copia propria de uma mensagem que acabei de enviar nao duplica o balao', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    await enviarMensagem(ana, bia.pubkey, 'oi')
    const minhaCopia = rede.publicados.find((p) => p.evento.tags[0]?.[1] === ana.pubkey)!.evento
    await entregar(minhaCopia)
    await new Promise((r) => setTimeout(r, 30))
    expect(mensagensDaBia()).toHaveLength(1)
  })

  it('RN-WEB-MENSAGENS-006: selo falsificado e descartado, sem criar conversa nem mensagem', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    // Carla escreve um rumor "da Bia" para a Ana, mas so assina o selo como Carla.
    const falso = await embrulhoComSeloForjado(bia.pubkey, carla, ana, 'a Bia disse isso')
    await entregar(falso)
    await new Promise((r) => setTimeout(r, 30))
    expect(mensagensDaBia()).toHaveLength(0)
    expect(useConversas.getState().conversas.find((c) => c.pubkey === carla.pubkey)).toBeUndefined()
  })

  it('lixo vindo do relay nao derruba o recebimento', async () => {
    iniciarRecebimento(ana)
    await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
    await entregar({ id: 'x', kind: 1059 } as EventoNostr)
    rede.ouvinte?.(null, 'wss://x')
    rede.ouvinte?.('texto', 'wss://x')
    await entregar(await embrulhoDe(bia, ana, 'ainda funciona'))
    await vi.waitFor(() => expect(mensagensDaBia()).toHaveLength(1))
  })
})

describe('relays de DM e inicializacao', () => {
  it('primeiro login sem kind 10050: publica a lista com os relays padrao', async () => {
    await garantirRelaysDm(ana)
    expect(rede.publicados).toHaveLength(1)
    const { evento } = rede.publicados[0]!
    expect(evento.kind).toBe(10050)
    expect(evento.tags).toEqual(relaysPadrao.map((u) => ['relay', u]))
  })

  it('quem ja tem lista de DM nao republica', async () => {
    await listaDm(ana, ['wss://meu-dm'])
    await garantirRelaysDm(ana)
    expect(rede.publicados).toHaveLength(0)
  })

  it('mensagem que ficou "enviando" quando a pagina fechou vira "falhou"', async () => {
    await salvarMensagem({
      id: 'preso',
      conversa: bia.pubkey,
      autor: ana.pubkey,
      texto: 'oi',
      criadoEm: 1,
      estado: 'enviando',
    })
    const parar = iniciarMensageria(ana)
    await vi.waitFor(async () => expect((await obterMensagem('preso'))?.estado).toBe('falhou'))
    parar()
  })
})
