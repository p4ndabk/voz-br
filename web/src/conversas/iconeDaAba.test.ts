import { beforeEach, describe, expect, it } from 'vitest'
import { iconeComAviso, marcarIconeDaAba } from './iconeDaAba'

describe('icone da aba', () => {
  beforeEach(() => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />'
  })
  const href = () => document.querySelector('link[rel="icon"]')?.getAttribute('href')

  it('RN-WEB-CONVERSAS-012: com nao lidas troca o icone e sem elas volta ao original', () => {
    marcarIconeDaAba(true)
    expect(href()).toBe(iconeComAviso())
    marcarIconeDaAba(false)
    expect(href()).toBe('/favicon.svg')
  })
})
