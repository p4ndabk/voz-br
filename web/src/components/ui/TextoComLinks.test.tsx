import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextoComLinks } from './TextoComLinks'

describe('TextoComLinks', () => {
  it('RN-WEB-MENSAGENS-010: so http(s) vira link, com noopener e noreferrer', () => {
    render(<TextoComLinks texto="veja https://exemplo.org/a?b=1 e http://outro.com agora" />)
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      'https://exemplo.org/a?b=1',
      'http://outro.com',
    ])
    for (const l of links) {
      expect(l).toHaveAttribute('target', '_blank')
      expect(l).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('a pontuacao no fim da frase nao entra no link', () => {
    render(<TextoComLinks texto="olha (https://exemplo.org), depois https://x.org/y." />)
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      'https://exemplo.org',
      'https://x.org/y',
    ])
  })

  it('RN-WEB-MENSAGENS-010: HTML e esquemas perigosos aparecem como texto', () => {
    const { container } = render(
      <TextoComLinks texto={'<script>alert(1)</script> javascript:alert(1) https://ok.org'} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container).toHaveTextContent(
      '<script>alert(1)</script> javascript:alert(1) https://ok.org',
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('texto sem link e devolvido inteiro', () => {
    const { container } = render(<TextoComLinks texto="oi, tudo bem?" />)
    expect(container).toHaveTextContent('oi, tudo bem?')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
