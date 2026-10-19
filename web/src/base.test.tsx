import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { POLITICA_DE_SEGURANCA, injetarPoliticaDeSeguranca } from '../vite.csp'
import { Inicio } from './pages/Inicio'
import { caminhoBase } from './base'

vi.mock('@/nostr/useRelays', () => ({ useRelays: () => ({ lista: [], conectados: 0, total: 0 }) }))

// RN-WEB-PUBLICACAO-001
describe('caminhoBase', () => {
  it('tira a barra final; a raiz vira vazio', () => {
    expect(caminhoBase('/voz-br/')).toBe('/voz-br')
    expect(caminhoBase('/voz-br')).toBe('/voz-br')
    expect(caminhoBase('/')).toBe('')
  })

  it('os links ficam sob o caminho-base', () => {
    render(
      <MemoryRouter basename="/voz-br">
        <Inicio />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/voz-br/entrar')
  })
})

// RN-WEB-PUBLICACAO-003
describe('politica de seguranca', () => {
  const html = '<head>\n    <meta charset="UTF-8" />\n    <title>Voz</title>\n  </head>'

  it('entra no HTML do build, logo depois do charset', () => {
    const saida = injetarPoliticaDeSeguranca(html)
    expect(saida).toContain(
      `http-equiv="Content-Security-Policy" content="${POLITICA_DE_SEGURANCA}"`,
    )
    expect(saida).toContain('<meta name="referrer" content="no-referrer" />')
    expect(saida.indexOf('charset')).toBeLessThan(saida.indexOf('Content-Security-Policy'))
  })

  it('so aceita scripts do proprio site e nada de objeto ou formulario', () => {
    expect(POLITICA_DE_SEGURANCA).toContain("script-src 'self'")
    expect(POLITICA_DE_SEGURANCA).toContain("object-src 'none'")
    expect(POLITICA_DE_SEGURANCA).toContain("form-action 'none'")
    expect(POLITICA_DE_SEGURANCA).not.toMatch(/script-src[^;]*(unsafe|https:|\*)/)
  })
})
