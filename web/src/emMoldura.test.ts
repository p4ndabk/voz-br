import { describe, expect, it } from 'vitest'
import { estaEmMoldura } from './emMoldura'

describe('RN-WEB-PRIVACIDADE-006: moldura', () => {
  it('janela de topo nao esta em moldura', () => {
    const w = {} as Window
    Object.assign(w, { top: w, self: w })
    expect(estaEmMoldura(w)).toBe(false)
  })
  it('dentro de outra janela esta em moldura', () => {
    expect(estaEmMoldura({ top: {}, self: {} } as unknown as Window)).toBe(true)
  })
  it('se ler o topo falha (outro dominio), conta como moldura', () => {
    const w = {
      get top(): Window {
        throw new Error('bloqueado')
      },
    }
    expect(estaEmMoldura(w as unknown as Window)).toBe(true)
  })
})
