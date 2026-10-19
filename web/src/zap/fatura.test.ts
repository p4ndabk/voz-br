import { describe, expect, it } from 'vitest'
import { faturaConfere, milissatsDaFatura } from './fatura'

// RN-WEB-ZAP-006
describe('fatura', () => {
  it('le o valor pelos multiplicadores da rede principal', () => {
    expect(milissatsDaFatura('lnbc10u1pabcdef')).toBe(1_000_000) // 10 uBTC = 1000 sats
    expect(milissatsDaFatura('lnbc2500n1pabcdef')).toBe(250_000) // 250 sats
    expect(milissatsDaFatura('lnbc20m1pabcdef')).toBe(2_000_000_000)
    expect(milissatsDaFatura('lnbc10p1pabcdef')).toBe(1) // 10 pBTC = 1 msat
  })

  it('recusa outra rede, fatura sem valor e texto que nao e fatura', () => {
    expect(milissatsDaFatura('lntb10u1pabcdef')).toBeNull() // testnet
    expect(milissatsDaFatura('lnbcrt10u1pabcdef')).toBeNull() // regtest
    expect(milissatsDaFatura('lnbc1pabcdef')).toBeNull() // sem valor
    expect(milissatsDaFatura('qualquer coisa')).toBeNull()
  })

  it('so confere quando o valor e exatamente o pedido', () => {
    expect(faturaConfere('lnbc10u1pabcdef', 1_000_000)).toBe(true)
    expect(faturaConfere('lnbc10u1pabcdef', 100_000)).toBe(false)
    expect(faturaConfere('LNBC10U1PABCDEF', 1_000_000)).toBe(true)
  })
})
