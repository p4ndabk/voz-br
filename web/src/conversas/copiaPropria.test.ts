import { describe, expect, it } from 'vitest'
import { ATRASO_MAXIMO_MS, ATRASO_MINIMO_MS, destinoDaCopia } from './copiaPropria'

describe('copia propria (RN-WEB-PRIVACIDADE-002)', () => {
  it('RN-WEB-PRIVACIDADE-002: relays so meus recebem a copia na hora', () => {
    expect(destinoDaCopia(['wss://a', 'wss://b'], ['wss://b', 'wss://c'], 0.5)).toEqual({
      urls: ['wss://a'],
      atrasoMs: 0,
    })
  })

  it('RN-WEB-PRIVACIDADE-002: mesmos relays do amigo: espera sorteada entre o minimo e o maximo', () => {
    const lista = ['wss://a', 'wss://b']
    expect(destinoDaCopia(lista, lista, 0)).toEqual({ urls: lista, atrasoMs: ATRASO_MINIMO_MS })
    expect(destinoDaCopia(lista, lista, 0.999999).atrasoMs).toBeLessThanOrEqual(ATRASO_MAXIMO_MS)
    expect(destinoDaCopia(lista, lista, 0.5).atrasoMs).toBe(
      (ATRASO_MINIMO_MS + ATRASO_MAXIMO_MS) / 2,
    )
  })
})
