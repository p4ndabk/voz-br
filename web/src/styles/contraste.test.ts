import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// RN-WEB-UI-003: contraste de texto sobre fundo >= 4,5:1 nos dois temas.
// Le o arquivo do disco: importar com ?raw passaria pelo transformador de CSS do Vite.
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function token(nome: string, tema: 0 | 1): string {
  const m = css.match(
    new RegExp(`--${nome}:\\s*light-dark\\(\\s*(#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\s*\\)`, 'i'),
  )
  if (!m) throw new Error(`token --${nome} nao encontrado`)
  return m[tema + 1] as string
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (escuro + 0.05)
}

const pares: [string, string][] = [
  ['tinta', 'fundo'],
  ['tinta', 'superficie'],
  ['tinta-suave', 'fundo'],
  ['tinta-suave', 'superficie'],
  ['sobre-vermelho', 'vermelho'],
  ['vermelho', 'fundo'],
  ['vermelho', 'superficie'],
]

describe.each([
  [0, 'claro'],
  [1, 'escuro'],
] as const)('tema %s (%s)', (tema, nome) => {
  it.each(pares)('%s sobre %s tem contraste AA', (texto, fundo) => {
    const razao = contraste(token(texto, tema), token(fundo, tema))
    expect(razao, `${texto}/${fundo} no tema ${nome}`).toBeGreaterThanOrEqual(4.5)
  })
})
