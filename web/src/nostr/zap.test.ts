import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { reciboConfirma } from './zap'

const servico = generateSecretKey()
const nostrPubkey = getPublicKey(servico)
const pedidoId = 'a'.repeat(64)
const fatura = 'lnbc10u1pabcdef'

function recibo(sobrescrever: { chave?: Uint8Array; tags?: string[][]; kind?: number } = {}) {
  return finalizeEvent(
    {
      kind: sobrescrever.kind ?? 9735,
      created_at: 1,
      content: '',
      tags: sobrescrever.tags ?? [
        ['bolt11', fatura],
        ['description', JSON.stringify({ id: pedidoId })],
      ],
    },
    sobrescrever.chave ?? servico,
  )
}
const dados = { nostrPubkey, pedidoId, fatura }

// RN-WEB-ZAP-007
describe('reciboConfirma', () => {
  it('aceita o recibo do servico, do meu pedido e da minha fatura', () => {
    expect(reciboConfirma(recibo(), dados)).toBe(true)
  })

  it('recusa recibo de outra chave', () => {
    expect(reciboConfirma(recibo({ chave: generateSecretKey() }), dados)).toBe(false)
  })

  it('recusa recibo de outro pedido ou de outra fatura', () => {
    const outroPedido = recibo({
      tags: [
        ['bolt11', fatura],
        ['description', JSON.stringify({ id: 'b'.repeat(64) })],
      ],
    })
    const outraFatura = recibo({
      tags: [
        ['bolt11', 'lnbc20u1pxyz'],
        ['description', JSON.stringify({ id: pedidoId })],
      ],
    })
    expect(reciboConfirma(outroPedido, dados)).toBe(false)
    expect(reciboConfirma(outraFatura, dados)).toBe(false)
  })

  it('recusa kind errado, evento adulterado e lixo', () => {
    expect(reciboConfirma(recibo({ kind: 1 }), dados)).toBe(false)
    const adulterado = JSON.parse(JSON.stringify(recibo())) as { tags: string[][] }
    adulterado.tags[0] = ['bolt11', 'lnbc1u1pfalsa']
    expect(reciboConfirma(adulterado, dados)).toBe(false)
    expect(reciboConfirma(null, dados)).toBe(false)
    expect(reciboConfirma('texto', dados)).toBe(false)
  })
})
