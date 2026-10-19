import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { salvarMensagem, type Mensagem } from './armazemMensagens'
import { useMensagens } from './useMensagens'

const conversa = 'grupo:' + 'ab'.repeat(32)
const msg = (id: string, criadoEm: number): Mensagem => ({
  id,
  conversa,
  autor: 'x',
  texto: id,
  criadoEm,
  estado: 'recebida',
})

beforeEach(async () => {
  await clear()
  useMensagens.setState({ porConversa: {} })
})

describe('carregar mensagens', () => {
  it('RN-WEB-MENSAGENS-013: mensagem que chegou na memoria durante a carga nao some', async () => {
    await salvarMensagem(msg('antiga', 1))
    // chegou agora: esta na memoria, mas a leitura do armazenamento (feita antes) nao a viu
    useMensagens.setState({ porConversa: { [conversa]: [msg('nova', 2)] } })
    await useMensagens.getState().carregar(conversa)
    expect(useMensagens.getState().porConversa[conversa]?.map((m) => m.id)).toEqual([
      'antiga',
      'nova',
    ])
  })

  it('RN-WEB-MENSAGENS-013: sem duplicar e na ordem do rumor', async () => {
    await salvarMensagem(msg('b', 2))
    await salvarMensagem(msg('a', 1))
    useMensagens.setState({ porConversa: { [conversa]: [msg('b', 2)] } })
    await useMensagens.getState().carregar(conversa)
    expect(useMensagens.getState().porConversa[conversa]?.map((m) => m.id)).toEqual(['a', 'b'])
  })
})
