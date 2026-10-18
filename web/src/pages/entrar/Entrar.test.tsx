import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Conta } from '@/pages/Conta'
import { gerarChave, nsecDe, npubDe, pubkeyDe } from '@/nostr/signer/chaves'
import { apagarTudoDoVoz, lerSessaoSalva } from '@/nostr/sessao'
import { useSessao } from '@/nostr/useSessao'
import { Entrar } from './Entrar'

const publicar = vi.hoisted(() => vi.fn(async () => ({ aceitos: 1, total: 3 })))
vi.mock('@/nostr/relays', () => ({ relays: { publicar } }))

function abrir() {
  render(
    <MemoryRouter initialEntries={['/entrar']}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/conversas" element={<p>lista de conversas</p>} />
        <Route path="/" element={<p>inicio</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function instalarExtensao(nostr: unknown) {
  ;(window as unknown as { nostr?: unknown }).nostr = nostr
}

beforeEach(async () => {
  await apagarTudoDoVoz()
  useSessao.setState({ fase: 'fora', assinante: null })
  publicar.mockClear()
})

afterEach(() => instalarExtensao(undefined))

describe('tela de entrar', () => {
  it('sem extensao: opcao desabilitada, aviso e link para instalar', () => {
    abrir()
    expect(screen.getByRole('button', { name: /Entrar com extensão/ })).toBeDisabled()
    expect(screen.getByText('Nenhuma extensão encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Como instalar' })).toBeInTheDocument()
  })

  it('entrar com extensao leva as conversas, so com a chave publica', async () => {
    const pubkey = pubkeyDe(gerarChave())
    instalarExtensao({
      getPublicKey: async () => pubkey,
      signEvent: vi.fn(),
      nip44: { encrypt: vi.fn(), decrypt: vi.fn() },
    })
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Entrar com extensão/ }))
    expect(await screen.findByText('lista de conversas')).toBeInTheDocument()
    const { assinante } = useSessao.getState()
    expect(assinante?.pubkey).toBe(pubkey)
    expect(assinante?.exportarNsec).toBeUndefined()
  })

  it('pedido recusado na extensao mostra a mensagem e continua fora', async () => {
    instalarExtensao({
      getPublicKey: async () => Promise.reject(new Error('no')),
      signEvent: vi.fn(),
      nip44: { encrypt: vi.fn(), decrypt: vi.fn() },
    })
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Entrar com extensão/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você recusou o acesso')
    expect(useSessao.getState().fase).toBe('fora')
  })
})

describe('colar a nsec', () => {
  async function irParaNsec() {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Colar minha chave secreta/ }))
  }

  it('nsec valida entra com a npub correspondente', async () => {
    const chave = gerarChave()
    await irParaNsec()
    await userEvent.type(screen.getByLabelText(/Chave secreta \(nsec\)/), nsecDe(chave))
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('lista de conversas')).toBeInTheDocument()
    expect(useSessao.getState().assinante?.pubkey).toBe(pubkeyDe(chave))
  })

  it('nsec invalida: mensagem e nada guardado', async () => {
    await irParaNsec()
    await userEvent.type(screen.getByLabelText(/Chave secreta \(nsec\)/), 'nsec1abc')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/Essa chave não é válida/)).toBeInTheDocument()
    expect(await lerSessaoSalva()).toBeUndefined()
  })

  it('RN-WEB-AUTH-004: npub no lugar da nsec explica a diferenca', async () => {
    await irParaNsec()
    await userEvent.type(
      screen.getByLabelText(/Chave secreta \(nsec\)/),
      npubDe(pubkeyDe(gerarChave())),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/Isso é sua chave pública \(npub\)/)).toBeInTheDocument()
    expect(await lerSessaoSalva()).toBeUndefined()
  })
})

describe('criar identidade', () => {
  async function criar(nome: string) {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: /Criar identidade nova/ }))
    if (nome) await userEvent.type(screen.getByLabelText(/Seu nome/), nome)
    await userEvent.click(screen.getByRole('button', { name: 'Criar identidade' }))
  }

  it('RN-WEB-AUTH-005: Continuar fica desabilitado ate marcar "Guardei minha chave"', async () => {
    await criar('Maria')
    const continuar = screen.getByRole('button', { name: 'Continuar' })
    expect(continuar).toBeDisabled()
    expect(await lerSessaoSalva()).toBeUndefined()
    await userEvent.click(screen.getByLabelText('Guardei minha chave'))
    expect(continuar).toBeEnabled()
  })

  it('confirmada: entra e publica o perfil kind 0 com o nome', async () => {
    await criar('Maria')
    await userEvent.click(screen.getByLabelText('Guardei minha chave'))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('lista de conversas')).toBeInTheDocument()
    await waitFor(() => expect(publicar).toHaveBeenCalledOnce())
    const evento = (publicar.mock.calls[0] as unknown as [{ kind: number; content: string }])[0]
    expect(evento.kind).toBe(0)
    expect(JSON.parse(evento.content)).toEqual({ name: 'Maria' })
  })

  it('sem nome nao publica perfil', async () => {
    await criar('')
    await userEvent.click(screen.getByLabelText('Guardei minha chave'))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('lista de conversas')
    expect(publicar).not.toHaveBeenCalled()
  })

  it('a nsec mostrada e a mesma que fica guardada', async () => {
    await criar('')
    const nsec = (screen.getByLabelText(/Sua chave secreta/) as HTMLInputElement).value
    expect(nsec).toMatch(/^nsec1/)
    await userEvent.click(screen.getByLabelText('Guardei minha chave'))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('lista de conversas')
    expect(await lerSessaoSalva()).toMatchObject({ metodo: 'nsec', segredo: nsec })
  })
})

describe('conta', () => {
  async function entrarComNsec() {
    const chave = gerarChave()
    await useSessao.getState().entrarComNsec(nsecDe(chave))
    return chave
  }

  it('RN-WEB-AUTH-009: a nsec so aparece depois de confirmar no modal', async () => {
    const chave = await entrarComNsec()
    render(
      <MemoryRouter initialEntries={['/conta']}>
        <Conta />
      </MemoryRouter>,
    )
    expect(screen.queryByText(nsecDe(chave))).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver chave secreta' }))
    expect(screen.queryByText(nsecDe(chave))).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar minha chave secreta' }))
    expect(screen.getByText(nsecDe(chave))).toBeInTheDocument()
  })

  it('RN-WEB-AUTH-009: a nsec some da tela depois de 60 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const chave = await entrarComNsec()
      render(
        <MemoryRouter initialEntries={['/conta']}>
          <Conta />
        </MemoryRouter>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Ver chave secreta' }))
      await userEvent.click(screen.getByRole('button', { name: 'Mostrar minha chave secreta' }))
      expect(screen.getByText(nsecDe(chave))).toBeInTheDocument()
      await act(() => vi.advanceTimersByTimeAsync(59_000))
      expect(screen.getByText(nsecDe(chave))).toBeInTheDocument()
      await act(() => vi.advanceTimersByTimeAsync(1_000))
      expect(screen.queryByText(nsecDe(chave))).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('RN-WEB-AUTH-008: sair apaga a sessao e volta ao inicio', async () => {
    await entrarComNsec()
    render(
      <MemoryRouter initialEntries={['/conta']}>
        <Routes>
          <Route path="/conta" element={<Conta />} />
          <Route path="/" element={<p>inicio</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(screen.getByText(/inclusive a chave/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair mesmo' }))
    expect(await screen.findByText('inicio')).toBeInTheDocument()
    expect(await lerSessaoSalva()).toBeUndefined()
    expect(useSessao.getState()).toMatchObject({ fase: 'fora', assinante: null })
  })
})
