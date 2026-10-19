import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CabecalhoPagina } from './CabecalhoPagina'
import { Logo } from './Logo'
import { MenuMais } from './MenuMais'

// RN-WEB-LAYOUT-005
describe('MenuMais', () => {
  it('abre com o botao, executa o item e fecha', async () => {
    const aoEscolher = vi.fn()
    render(<MenuMais itens={[{ rotulo: 'Apagar', aoEscolher }]} />)
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    expect(screen.getByRole('button', { name: 'Mais' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Apagar' }))
    expect(aoEscolher).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('Esc fecha sem executar nada', async () => {
    const aoEscolher = vi.fn()
    render(<MenuMais itens={[{ rotulo: 'Apagar', aoEscolher }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    expect(aoEscolher).not.toHaveBeenCalled()
  })
})

describe('CabecalhoPagina', () => {
  it('tem titulo e um caminho de volta', () => {
    render(
      <MemoryRouter>
        <CabecalhoPagina titulo="Minha conta" voltarPara="/conversas" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Minha conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/conversas')
  })
})

describe('Logo', () => {
  it('sozinha, e uma imagem com nome; com a palavra, o texto basta', () => {
    const { rerender } = render(<Logo />)
    expect(screen.getByRole('img', { name: 'Voz' })).toBeInTheDocument()
    rerender(<Logo comPalavra />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Voz')).toBeInTheDocument()
  })
})
