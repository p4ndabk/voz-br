import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RelayStatus } from '@/nostr/relays'
import { Inicio } from './Inicio'

const estado = vi.hoisted(() => ({ lista: [] as RelayStatus[] }))

vi.mock('@/nostr/useRelays', () => ({
  useRelays: () => ({
    lista: estado.lista,
    conectados: estado.lista.filter((r) => r.estado === 'conectado').length,
    total: estado.lista.length,
  }),
}))

function relays(...estados: RelayStatus['estado'][]): RelayStatus[] {
  return estados.map((e, i) => ({ url: `wss://r${i}`, estado: e }))
}

function abrir() {
  render(
    <MemoryRouter>
      <Inicio />
    </MemoryRouter>,
  )
}

describe('Inicio', () => {
  beforeEach(() => {
    estado.lista = []
  })

  it('mostra a marca e o botao Entrar em portugues', () => {
    estado.lista = relays('conectado', 'conectado', 'conectado')
    abrir()
    expect(screen.getByRole('heading', { level: 1, name: 'Voz' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('todos conectados: 3 de 3 relays conectados', () => {
    estado.lista = relays('conectado', 'conectado', 'conectado')
    abrir()
    expect(screen.getByRole('status')).toHaveTextContent('3 de 3 relays conectados')
  })

  it('um relay fora do ar: 2 de 3 relays conectados', () => {
    estado.lista = relays('conectado', 'conectado', 'desconectado')
    abrir()
    expect(screen.getByRole('status')).toHaveTextContent('2 de 3 relays conectados')
  })

  it('nenhum relay disponivel: avisa que esta tentando de novo', () => {
    estado.lista = relays('desconectado', 'desconectado', 'desconectado')
    abrir()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sem conexão com a rede Nostr. Tentando de novo…',
    )
  })

  it('logo ao abrir (todos conectando) nao acusa falta de conexao', () => {
    estado.lista = relays('conectando', 'conectando', 'conectando')
    abrir()
    expect(screen.getByRole('status')).not.toHaveTextContent('Sem conexão')
  })
})
