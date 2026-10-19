import { describe, expect, it } from 'vitest'
import { lerListaPortatil, montarListaPortatil, type ConversaPortatil } from './listaPortatil'
import { gerarChave } from './signer/chaves'
import { criarAssinanteLocal } from './signer/local'

const eu = criarAssinanteLocal(gerarChave())
const outro = criarAssinanteLocal(gerarChave())
const conversa: ConversaPortatil = {
  pubkey: 'a'.repeat(64),
  relaysDica: ['wss://relay.exemplo.com'],
  criadaEm: 1000,
  apagadoAte: 1500,
  apagadoPor: 'eu',
}

describe('lista portatil (kind 30078)', () => {
  it('RN-WEB-SYNC-001: ida e volta devolve a mesma lista', async () => {
    const evento = await montarListaPortatil(eu, [conversa], 2000)
    expect(evento.kind).toBe(30078)
    expect(evento.tags).toEqual([['d', 'voz:conversas']])
    const lida = await lerListaPortatil(eu, evento)
    expect(lida?.criadoEm).toBe(2000)
    expect(lida?.conversas[0]).toMatchObject(conversa)
  })

  it('RN-WEB-SYNC-001: o conteudo vai cifrado, sem a pubkey do contato em claro', async () => {
    const evento = await montarListaPortatil(eu, [conversa], 2000)
    expect(evento.content).not.toContain(conversa.pubkey)
    expect(evento.content).not.toContain('relay.exemplo.com')
  })

  it('RN-WEB-SYNC-001: evento de outra pessoa e ignorado', async () => {
    const deOutro = await montarListaPortatil(outro, [conversa], 2000)
    expect(await lerListaPortatil(eu, deOutro)).toBeNull()
  })

  it('RN-WEB-SYNC-001: outro identificador "d" e ignorado', async () => {
    const evento = await montarListaPortatil(eu, [conversa], 2000)
    const errado = await eu.assinar({
      kind: 30078,
      created_at: 2000,
      tags: [['d', 'outro-app']],
      content: evento.content,
    })
    expect(await lerListaPortatil(eu, errado)).toBeNull()
  })

  it('RN-WEB-SYNC-001: assinatura adulterada e ignorada', async () => {
    const evento = await montarListaPortatil(eu, [conversa], 2000)
    // Como chega da rede: JSON puro, sem o selo de "ja verificado" que o nostr-tools poe em objetos locais.
    const chegou = JSON.parse(JSON.stringify(evento))
    expect(await lerListaPortatil(eu, { ...chegou, created_at: 9999 })).toBeNull()
  })

  it('RN-WEB-SYNC-001: conteudo ilegivel e ignorado', async () => {
    const lixo = await eu.assinar({
      kind: 30078,
      created_at: 2000,
      tags: [['d', 'voz:conversas']],
      content: 'isto nao e NIP-44',
    })
    expect(await lerListaPortatil(eu, lixo)).toBeNull()
  })

  it('itens invalidos sao descartados e os validos ficam', async () => {
    const evento = await montarListaPortatil(
      eu,
      [conversa, { ...conversa, pubkey: 'nao-e-hex' }],
      2000,
    )
    const lida = await lerListaPortatil(eu, evento)
    expect(lida?.conversas).toHaveLength(1)
  })
})
