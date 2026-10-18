import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { relaysPadrao } from '@/nostr/config'
import { abrirEmbrulho, criarEmbrulhos, lerPedidoDeApagar, type EventoNostr } from '@/nostr/dm'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { assinaturaConfere } from '@/nostr/suporteDeTeste'
import type { Assinante } from '@/nostr/signer/tipos'
import { obterConversa } from './armazem'
import {
  embrulhosDaConversa,
  listarFila,
  listarMensagens,
  salvarEmbrulho,
  salvarMensagem,
} from './armazemMensagens'
import { apagarHistorico, processarFila } from './apagar'
import { enviarMensagem, iniciarMensageria, iniciarRecebimento } from './mensageria'
import { useConversas } from './useConversas'
import { useMensagens } from './useMensagens'

// Relay falso em memoria (ver mensageria.test.ts): guarda o que e publicado, aceita ou recusa por
// relay e entrega eventos a quem se inscreveu.
const rede = vi.hoisted(() => ({
  publicados: [] as { evento: EventoNostr; urls: readonly string[] }[],
  listasDm: new Map<string, EventoNostr>(),
  offline: false,
  conectados: 0,
  ouvinte: null as ((evento: unknown, relay: string) => void) | null,
  aoMudar: null as (() => void) | null,
}))

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    assinar: vi.fn((cb: () => void) => {
      rede.aoMudar = cb
      return () => {
        rede.aoMudar = null
      }
    }),
    conectados: vi.fn(() => rede.conectados),
    publicar: vi.fn(async (evento: EventoNostr, _t?: number, urls?: readonly string[]) => {
      const alvos = urls ?? []
      if (!rede.offline) rede.publicados.push({ evento, urls: alvos })
      return {
        aceitos: rede.offline ? 0 : alvos.length,
        total: alvos.length,
        porRelay: Object.fromEntries(alvos.map((u) => [u, !rede.offline])),
      }
    }),
    consultar: vi.fn(async (filtro: { kinds: number[]; authors: string[] }) => {
      const evento = rede.listasDm.get(filtro.authors[0] ?? '')
      return filtro.kinds[0] === 10050 && evento ? [evento] : []
    }),
    inscrever: vi.fn((_f: object, ouvinte: (e: unknown, r: string) => void) => {
      rede.ouvinte = ouvinte
      return () => {}
    }),
  },
}))

const ana = criarAssinanteLocal(gerarChave()) // eu
const bia = criarAssinanteLocal(gerarChave()) // amiga
const carla = criarAssinanteLocal(gerarChave())
const agora = () => Math.floor(Date.now() / 1000)

async function listaDm(dono: Assinante, urls: string[]) {
  const evento = await dono.assinar({
    kind: 10050,
    created_at: 1000,
    tags: urls.map((u) => ['relay', u]),
    content: '',
  })
  rede.listasDm.set(dono.pubkey, JSON.parse(JSON.stringify(evento)))
}

const emMemoria = (conversa: string) => useMensagens.getState().porConversa[conversa] ?? []
const kind5 = () => rede.publicados.filter((p) => p.evento.kind === 5)

async function enviarTres() {
  for (const texto of ['um', 'dois', 'tres']) await enviarMensagem(ana, bia.pubkey, texto)
}

async function iniciarRecebendo(quem: Assinante) {
  rede.ouvinte = null
  iniciarRecebimento(quem)
  await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
}

const entregar = (evento: EventoNostr) =>
  rede.ouvinte?.(JSON.parse(JSON.stringify(evento)), 'wss://x')

async function pedidoDe(
  de: Assinante,
  para: Assinante,
  limite: number,
  tags = [['voz', 'apagar-historico', String(limite)]],
) {
  const { paraAmigo } = await criarEmbrulhos(
    de,
    para.pubkey,
    'apagou o historico',
    undefined,
    limite,
    tags,
  )
  return paraAmigo.evento
}

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  rede.publicados = []
  rede.listasDm.clear()
  rede.offline = false
  rede.conectados = 0
  rede.ouvinte = null
  rede.aoMudar = null
  await useConversas.getState().abrirOuCriar(bia.pubkey, ['wss://dica'])
  await listaDm(bia, ['wss://dm-da-bia'])
})

describe('apagarHistorico', () => {
  it('apaga as mensagens do aparelho e deixa a marca "historico apagado"', async () => {
    await enviarTres()
    expect(emMemoria(bia.pubkey)).toHaveLength(3)

    const limite = agora()
    const resultado = await apagarHistorico(ana, bia.pubkey, 'Ana', limite)

    expect(resultado.apagadas).toBe(3)
    expect(emMemoria(bia.pubkey)).toHaveLength(0)
    expect(await listarMensagens(bia.pubkey)).toHaveLength(0)
    const conversa = await obterConversa(bia.pubkey)
    expect(conversa).toMatchObject({ apagadoAte: limite, apagadoPor: 'eu' })
    expect(conversa?.trecho).toBeUndefined()
  })

  it('RN-WEB-APAGAR-005: um kind 5 por embrulho, assinado pela chave efemera dele, nos mesmos relays', async () => {
    await enviarTres()
    const embrulhos = rede.publicados.filter((p) => p.evento.kind === 1059)
    expect(embrulhos).toHaveLength(6)
    rede.publicados = []

    await apagarHistorico(ana, bia.pubkey, 'Ana', agora())

    const pedidos = kind5()
    expect(pedidos).toHaveLength(6)
    for (const embrulho of embrulhos) {
      const pedido = pedidos.find((p) => p.evento.tags[0]?.[1] === embrulho.evento.id)
      expect(pedido, 'cada embrulho tem um pedido').toBeDefined()
      expect(pedido!.evento.tags).toEqual([
        ['e', embrulho.evento.id],
        ['k', '1059'],
      ])
      expect(pedido!.evento.pubkey).toBe(embrulho.evento.pubkey) // chave efemera do embrulho
      expect(assinaturaConfere(pedido!.evento)).toBe(true)
      expect(pedido!.urls).toEqual(embrulho.urls) // os relays onde ele foi publicado
    }
  })

  it('RN-WEB-APAGAR-005: nenhum kind 5 e assinado pela minha chave principal', async () => {
    await enviarTres()
    rede.publicados = []
    await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    expect(kind5().length).toBeGreaterThan(0)
    for (const p of kind5()) expect(p.evento.pubkey).not.toBe(ana.pubkey)
  })

  it('descarta as chaves efemeras depois de assinar e enfileirar os pedidos', async () => {
    await enviarTres()
    expect((await embrulhosDaConversa(bia.pubkey)).length).toBe(6)
    await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    expect(await embrulhosDaConversa(bia.pubkey)).toEqual([])
  })

  it('avisa a amiga: mensagem de controle com texto legivel e a tag para o Voz', async () => {
    await enviarMensagem(ana, bia.pubkey, 'oi')
    rede.publicados = []
    const limite = agora()
    await apagarHistorico(ana, bia.pubkey, 'Ana', limite)

    const paraBia = rede.publicados.find(
      (p) => p.evento.kind === 1059 && p.evento.tags[0]?.[1] === bia.pubkey,
    )
    expect(paraBia?.urls).toEqual(['wss://dm-da-bia'])
    const rumor = await abrirEmbrulho(bia, JSON.parse(JSON.stringify(paraBia!.evento)))
    expect(rumor?.content).toBe(
      'Ana apagou o histórico desta conversa no Voz e pediu que você apague também.',
    )
    expect(rumor?.created_at).toBe(limite)
    expect(lerPedidoDeApagar(rumor!)).toBe(limite)
  })

  it('devolve o resumo: relays atendidos, aviso enviado, nada pendente', async () => {
    await enviarTres()
    const resultado = await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    // relays dos embrulhos: o da amiga (1) + os padrao, onde ficam as minhas copias
    expect(resultado).toMatchObject({
      apagadas: 3,
      relaysTotal: 1 + relaysPadrao.length,
      relaysAtendidos: 1 + relaysPadrao.length,
      aviso: 'enviado',
      semChave: 0,
      pendentes: 0,
    })
    expect(await listarFila()).toEqual([])
  })

  it('RN-WEB-APAGAR-002 e 003: sem internet apaga aqui, enfileira os pedidos e reenvia quando volta', async () => {
    await enviarTres()
    rede.publicados = []
    rede.offline = true

    const resultado = await apagarHistorico(ana, bia.pubkey, 'Ana', agora())

    expect(resultado.apagadas).toBe(3)
    expect(emMemoria(bia.pubkey)).toHaveLength(0)
    expect(resultado.aviso).toBe('pendente')
    expect(resultado.relaysAtendidos).toBe(0)
    expect(resultado.pendentes).toBe(7) // 6 pedidos + o aviso
    expect(await listarFila()).toHaveLength(7)
    expect(rede.publicados).toHaveLength(0)

    rede.offline = false
    await processarFila()
    expect(await listarFila()).toEqual([])
    expect(kind5()).toHaveLength(6)
    expect(
      rede.publicados.some((p) => p.evento.kind === 1059 && p.evento.tags[0]?.[1] === bia.pubkey),
    ).toBe(true)
  })

  it('a fila e reenviada sozinha quando algum relay volta (iniciarMensageria)', async () => {
    await enviarTres()
    rede.offline = true
    await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    expect(await listarFila()).toHaveLength(7)

    const parar = iniciarMensageria(ana)
    rede.offline = false
    rede.conectados = 2
    rede.aoMudar?.()
    await vi.waitFor(async () => expect(await listarFila()).toEqual([]))
    parar()
    expect(rede.aoMudar).toBeNull()
  })

  it('RN-WEB-APAGAR-008: conta as mensagens minhas sem chave efemera guardada', async () => {
    const t = agora() - 100
    for (const [id, autor] of [
      ['antiga-1', ana.pubkey],
      ['antiga-2', ana.pubkey],
      ['dela-1', bia.pubkey],
    ] as const) {
      await salvarMensagem({
        id,
        conversa: bia.pubkey,
        autor,
        texto: id,
        criadoEm: t,
        estado: 'enviada',
      })
    }
    const resultado = await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    expect(resultado.apagadas).toBe(3)
    expect(resultado.semChave).toBe(2) // as da amiga nao contam: so o Voz dela pode pedir
  })

  it('RN-WEB-APAGAR-007: mensagem posterior ao limite continua, com o seu embrulho', async () => {
    const limite = agora()
    await salvarMensagem({
      id: 'depois',
      conversa: bia.pubkey,
      autor: ana.pubkey,
      texto: 'escrita depois do pedido',
      criadoEm: limite + 10,
      estado: 'enviada',
    })
    await useMensagens.getState().carregar(bia.pubkey)
    await salvarEmbrulho({
      id: 'embrulho-depois',
      conversa: bia.pubkey,
      rumorId: 'depois',
      evento: {} as EventoNostr,
      chaveEfemera: 'a'.repeat(64),
      paraMim: false,
      relays: ['wss://x'],
    })

    await apagarHistorico(ana, bia.pubkey, 'Ana', limite)

    expect(emMemoria(bia.pubkey).map((m) => m.id)).toEqual(['depois'])
    expect((await embrulhosDaConversa(bia.pubkey)).map((e) => e.id)).toEqual(['embrulho-depois'])
    expect(kind5()).toHaveLength(0)
  })

  it('a lista de conversas deixa de mostrar o trecho apagado', async () => {
    await enviarMensagem(ana, bia.pubkey, 'segredo')
    await apagarHistorico(ana, bia.pubkey, 'Ana', agora())
    expect(useConversas.getState().conversas[0]?.trecho).toBeUndefined()
  })
})

describe('pedido de apagar recebido', () => {
  async function conversaComHistorico() {
    // Duas mensagens minhas (com embrulho guardado) e uma da amiga.
    await enviarMensagem(ana, bia.pubkey, 'minha 1')
    await enviarMensagem(ana, bia.pubkey, 'minha 2')
    await salvarMensagem({
      id: 'da-bia',
      conversa: bia.pubkey,
      autor: bia.pubkey,
      texto: 'dela',
      criadoEm: agora() - 5,
      estado: 'recebida',
    })
    await useMensagens.getState().carregar(bia.pubkey)
    rede.publicados = []
  }

  it('RN-WEB-APAGAR-004: apaga a conversa aqui, pede os kind 5 dos MEUS embrulhos e nao mostra balao', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    const limite = agora()

    entregar(await pedidoDe(bia, ana, limite))

    await vi.waitFor(() => expect(emMemoria(bia.pubkey)).toHaveLength(0))
    expect(await listarMensagens(bia.pubkey)).toHaveLength(0)
    expect(await obterConversa(bia.pubkey)).toMatchObject({
      apagadoAte: limite,
      apagadoPor: 'outro',
    })
    await vi.waitFor(() => expect(kind5()).toHaveLength(4)) // 2 mensagens x 2 copias
    for (const p of kind5()) expect(p.evento.pubkey).not.toBe(ana.pubkey)
  })

  it('o mesmo pedido de novo (reentregue pelo relay) nao refaz nada', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    const pedido = await pedidoDe(bia, ana, agora())
    entregar(pedido)
    await vi.waitFor(() => expect(kind5()).toHaveLength(4))
    rede.publicados = []

    rede.ouvinte?.(JSON.parse(JSON.stringify(pedido)), 'wss://outro')
    await new Promise((r) => setTimeout(r, 40))
    expect(rede.publicados).toHaveLength(0)
    expect(emMemoria(bia.pubkey)).toHaveLength(0)
  })

  it('RN-WEB-APAGAR-007: mensagem escrita depois do pedido continua nas duas pontas', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    const limite = agora()
    entregar(await pedidoDe(bia, ana, limite))
    await vi.waitFor(() => expect(emMemoria(bia.pubkey)).toHaveLength(0))

    const { paraAmigo } = await criarEmbrulhos(
      bia,
      ana.pubkey,
      'escrevi depois',
      undefined,
      limite + 60,
    )
    entregar(paraAmigo.evento)
    await vi.waitFor(() =>
      expect(emMemoria(bia.pubkey).map((m) => m.texto)).toEqual(['escrevi depois']),
    )
  })

  it('RN-WEB-APAGAR-009: o que foi apagado nao ressuscita quando um relay reentrega o embrulho antigo', async () => {
    await iniciarRecebendo(ana)
    const velha = await criarEmbrulhos(bia, ana.pubkey, 'mensagem antiga', undefined, agora() - 50)
    entregar(velha.paraAmigo.evento)
    await vi.waitFor(() => expect(emMemoria(bia.pubkey)).toHaveLength(1))

    entregar(await pedidoDe(bia, ana, agora()))
    await vi.waitFor(() => expect(emMemoria(bia.pubkey)).toHaveLength(0))

    // outro relay (que nao honrou o pedido) entrega a mesma mensagem antiga de novo
    rede.ouvinte?.(JSON.parse(JSON.stringify(velha.paraAmigo.evento)), 'wss://teimoso')
    const outraCopia = await criarEmbrulhos(
      bia,
      ana.pubkey,
      'mensagem antiga',
      undefined,
      agora() - 50,
    )
    entregar(outraCopia.paraAmigo.evento)
    await new Promise((r) => setTimeout(r, 40))
    expect(emMemoria(bia.pubkey)).toHaveLength(0)
    expect(await listarMensagens(bia.pubkey)).toHaveLength(0)
  })

  it('RN-WEB-APAGAR-007: pedido falso de terceiro so apaga a conversa com o proprio terceiro', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)

    // A Carla manda um "apagar historico" qualquer: so pode atingir a conversa dela com a Ana.
    entregar(await pedidoDe(carla, ana, agora()))
    await vi.waitFor(async () =>
      expect(await obterConversa(carla.pubkey)).toMatchObject({ apagadoPor: 'outro' }),
    )

    expect(emMemoria(bia.pubkey).map((m) => m.id)).toContain('da-bia')
    expect(emMemoria(bia.pubkey)).toHaveLength(3)
    expect((await obterConversa(bia.pubkey))?.apagadoAte).toBeUndefined()
    expect(kind5()).toHaveLength(0)
  })

  it('tag invalida nao apaga nada: o texto aparece como mensagem comum', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    entregar(await pedidoDe(bia, ana, agora(), [['voz', 'apagar-historico', 'abc']]))
    await vi.waitFor(() => expect(emMemoria(bia.pubkey)).toHaveLength(4))
    expect(emMemoria(bia.pubkey).some((m) => m.texto === 'apagou o historico')).toBe(true)
    expect(kind5()).toHaveLength(0)
  })

  it('limite no futuro e cortado no instante do proprio pedido', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    const agoraS = agora()
    entregar(
      await pedidoDe(bia, ana, agoraS, [['voz', 'apagar-historico', String(agoraS + 100000)]]),
    )
    await vi.waitFor(async () =>
      expect((await obterConversa(bia.pubkey))?.apagadoAte).toBeDefined(),
    )
    expect((await obterConversa(bia.pubkey))?.apagadoAte).toBe(agoraS)
  })

  it('meu proprio pedido vindo de outro aparelho apaga aqui e conta como "eu"', async () => {
    await conversaComHistorico()
    await iniciarRecebendo(ana)
    entregar(
      (
        await criarEmbrulhos(ana, bia.pubkey, 'apaguei', undefined, agora(), [
          ['voz', 'apagar-historico', String(agora())],
        ])
      ).paraMim.evento,
    )
    await vi.waitFor(async () =>
      expect(await obterConversa(bia.pubkey)).toMatchObject({ apagadoPor: 'eu' }),
    )
    expect(emMemoria(bia.pubkey)).toHaveLength(0)
  })
})
