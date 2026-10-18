import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Aviso } from './Aviso'
import { Campo } from './Campo'
import { Modal } from './Modal'
import { Selo } from './Selo'

describe('Campo', () => {
  it('liga rotulo, ajuda e erro ao input para leitores de tela', () => {
    render(<Campo rotulo="Chave do amigo" ajuda="Cole a chave" erro="Chave inválida" />)
    const input = screen.getByLabelText('Chave do amigo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Cole a chave Chave inválida')
  })
})

describe('Selo', () => {
  it('RN-WEB-UI-004: mostra Privado e Publico', () => {
    const { rerender } = render(<Selo tipo="privado" />)
    expect(screen.getByText('Privado')).toBeInTheDocument()
    rerender(<Selo tipo="publico" />)
    expect(screen.getByText('Público')).toBeInTheDocument()
  })
})

describe('Aviso', () => {
  it('erro usa role alert; info usa status', () => {
    const { rerender } = render(<Aviso>oi</Aviso>)
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(<Aviso tom="erro">ops</Aviso>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('Modal', () => {
  it('nao renderiza fechado e fecha com Escape', async () => {
    const aoFechar = vi.fn()
    const { rerender } = render(
      <Modal aberto={false} titulo="Apagar" aoFechar={aoFechar}>
        texto
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(
      <Modal aberto titulo="Apagar" aoFechar={aoFechar}>
        texto
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Apagar' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(aoFechar).toHaveBeenCalledOnce()
  })
})
