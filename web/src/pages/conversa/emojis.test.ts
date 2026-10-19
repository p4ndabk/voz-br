import { describe, expect, it } from 'vitest'
import { inserirNoCursor } from './emojis'

describe('inserirNoCursor', () => {
  it('RN-WEB-MENSAGENS-012: poe o emoji no cursor', () => {
    expect(inserirNoCursor('oi maria', '😀', 2, 2)).toEqual({ texto: 'oi😀 maria', cursor: 4 })
  })
  it('RN-WEB-MENSAGENS-012: troca o trecho selecionado', () => {
    expect(inserirNoCursor('oi maria', '👍', 3, 8)).toEqual({ texto: 'oi 👍', cursor: 5 })
  })
})
