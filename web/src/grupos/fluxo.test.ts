import { clear, entries, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 30_000 })
import { aguardarRecebimento, iniciarRecebimento } from '@/conversas/mensageria'
import { useMensagens } from '@/conversas/useMensagens'
import type { EventoNostr } from '@/nostr/dm'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import type { Assinante } from '@/nostr/signer/tipos'
import {
  aceitarConvite,
  convidarPessoa,
  criarNovoGrupo,
  encerrarGrupo,
  encerrarGrupoEApagar,
  excluirGrupo,
  removerPessoaEApagar,
  limparMeuHistorico,
  limparParaTodos,
  passarOCargo,
  recusarConvite,
  removerPessoa,
  sairDoGrupo,
} from './acoes'
import { obterGrupo } from './armazem'
import { enviarMensagemDeGrupo } from './enviar'
import { chaveDaConversa } from './tipos'
import { useGrupos } from './useGrupos'

// A espera da copia propria so atrasa; nos testes passa na hora.
vi.mock('@/conversas/copiaPropria', async (original) => ({
  ...(await original<typeof import('@/conversas/copiaPropria')>()),
  esperar: () => Promise.resolve(),
}))

// Relay falso: guarda tudo que e publicado, na ordem.
const rede = vi.hoisted(() => ({
  publicados: [] as { evento: EventoNostr; urls?: readonly string[] }[],
  ouvinte: null as ((evento: unknown, relay: string) => void) | null,
}))

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    assinar: vi.fn(() => () => {}),
    conectados: vi.fn(() => 0),
    definirAutenticador: vi.fn(),
    definirRelays: vi.fn(),
    snapshot: vi.fn(() => []),
    publicar: vi.fn(async (evento: EventoNostr, _t?: number, urls?: readonly string[]) => {
      rede.publicados.push({ evento, urls })
      return { aceitos: 1, total: urls?.length ?? 3, porRelay: {} }
    }),
    consultar: vi.fn(async () => []),
    inscrever: vi.fn((_f: object, ouvinte: (e: unknown, r: string) => void) => {
      rede.ouvinte = ouvinte
      return () => {}
    }),
  },
}))

const ana = criarAssinanteLocal(gerarChave()) // admin
const bia = criarAssinanteLocal(gerarChave())
const caio = criarAssinanteLocal(gerarChave())
const duda = criarAssinanteLocal(gerarChave())
const NOMES = new Map([
  [ana.pubkey, 'Ana'],
  [bia.pubkey, 'Bia'],
  [caio.pubkey, 'Caio'],
  [duda.pubkey, 'Duda'],
])
const nome = (a: Assinante) => NOMES.get(a.pubkey) ?? '?'

// Cada pessoa e um "aparelho": o armazenamento e as telas sao guardados e devolvidos ao trocar.
const aparelhos = new Map<string, [IDBValidKey, unknown][]>()
const entregues = new Map<string, Set<string>>()
let atual: Assinante | null = null
let parar: (() => void) | null = null

async function como(pessoa: Assinante) {
  if (atual?.pubkey === pessoa.pubkey) return
  if (atual) aparelhos.set(atual.pubkey, await entries())
  parar?.()
  await clear()
  for (const [k, v] of aparelhos.get(pessoa.pubkey) ?? []) await set(k, v)
  useGrupos.setState({ grupos: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  await useGrupos.getState().carregar()
  atual = pessoa
  rede.ouvinte = null
  parar = iniciarRecebimento(pessoa)
  await vi.waitFor(() => expect(rede.ouvinte).not.toBeNull())
}

// Entrega a `pessoa` o que foi publicado para ela e ainda nao chegou. `todos` repete tudo (relay reentregando).
async function receber(pessoa: Assinante, todos = false) {
  await como(pessoa)
  const ja = entregues.get(pessoa.pubkey) ?? new Set<string>()
  entregues.set(pessoa.pubkey, ja)
  const meus = rede.publicados
    .map((p) => p.evento)
    .filter((e) => e.tags[0]?.[1] === pessoa.pubkey && (todos || !ja.has(e.id)))
  for (const e of meus) {
    ja.add(e.id)
    rede.ouvinte?.(JSON.parse(JSON.stringify(e)), 'wss://x')
  }
  // Espera de verdade o recebimento terminar (nao um tempo fixo): em maquina lenta 60 ms nao basta.
  await aguardarRecebimento()
}

// Troca de mensagens ate nada novo sair (admin responde aceites, etc.).
async function assentar(...pessoas: Assinante[]) {
  for (let i = 0; i < 4; i++) for (const p of pessoas) await receber(p)
}

const grupoDe = async (pessoa: Assinante, id: string) => {
  await como(pessoa)
  return obterGrupo(id)
}
const textos = async (id: string) => {
  await useMensagens.getState().carregar(chaveDaConversa(id))
  return (useMensagens.getState().porConversa[chaveDaConversa(id)] ?? [])
    .filter((m) => !m.sistema)
    .map((m) => m.texto)
}

beforeEach(async () => {
  await clear()
  aparelhos.clear()
  entregues.clear()
  rede.publicados = []
  parar?.()
  parar = null
  atual = null
})

async function grupoComAnaBiaCaio() {
  await como(ana)
  const r = await criarNovoGrupo(ana, 'Filosofia', [bia.pubkey, caio.pubkey], nome(ana))
  if (!r.ok) throw new Error('nao criou')
  return r.grupo.id
}

describe('fluxo do grupo (RN-WEB-GRUPOS-002 a 009)', () => {
  it('RN-WEB-GRUPOS-004: o convite chega como "convidado" e so entra quem aceita', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    expect((await grupoDe(bia, id))?.estado).toBe('convidado')
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    expect((await grupoDe(ana, id))?.membros).toEqual([ana.pubkey, bia.pubkey])
    expect((await grupoDe(ana, id))?.pendentes).toEqual([caio.pubkey])
    expect((await grupoDe(bia, id))?.estado).toBe('ativo')
    // Caio ainda nao respondeu: continua convidado e fora da lista.
    await receber(caio)
    expect((await grupoDe(caio, id))?.estado).toBe('convidado')
  })

  it('RN-WEB-GRUPOS-004: quem so foi convidado nao recebe nenhuma mensagem do grupo', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'so os membros leem')
    await assentar(ana, bia, caio)
    expect(await textos(id)).toEqual([]) // caio (aparelho atual) nada viu
    expect((await grupoDe(caio, id))?.trecho).toBeUndefined()
    await receber(bia)
    expect(await textos(id)).toEqual(['so os membros leem'])
    // o relay so recebeu copias para os membros (bia e a copia da propria ana)
    const destinos = rede.publicados
      .filter((p) => p.evento.kind === 1059)
      .map((p) => p.evento.tags[0]?.[1])
    expect(destinos).not.toContain(duda.pubkey)
  })

  it('RN-WEB-GRUPOS-010: quem entra depois nao ve o passado, so o que vier depois', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'antes do caio')
    await receber(caio)
    await aceitarConvite(caio, id, nome(caio))
    await assentar(ana, bia, caio)
    // Mesmo se o relay entregar TUDO de novo ao caio, a mensagem antiga nao e para ele.
    await receber(caio, true)
    expect(await textos(id)).toEqual([])
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'depois do caio')
    await assentar(ana, bia, caio)
    await receber(caio)
    expect(await textos(id)).toEqual(['depois do caio'])
  })

  it('RN-WEB-GRUPOS-012: quando alguem aceita, o grupo mostra "entrou"; so quem ja estava ve', async () => {
    const id = await grupoComAnaBiaCaio()
    const entrou = async (pessoa: Assinante) => {
      await como(pessoa)
      await useMensagens.getState().carregar(chaveDaConversa(id))
      return (useMensagens.getState().porConversa[chaveDaConversa(id)] ?? [])
        .filter((m) => m.sistema === 'entrou')
        .map((m) => m.texto)
        .sort() // na mesma hora a ordem entre avisos vale pelo id, que e aleatorio
    }
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    expect(await entrou(ana)).toEqual([bia.pubkey])
    // Bia acabou de entrar: nao ve aviso de quem ja estava
    expect(await entrou(bia)).toEqual([])
    await receber(caio)
    await aceitarConvite(caio, id, nome(caio))
    await assentar(ana, bia, caio)
    expect(await entrou(ana)).toEqual([bia.pubkey, caio.pubkey].sort())
    expect(await entrou(bia)).toEqual([caio.pubkey]) // quem ja estava ve a chegada do Caio
    expect(await entrou(caio)).toEqual([])
    // o relay reentrega tudo: o aviso nao se repete
    await receber(ana, true)
    expect(await entrou(ana)).toEqual([bia.pubkey, caio.pubkey].sort())
  })

  it('RN-WEB-GRUPOS-008: quem nao e membro nao consegue escrever no grupo', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    // Duda forja uma mensagem de grupo e manda a Bia: Bia ignora (Duda nao esta na lista).
    await como(duda)
    const falso = {
      ...(await obterGrupo(id)),
      id,
      nome: 'x',
      admin: ana.pubkey,
      membros: [ana.pubkey, bia.pubkey, duda.pubkey],
      pendentes: [],
      versao: 99,
      estado: 'ativo' as const,
      criadoEm: 1,
    }
    await enviarMensagemDeGrupo(duda, falso, 'sou intrusa')
    await receber(bia)
    expect(await textos(id)).toEqual([])
    // e a lista falsa que ela tentou mandar com a propria assinatura nao vale (nao e o admin)
    expect((await grupoDe(bia, id))?.membros).toEqual([ana.pubkey, bia.pubkey])
  })

  it('RN-WEB-GRUPOS-006: quem sai deixa de receber e fica sabendo que saiu', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    expect((await grupoDe(ana, id))?.membros).toHaveLength(3)
    await como(bia)
    expect(await sairDoGrupo(bia, id, nome(bia))).toBe(true)
    await assentar(ana, bia, caio)
    expect((await grupoDe(ana, id))?.membros).toEqual([ana.pubkey, caio.pubkey])
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'sem a bia')
    await assentar(ana, bia, caio)
    await receber(bia)
    expect(await textos(id)).toEqual([]) // a Bia nao recebeu
    await receber(caio)
    expect(await textos(id)).toEqual(['sem a bia'])
  })

  it('RN-WEB-GRUPOS-006: o admin nao sai sem passar o cargo; depois de passar, sai', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    expect(await sairDoGrupo(ana, id, nome(ana))).toBe(false)
    const r = await passarOCargo(ana, id, bia.pubkey)
    expect(r.ok).toBe(true)
    await assentar(ana, bia)
    expect((await grupoDe(bia, id))?.admin).toBe(bia.pubkey)
    await como(ana)
    expect(await sairDoGrupo(ana, id, nome(ana))).toBe(true)
    await assentar(ana, bia)
    expect((await grupoDe(bia, id))?.membros).toEqual([bia.pubkey])
    // a antiga admin nao manda mais na lista
    await como(ana)
    expect((await convidarPessoa(ana, id, duda.pubkey, nome(ana))).ok).toBe(false)
  })

  it('RN-WEB-GRUPOS-003: so o admin remove; o removido e avisado e deixa de receber', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    await como(bia)
    expect((await removerPessoa(bia, id, caio.pubkey)).ok).toBe(false)
    await como(ana)
    expect((await removerPessoa(ana, id, caio.pubkey)).ok).toBe(true)
    await assentar(ana, bia, caio)
    expect((await grupoDe(caio, id))?.estado).toBe('removido')
    expect((await grupoDe(bia, id))?.membros).toEqual([ana.pubkey, bia.pubkey])
  })

  it('RN-WEB-GRUPOS-005: recusar tira so o convite; reentrega do convite antigo nao volta', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(caio)
    await recusarConvite(caio, id, nome(caio))
    await assentar(ana, caio)
    expect((await grupoDe(ana, id))?.pendentes).toEqual([bia.pubkey])
    await receber(caio, true) // o relay reentrega o convite antigo
    expect((await grupoDe(caio, id))?.estado).toBe('saiu')
  })

  it('RN-WEB-GRUPOS-009: limpar para todos apaga o historico de todos; limpar o meu so o meu', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'velha')
    await assentar(ana, bia, caio)
    for (const p of [bia, caio]) {
      await receber(p)
      expect(await textos(id)).toEqual(['velha'])
    }
    // Bia limpa so o dela
    await como(bia)
    await limparMeuHistorico(id)
    await useMensagens.getState().carregar(chaveDaConversa(id))
    expect(await textos(id)).toEqual([])
    await como(caio)
    await useMensagens.getState().carregar(chaveDaConversa(id))
    expect(await textos(id)).toEqual(['velha']) // o do Caio continua
    // So o admin limpa o de todos; membro comum nao consegue
    expect(await limparParaTodos(bia, id, nome(bia))).toBe(false)
    await como(ana)
    expect(await limparParaTodos(ana, id, nome(ana), Math.floor(Date.now() / 1000) + 0)).toBe(true)
    await assentar(ana, bia, caio)
    await como(caio)
    await useMensagens.getState().carregar(chaveDaConversa(id))
    expect(await textos(id)).toEqual([])
    // o que foi limpo nao volta quando o relay reentrega
    await receber(caio, true)
    expect(await textos(id)).toEqual([])
  })

  it('RN-WEB-GRUPOS-006: encerrar o grupo avisa todos e ninguem mais escreve', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    expect(await encerrarGrupo(ana, id)).toBe(true)
    await assentar(ana, bia, caio)
    expect((await grupoDe(bia, id))?.estado).toBe('encerrado')
    expect((await grupoDe(caio, id))?.estado).toBe('encerrado')
  })

  it('RN-WEB-GRUPOS-003: o admin adiciona mais gente depois e a lista nao passa de 30', async () => {
    const id = await grupoComAnaBiaCaio()
    await como(ana)
    const r = await convidarPessoa(ana, id, duda.pubkey, nome(ana))
    expect(r.ok && r.grupo.pendentes).toContain(duda.pubkey)
    expect((await convidarPessoa(ana, id, duda.pubkey, nome(ana))).ok).toBe(false)
    await receber(duda)
    expect((await grupoDe(duda, id))?.estado).toBe('convidado')
  })

  it('RN-WEB-GRUPOS-013: encerrar e apagar conversas acaba o grupo e limpa o historico de todos', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'vai sumir')
    await assentar(ana, bia, caio)
    await receber(bia)
    expect(await textos(id)).toEqual(['vai sumir'])
    await como(ana)
    expect(await encerrarGrupoEApagar(ana, id, nome(ana))).toBe(true)
    await assentar(ana, bia, caio)
    for (const p of [ana, bia, caio]) {
      expect((await grupoDe(p, id))?.estado).toBe('encerrado')
      expect(await textos(id)).toEqual([])
    }
  })

  it('RN-WEB-GRUPOS-013: tirar e apagar conversas limpa so o aparelho de quem foi tirado', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'historico do grupo')
    await assentar(ana, bia, caio)
    await como(bia)
    expect((await removerPessoaEApagar(bia, id, caio.pubkey, nome(bia))).ok).toBe(false)
    await como(ana)
    expect((await removerPessoaEApagar(ana, id, caio.pubkey, nome(ana))).ok).toBe(true)
    await assentar(ana, bia, caio)
    expect((await grupoDe(caio, id))?.estado).toBe('removido')
    expect(await textos(id)).toEqual([]) // o do Caio foi apagado
    await como(bia)
    expect(await textos(id)).toEqual(['historico do grupo']) // o da Bia continua
  })

  it('RN-WEB-GRUPOS-014: excluir grupo tira da lista, apaga o historico e o convite antigo nao volta', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'ola')
    await assentar(ana, bia)
    await como(bia)
    expect(await excluirGrupo(bia, id, nome(bia))).toBe(true) // ainda membro: sai e exclui
    const g = await obterGrupo(id)
    expect(g).toMatchObject({ excluido: true, estado: 'saiu' })
    expect(await textos(id)).toEqual([])
    await assentar(ana, bia)
    expect((await grupoDe(ana, id))?.membros).toEqual([ana.pubkey])
    // o relay reentrega tudo (convite antigo inclusive): o grupo continua excluido
    await receber(bia, true)
    expect((await grupoDe(bia, id))?.excluido).toBe(true)
    expect((await grupoDe(bia, id))?.estado).toBe('saiu')
  })

  it('RN-WEB-GRUPOS-014: o admin que exclui encerra o grupo para todos', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    await como(ana)
    expect(await excluirGrupo(ana, id, nome(ana))).toBe(true)
    expect(await obterGrupo(id)).toMatchObject({ excluido: true, estado: 'encerrado' })
    await assentar(ana, bia)
    expect((await grupoDe(bia, id))?.estado).toBe('encerrado')
  })

  it('RN-WEB-GRUPOS-015: se a lista nova nao chega ao convidado, reenviar o pedido o faz entrar', async () => {
    const id = await grupoComAnaBiaCaio()
    await receber(bia)
    await aceitarConvite(bia, id, nome(bia))
    expect((await grupoDe(bia, id))?.aceitou).toBe(true)
    await receber(ana) // o admin inclui a Bia e publica a lista...
    expect((await grupoDe(ana, id))?.membros).toContain(bia.pubkey)
    // ...mas a lista nao chega a Bia (relay fora, aparelho dormindo)
    const perdidos = rede.publicados
      .map((p) => p.evento)
      .filter((e) => e.tags[0]?.[1] === bia.pubkey)
    const jaBia = entregues.get(bia.pubkey) ?? new Set<string>()
    entregues.set(bia.pubkey, jaBia)
    for (const e of perdidos) jaBia.add(e.id)
    await receber(bia)
    expect((await grupoDe(bia, id))?.estado).toBe('convidado') // continua de fora
    // ela reenvia o pedido: o admin responde com a lista atual
    await aceitarConvite(bia, id, nome(bia))
    await assentar(ana, bia)
    expect((await grupoDe(bia, id))?.estado).toBe('ativo')
    // e a lista do admin nao mudou por causa do reenvio
    expect((await grupoDe(ana, id))?.versao).toBe(2)
  })

  it('RN-WEB-GRUPOS-016: quem e marcado recebe a marcacao e fica "marcado"; so membros podem ser marcados', async () => {
    const id = await grupoComAnaBiaCaio()
    for (const p of [bia, caio]) {
      await receber(p)
      await aceitarConvite(p, id, nome(p))
    }
    await assentar(ana, bia, caio)
    await como(ana)
    await enviarMensagemDeGrupo(ana, (await obterGrupo(id))!, 'oi @Bia e @Duda', [
      { pubkey: bia.pubkey, texto: '@Bia' },
      { pubkey: duda.pubkey, texto: '@Duda' }, // nao e do grupo: some
    ])
    await assentar(ana, bia, caio)
    const mencoesDe = async (p: Assinante) => {
      await como(p)
      await useMensagens.getState().carregar(chaveDaConversa(id))
      return (useMensagens.getState().porConversa[chaveDaConversa(id)] ?? [])
        .filter((m) => !m.sistema)
        .flatMap((m) => m.mencoes ?? [])
    }
    expect(await mencoesDe(bia)).toEqual([{ pubkey: bia.pubkey, texto: '@Bia' }])
    expect((await grupoDe(bia, id))?.marcado).toBe(true)
    expect((await grupoDe(caio, id))?.marcado).toBeFalsy() // recebeu, mas nao foi marcado
    expect(await mencoesDe(caio)).toEqual([{ pubkey: bia.pubkey, texto: '@Bia' }]) // todos veem quem foi marcado
    // abrir o grupo limpa a marca
    await como(bia)
    await useGrupos.getState().marcarVisto(id)
    expect((await obterGrupo(id))?.marcado).toBe(false)
  })
})
