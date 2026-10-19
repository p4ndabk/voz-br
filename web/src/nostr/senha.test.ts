import { describe, expect, it } from 'vitest'
import { forcaDaSenha, validarSenha } from './senha'

describe('politica de senha', () => {
  it('RN-WEB-AUTH-010: menos de 8 caracteres e curta', () => {
    expect(validarSenha('1234567', '1234567')).toBe('curta')
    expect(validarSenha('', '')).toBe('curta')
  })
  it('RN-WEB-AUTH-010: confirmacao diferente e recusada', () => {
    expect(validarSenha('minhasenha1', 'minhasenha2')).toBe('diferente')
  })
  it('RN-WEB-AUTH-010: 8 caracteres iguais nas duas vezes e valida', () => {
    expect(validarSenha('12345678', '12345678')).toBeNull()
  })
  it('a forca so orienta: curta e fraca, mistura longa e forte', () => {
    expect(forcaDaSenha('abc')).toBe('fraca')
    expect(forcaDaSenha('abcdefgh')).toBe('fraca')
    expect(forcaDaSenha('abcdefg1')).toBe('media')
    expect(forcaDaSenha('Abcdefghij12')).toBe('forte')
  })
})
