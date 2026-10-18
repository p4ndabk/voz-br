import {
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  getPublicKey,
  nip17,
  nip44,
  verifyEvent,
} from 'nostr-tools'
import { bytesToHex } from 'nostr-tools/utils'
import { describe, expect, it } from 'vitest'
import {
  abrirEmbrulho,
  criarEmbrulhos,
  criarEventoDeApagar,
  criarRumor,
  lerPedidoDeApagar,
  parceiroDoRumor,
  relaysDoEvento,
  type EventoNostr,
} from './dm'
import { gerarChave } from './signer/chaves'
import { embrulhoComSeloForjado } from './suporteDeTeste'
import { criarAssinanteLocal } from './signer/local'

const ana = criarAssinanteLocal(gerarChave())
const bia = criarAssinanteLocal(gerarChave())
const carla = criarAssinanteLocal(gerarChave())

describe('criarEmbrulhos', () => {
  it('RN-WEB-MENSAGENS-001: kind 14 -> selo 13 -> embrulho 1059, uma copia para cada lado', async () => {
    const { rumor, paraAmigo, paraMim } = await criarEmbrulhos(
      ana,
      bia.pubkey,
      'oi, tudo bem?',
      undefined,
    )
    expect(rumor).toMatchObject({ kind: 14, pubkey: ana.pubkey, content: 'oi, tudo bem?' })
    expect(rumor.tags).toEqual([['p', bia.pubkey]])
    for (const [embrulho, destino] of [
      [paraAmigo, bia.pubkey],
      [paraMim, ana.pubkey],
    ] as const) {
      expect(embrulho.evento.kind).toBe(1059)
      expect(embrulho.evento.tags).toEqual([['p', destino]])
      expect(embrulho.destinatario).toBe(destino)
    }
  })

  it('RN-WEB-MENSAGENS-003: o texto nunca aparece em claro no que vai para o relay', async () => {
    const { paraAmigo, paraMim } = await criarEmbrulhos(
      ana,
      bia.pubkey,
      'segredo-politico-123',
      undefined,
    )
    expect(JSON.stringify(paraAmigo.evento)).not.toContain('segredo-politico-123')
    expect(JSON.stringify(paraMim.evento)).not.toContain('segredo-politico-123')
  })

  it('RN-WEB-MENSAGENS-002: cada embrulho usa uma chave efemera nova, que nao e a minha', async () => {
    const a = await criarEmbrulhos(ana, bia.pubkey, 'um', undefined)
    const b = await criarEmbrulhos(ana, bia.pubkey, 'dois', undefined)
    const autores = [a.paraAmigo, a.paraMim, b.paraAmigo, b.paraMim].map((e) => e.evento.pubkey)
    expect(new Set(autores).size).toBe(4)
    expect(autores).not.toContain(ana.pubkey)
    expect(a.paraAmigo.chaveEfemera).toMatch(/^[0-9a-f]{64}$/)
  })

  it('o created_at do embrulho e sorteado ate 2 dias no passado; o do rumor e o real', async () => {
    const agora = 1_760_800_000
    const { rumor, paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined, agora)
    expect(rumor.created_at).toBe(agora)
    expect(paraAmigo.evento.created_at).toBeLessThanOrEqual(agora)
    expect(paraAmigo.evento.created_at).toBeGreaterThan(agora - 2 * 24 * 60 * 60 - 1)
  })

  it('o relay de dica vai na tag p do rumor', async () => {
    const { rumor } = await criarEmbrulhos(ana, bia.pubkey, 'oi', 'wss://dica')
    expect(rumor.tags).toEqual([['p', bia.pubkey, 'wss://dica']])
  })
})

describe('abrirEmbrulho', () => {
  it('o amigo abre a copia dele e le a mensagem e a hora reais', async () => {
    const { rumor, paraAmigo } = await criarEmbrulhos(
      ana,
      bia.pubkey,
      'tudo! e Platão?',
      undefined,
      1_700_000_000,
    )
    const aberto = await abrirEmbrulho(bia, JSON.parse(JSON.stringify(paraAmigo.evento)))
    expect(aberto).toEqual(rumor)
    expect(parceiroDoRumor(aberto!, bia.pubkey)).toBe(ana.pubkey)
  })

  it('quem enviou abre a propria copia e o parceiro e o destinatario', async () => {
    const { rumor, paraMim } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    const aberto = await abrirEmbrulho(ana, JSON.parse(JSON.stringify(paraMim.evento)))
    expect(aberto).toEqual(rumor)
    expect(parceiroDoRumor(aberto!, ana.pubkey)).toBe(bia.pubkey)
  })

  it('terceiro nao consegue abrir', async () => {
    const { paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    expect(await abrirEmbrulho(carla, paraAmigo.evento)).toBeNull()
  })

  it('RN-WEB-MENSAGENS-006: selo assinado por outra chave que nao a do rumor e descartado', async () => {
    // Carla escreve um rumor "da Ana" para a Bia, mas so consegue assinar o selo como Carla.
    const falso = await embrulhoComSeloForjado(ana.pubkey, carla, bia, 'a Ana disse isso')
    expect(await abrirEmbrulho(bia, falso)).toBeNull()
  })

  it('descarta rumor cujo id nao bate com o conteudo', async () => {
    const semId = {
      kind: 14,
      pubkey: ana.pubkey,
      created_at: 1_700_000_000,
      tags: [['p', bia.pubkey]],
      content: 'texto',
    }
    const adulterado = { ...semId, id: getEventHash(semId), content: 'outro texto' }
    const selo = await ana.assinar({
      kind: 13,
      created_at: 1_700_000_000,
      tags: [],
      content: await ana.nip44.cifrar(bia.pubkey, JSON.stringify(adulterado)),
    })
    const chave = generateSecretKey()
    const embrulho = finalizeEvent(
      {
        kind: 1059,
        created_at: 1_700_000_000,
        tags: [['p', bia.pubkey]],
        content: nip44.encrypt(JSON.stringify(selo), nip44.getConversationKey(chave, bia.pubkey)),
      },
      chave,
    )
    expect(await abrirEmbrulho(bia, embrulho)).toBeNull()
  })

  it('descarta embrulho de outro kind, com assinatura invalida ou lixo', async () => {
    const { paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    const adulterado = JSON.parse(
      JSON.stringify({ ...paraAmigo.evento, content: 'x' }),
    ) as EventoNostr
    expect(await abrirEmbrulho(bia, adulterado)).toBeNull()
    expect(await abrirEmbrulho(bia, { ...paraAmigo.evento, kind: 1 })).toBeNull()
    expect(await abrirEmbrulho(bia, null)).toBeNull()
    expect(await abrirEmbrulho(bia, 'lixo')).toBeNull()
    expect(await abrirEmbrulho(bia, {})).toBeNull()
  })

  it('descarta embrulho que nao tem a minha tag p', async () => {
    const { paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    // reassinado com outra tag p, para a assinatura continuar valida
    const outro = generateSecretKey()
    const semTag = finalizeEvent(
      {
        kind: 1059,
        created_at: 1,
        tags: [['p', carla.pubkey]],
        content: paraAmigo.evento.content,
      },
      outro,
    )
    expect(await abrirEmbrulho(bia, semTag)).toBeNull()
  })
})

describe('criarRumor', () => {
  it('o id e o hash do conteudo', () => {
    const r = criarRumor(ana.pubkey, bia.pubkey, 'oi', undefined, 1000)
    const { id, ...semId } = r
    expect(id).toBe(getEventHash(semId))
  })
})

describe('relaysDoEvento', () => {
  const evento = (tags: string[][]) => ({ tags }) as EventoNostr

  it('le as tags relay, normaliza, tira repetidos e limita a 5', () => {
    const tags = [
      ['relay', 'wss://a/'],
      ['relay', 'wss://a'],
      ['relay', 'https://nao-e-relay'],
      ['relay', 'wss://b'],
      ['x', 'wss://ignorada'],
      ['relay', 'wss://c'],
      ['relay', 'wss://d'],
      ['relay', 'wss://e'],
      ['relay', 'wss://f'],
    ]
    expect(relaysDoEvento(evento(tags))).toEqual([
      'wss://a',
      'wss://b',
      'wss://c',
      'wss://d',
      'wss://e',
    ])
    expect(relaysDoEvento(null)).toEqual([])
  })
})

// Interoperabilidade: a implementacao de referencia do NIP-17 no nostr-tools (a mesma base de
// varios clientes) precisa entender o que o Voz envia, e o Voz o que ela envia.
describe('interoperabilidade com a implementacao de referencia (nostr-tools)', () => {
  it('o que o Voz envia, a referencia abre', async () => {
    const chaveDaAna = gerarChave()
    const chaveDaBia = gerarChave()
    const daAna = criarAssinanteLocal(chaveDaAna)
    const daBia = criarAssinanteLocal(chaveDaBia)

    const { paraAmigo, paraMim } = await criarEmbrulhos(
      daAna,
      daBia.pubkey,
      'oi, tudo bem?',
      undefined,
    )

    const paraBia = nip17.unwrapEvent(paraAmigo.evento, chaveDaBia)
    expect(paraBia).toMatchObject({ kind: 14, pubkey: daAna.pubkey, content: 'oi, tudo bem?' })
    const copiaDaAna = nip17.unwrapEvent(paraMim.evento, chaveDaAna)
    expect(copiaDaAna.content).toBe('oi, tudo bem?')
  })

  it('o que a referencia envia, o Voz abre', async () => {
    const chaveDaAna = gerarChave()
    const chaveDaBia = gerarChave()
    const daBia = criarAssinanteLocal(chaveDaBia)
    const daAna = criarAssinanteLocal(chaveDaAna)

    const embrulho = nip17.wrapEvent(chaveDaAna, { publicKey: daBia.pubkey }, 'tudo! e Platão?')
    const rumor = await abrirEmbrulho(daBia, JSON.parse(JSON.stringify(embrulho)))

    expect(rumor).toMatchObject({ pubkey: daAna.pubkey, content: 'tudo! e Platão?' })
    expect(parceiroDoRumor(rumor!, daBia.pubkey)).toBe(daAna.pubkey)
  })
})

describe('pedido de apagar historico', () => {
  const rumorCom = (tags: string[][], created_at = 1000) =>
    criarRumor(ana.pubkey, bia.pubkey, 'x', undefined, created_at, tags)

  it('RN-WEB-APAGAR-007: le o limite da tag voz', () => {
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', '1000']]))).toBe(1000)
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', '900']]))).toBe(900)
  })

  it('RN-WEB-APAGAR-007: o limite nao passa do created_at do proprio pedido', () => {
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', '999999999999']], 1000))).toBe(
      1000,
    )
  })

  it('tag ausente, de outra acao ou invalida nao e pedido (segue como mensagem comum)', () => {
    expect(lerPedidoDeApagar(rumorCom([]))).toBeNull()
    expect(lerPedidoDeApagar(rumorCom([['voz', 'outra-coisa', '1000']]))).toBeNull()
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico']]))).toBeNull()
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', 'abc']]))).toBeNull()
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', '-5']]))).toBeNull()
    expect(lerPedidoDeApagar(rumorCom([['voz', 'apagar-historico', '12.5']]))).toBeNull()
  })

  it('criarEmbrulhos leva a tag extra dentro do rumor, que o amigo le', async () => {
    const { rumor, paraAmigo } = await criarEmbrulhos(
      ana,
      bia.pubkey,
      'Ana apagou o historico',
      undefined,
      1000,
      [['voz', 'apagar-historico', '1000']],
    )
    expect(rumor.tags).toEqual([
      ['p', bia.pubkey],
      ['voz', 'apagar-historico', '1000'],
    ])
    const aberto = await abrirEmbrulho(bia, JSON.parse(JSON.stringify(paraAmigo.evento)))
    expect(lerPedidoDeApagar(aberto!)).toBe(1000)
  })

  it('RN-WEB-APAGAR-005: o kind 5 e assinado pela chave efemera do embrulho, nunca pela minha', async () => {
    const { paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    const evento = criarEventoDeApagar({
      id: paraAmigo.evento.id,
      chaveEfemera: paraAmigo.chaveEfemera,
    })
    expect(evento.kind).toBe(5)
    expect(evento.tags).toEqual([
      ['e', paraAmigo.evento.id],
      ['k', '1059'],
    ])
    expect(evento.pubkey).toBe(paraAmigo.evento.pubkey) // o mesmo autor do embrulho (NIP-09)
    expect(evento.pubkey).not.toBe(ana.pubkey)
    expect(verifyEvent(evento)).toBe(true)
  })

  it('a chave efemera guardada corresponde ao autor do embrulho', async () => {
    const { paraAmigo } = await criarEmbrulhos(ana, bia.pubkey, 'oi', undefined)
    const chave = Uint8Array.from(paraAmigo.chaveEfemera.match(/../g)!.map((h) => parseInt(h, 16)))
    expect(getPublicKey(chave)).toBe(paraAmigo.evento.pubkey)
    expect(bytesToHex(chave)).toBe(paraAmigo.chaveEfemera)
  })
})
