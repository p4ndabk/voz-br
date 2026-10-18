import { describe, expect, it } from 'vitest'
import { chaveDoDia, horaDe, rotuloDoDia } from './dias'

const segundos = (ano: number, mes: number, dia: number, h = 12, min = 0) =>
  new Date(ano, mes - 1, dia, h, min).getTime() / 1000

const agora = new Date(2026, 9, 18, 15, 30).getTime() // 18 de outubro de 2026

describe('rotuloDoDia', () => {
  it('Hoje, Ontem e a data por extenso', () => {
    expect(rotuloDoDia(segundos(2026, 10, 18, 0, 5), agora)).toBe('Hoje')
    expect(rotuloDoDia(segundos(2026, 10, 18, 23, 59), agora)).toBe('Hoje')
    expect(rotuloDoDia(segundos(2026, 10, 17, 23, 59), agora)).toBe('Ontem')
    expect(rotuloDoDia(segundos(2026, 10, 12), agora)).toBe('12 de outubro')
    expect(rotuloDoDia(segundos(2025, 12, 31), agora)).toBe('31 de dezembro')
  })
})

describe('horaDe e chaveDoDia', () => {
  it('formata a hora em pt-BR e distingue dias', () => {
    expect(horaDe(segundos(2026, 10, 18, 9, 5))).toBe('09:05')
    expect(chaveDoDia(segundos(2026, 10, 18, 1))).toBe(chaveDoDia(segundos(2026, 10, 18, 23)))
    expect(chaveDoDia(segundos(2026, 10, 18))).not.toBe(chaveDoDia(segundos(2026, 10, 19)))
  })
})
