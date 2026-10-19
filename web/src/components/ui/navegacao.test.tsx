import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CabecalhoPagina } from './CabecalhoPagina'
import { IconeFogo } from './IconeFogo'
import { IconeMenos } from './IconeMenos'
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

  it('RN-WEB-LAYOUT-005: o botao e so tres pontinhos na vertical, com nome acessivel "Mais"', () => {
    render(<MenuMais itens={[{ rotulo: 'Apagar', aoEscolher: vi.fn() }]} />)
    const botao = screen.getByRole('button', { name: 'Mais' })
    expect(botao).toHaveTextContent('')
    expect(botao.querySelectorAll('svg circle')).toHaveLength(3)
    expect(botao).toHaveAttribute('title', 'Mais')
  })

  it('RN-WEB-LAYOUT-005: o item pode ter um icone de uma cor so, fora do nome lido', async () => {
    render(
      <MenuMais
        itens={[{ rotulo: 'Apagar conversa', icone: <IconeFogo />, aoEscolher: vi.fn() }]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const item = screen.getByRole('menuitem', { name: 'Apagar conversa' })
    const icone = item.querySelector('svg')
    expect(icone).toHaveAttribute('aria-hidden', 'true')
    expect(icone).toHaveAttribute('fill', 'currentColor')
    expect(item.textContent).toBe('Apagar conversa')
  })

  it('RN-WEB-LAYOUT-005: o menos de "Remover da lista" tambem e de uma cor so e fora do nome', async () => {
    render(
      <MenuMais
        itens={[{ rotulo: 'Remover da lista', icone: <IconeMenos />, aoEscolher: vi.fn() }]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }))
    const item = screen.getByRole('menuitem', { name: 'Remover da lista' })
    expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(item.querySelector('svg')).toHaveAttribute('stroke', 'currentColor')
    expect(item.textContent).toBe('Remover da lista')
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
