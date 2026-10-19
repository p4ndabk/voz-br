import { beforeEach, describe, expect, it } from 'vitest'
import { alturaDoCampo, guardarAltura, lerAlturaGuardada, limitarAltura } from './alturaCampo'

beforeEach(() => localStorage.clear())

describe('altura do campo de mensagem', () => {
  it('RN-WEB-MENSAGENS-011: sem tamanho escolhido, cresce com o texto ate o maximo', () => {
    expect(alturaDoCampo(0, 40, 120)).toBe(40)
    expect(alturaDoCampo(0, 400, 120)).toBe(120)
  })

  it('RN-WEB-MENSAGENS-011: o tamanho arrastado vale como minimo e o texto nao o encolhe', () => {
    expect(alturaDoCampo(200, 40, 120)).toBe(200)
    expect(alturaDoCampo(200, 400, 120)).toBe(200)
  })

  it('RN-WEB-MENSAGENS-011: a alca respeita o minimo e a metade da tela', () => {
    expect(limitarAltura(10, 800)).toBe(44)
    expect(limitarAltura(150, 800)).toBe(150)
    expect(limitarAltura(900, 800)).toBe(400)
  })

  it('RN-WEB-MENSAGENS-011: o tamanho escolhido fica guardado', () => {
    expect(lerAlturaGuardada()).toBe(0)
    guardarAltura(180.4)
    expect(lerAlturaGuardada()).toBe(180)
  })
})
