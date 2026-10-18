import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/nostr/perfis'
import { gerarChave, npubDe, pubkeyDe } from '@/nostr/signer/chaves'
import { Identidade } from './Identidade'

const estado = vi.hoisted(() => ({ perfil: undefined as Perfil | null | undefined }))
vi.mock('@/nostr/usePerfil', () => ({ usePerfil: () => estado.perfil }))

const pubkey = pubkeyDe(gerarChave())
const npub = npubDe(pubkey)

beforeEach(() => {
  estado.perfil = undefined
})

describe('Identidade', () => {
  it('RN-WEB-PERFIL-001: mostra o display_name e, abaixo, a npub abreviada', () => {
    estado.perfil = { nomeExibicao: 'Maria Silva', nome: 'maria' }
    render(<Identidade pubkey={pubkey} />)
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText(/^npub1.{8}….{4}$/)).toBeInTheDocument()
    expect(screen.queryByText('sem nome')).not.toBeInTheDocument()
  })

  it('sem perfil: mostra a chave abreviada e "sem nome"', () => {
    estado.perfil = null
    render(<Identidade pubkey={pubkey} />)
    expect(screen.getByText(/^npub1.{8}….{4}$/)).toBeInTheDocument()
    expect(screen.getByText('sem nome')).toBeInTheDocument()
  })

  it('enquanto carrega nao diz "sem nome"', () => {
    estado.perfil = undefined
    render(<Identidade pubkey={pubkey} />)
    expect(screen.queryByText('sem nome')).not.toBeInTheDocument()
  })

  it('RN-WEB-PERFIL-005 e 006: um toque abre o cartao com a npub completa, copiar e QR', async () => {
    estado.perfil = { nome: 'maria' }
    render(<Identidade pubkey={pubkey} />)
    expect(screen.queryByText(npub)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver a chave de maria' }))
    const cartao = screen.getByRole('dialog', { name: 'Quem é' })
    expect(cartao).toHaveTextContent(npub)
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(cartao.querySelector('svg[aria-label="Chave pública (npub)"]')).not.toBeNull()
  })

  it('RN-WEB-PERFIL-002: nome com HTML aparece como texto e nada e executado', () => {
    estado.perfil = { nome: '<img src=x onerror=alert(1)>' }
    const { container } = render(<Identidade pubkey={pubkey} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('RN-WEB-PERFIL-008: foto vai sem referrer e, se quebrar, volta o avatar gerado', () => {
    estado.perfil = { nome: 'maria', foto: 'https://exemplo.org/maria.png' }
    const { container } = render(<Identidade pubkey={pubkey} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://exemplo.org/maria.png')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
