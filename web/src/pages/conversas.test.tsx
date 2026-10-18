import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from '@/conversas/useConversas'
import { gerarChave, nprofileDe, npubDe, nsecDe, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conversa } from './Conversa'
import { LayoutConversas } from './conversas/LayoutConversas'
import { PainelVazio } from './conversas/PainelVazio'
import { MeuCodigo } from './MeuCodigo'
import { NovaConversa } from './NovaConversa'

const publicar = vi.hoisted(() => vi.fn())
const consultar = vi.hoisted(() => vi.fn())
vi.mock('@/nostr/relays', () => ({ relays: { publicar, consultar } }))
const estado = vi.hoisted(() => ({ perfil: null as { nome?: string } | null | undefined }))
vi.mock('@/nostr/usePerfil', () => ({ usePerfil: () => estado.perfil }))

const minhaChave = gerarChave()
const meuNpub = npubDe(pubkeyDe(minhaChave))
const amigo = pubkeyDe(gerarChave())

function abrir(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/conversas" element={<LayoutConversas />}>
          <Route index element={<PainelVazio />} />
          <Route path="nova" element={<NovaConversa />} />
          <Route path=":pubkey" element={<Conversa />} />
        </Route>
        <Route path="/meu-codigo" element={<MeuCodigo />} />
      </Routes>
    </MemoryRouter>,
  )
}

const lista = () => useConversas.getState().conversas

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useSessao.setState({ fase: 'dentro', assinante: criarAssinanteLocal(minhaChave) })
  estado.perfil = { nome: 'Maria' }
  publicar.mockClear()
  consultar.mockClear()
})

afterEach(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
})

async function colarEContinuar(texto: string) {
  await userEvent.click(screen.getByLabelText('Chave do amigo'))
  await userEvent.paste(texto)
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('nova conversa', () => {
  it('colar a npub mostra a pessoa e, ao confirmar, abre a conversa com selo Privado', async () => {
    abrir('/conversas/nova')
    await colarEContinuar(npubDe(amigo))
    expect(screen.getByText('É essa pessoa?')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(lista()).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Sim, abrir conversa' }))
    expect(await screen.findByText('Privado')).toBeInTheDocument()
    expect(lista().map((c) => c.pubkey)).toEqual([amigo])
  })

  it('amigo sem perfil: mostra a chave abreviada e deixa criar normalmente', async () => {
    estado.perfil = null
    abrir('/conversas/nova')
    await colarEContinuar(npubDe(amigo))
    expect(screen.getByText(/^npub1.{8}….{4}$/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sim, abrir conversa' }))
    expect(await screen.findByText('Privado')).toBeInTheDocument()
  })

  it('nprofile guarda os relays de dica da conversa', async () => {
    abrir('/conversas/nova')
    await colarEContinuar(nprofileDe(amigo, ['wss://exemplo']))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, abrir conversa' }))
    await screen.findByText('Privado')
    expect(lista()[0]?.relaysDica).toEqual(['wss://exemplo'])
  })

  it('"Não é" volta ao campo sem criar nada', async () => {
    abrir('/conversas/nova')
    await colarEContinuar(npubDe(amigo))
    await userEvent.click(screen.getByRole('button', { name: 'Não é' }))
    expect(screen.getByLabelText('Chave do amigo')).toBeInTheDocument()
    expect(lista()).toHaveLength(0)
  })

  it('RN-WEB-CONVERSAS-002: chave invalida mostra a mensagem e nao cria conversa', async () => {
    abrir('/conversas/nova')
    await colarEContinuar('npub1xyz')
    expect(await screen.findByText(/Essa chave não parece válida/)).toBeInTheDocument()
    expect(lista()).toHaveLength(0)
  })

  it('RN-WEB-CONVERSAS-003: nsec colada por engano e apagada do campo e nao e guardada', async () => {
    const nsec = nsecDe(gerarChave())
    abrir('/conversas/nova')
    await userEvent.click(screen.getByLabelText('Chave do amigo'))
    await userEvent.paste(nsec)
    expect(screen.getByLabelText('Chave do amigo')).toHaveValue('')
    expect(await screen.findByText(/Isso é uma chave secreta/)).toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(nsec)
    expect(lista()).toHaveLength(0)
  })

  it('RN-WEB-CONVERSAS-004: a propria chave e recusada', async () => {
    abrir('/conversas/nova')
    await colarEContinuar(meuNpub)
    expect(await screen.findByText('Essa é a sua própria chave.')).toBeInTheDocument()
    expect(lista()).toHaveLength(0)
  })

  it('RN-WEB-CONVERSAS-005: conversa que ja existe e aberta, sem duplicar', async () => {
    await useConversas.getState().abrirOuCriar(amigo)
    abrir('/conversas/nova')
    await colarEContinuar(npubDe(amigo))
    await userEvent.click(screen.getByRole('button', { name: 'Sim, abrir conversa' }))
    await screen.findByText('Privado')
    expect(lista()).toHaveLength(1)
  })

  it('sem camera disponivel, avisa e mantem o campo para colar', async () => {
    abrir('/conversas/nova')
    await userEvent.click(screen.getByRole('button', { name: 'Ler QR code' }))
    expect(await screen.findByText(/Não foi possível usar a câmera/)).toBeInTheDocument()
    expect(screen.getByLabelText('Chave do amigo')).toBeInTheDocument()
  })
})

describe('lista de conversas', () => {
  it('sem conversas mostra o estado vazio', async () => {
    abrir('/conversas')
    expect(
      await screen.findByText('Cole a chave de alguém para começar uma conversa'),
    ).toBeInTheDocument()
  })

  it('lista as conversas e marca quem escreveu primeiro como "Nova pessoa"', async () => {
    await useConversas.getState().registrarRecebida(amigo, 1000, 'oi, tudo bem?')
    abrir('/conversas')
    expect(await screen.findByText('oi, tudo bem?')).toBeInTheDocument()
    expect(screen.getByText('Nova pessoa')).toBeInTheDocument()
    expect(
      screen.queryByText('Cole a chave de alguém para começar uma conversa'),
    ).not.toBeInTheDocument()
  })

  it('conversa sem mensagens diz "Nenhuma mensagem ainda"', async () => {
    await useConversas.getState().abrirOuCriar(amigo)
    abrir('/conversas')
    expect(await screen.findByText('Nenhuma mensagem ainda')).toBeInTheDocument()
  })
})

describe('tela da conversa', () => {
  it('RN-WEB-CONVERSAS-007: mostra o selo Privado e o aviso', async () => {
    await useConversas.getState().abrirOuCriar(amigo)
    abrir(`/conversas/${amigo}`)
    expect(await screen.findByText('Privado')).toBeInTheDocument()
    expect(screen.getByText('Só vocês dois leem o conteúdo.')).toBeInTheDocument()
  })

  it('abrir uma "Nova pessoa" tira o selo', async () => {
    await useConversas.getState().registrarRecebida(amigo, 1000, 'oi')
    abrir(`/conversas/${amigo}`)
    await screen.findByText('Privado')
    await vi.waitFor(() => expect(lista()[0]?.novaPessoa).toBe(false))
  })

  it('RN-WEB-CONVERSAS-008: remover tira da lista, sem apagar mensagens nem falar com relay', async () => {
    await useConversas.getState().abrirOuCriar(amigo)
    abrir(`/conversas/${amigo}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Remover da lista' }))
    expect(screen.getByText(/As mensagens não são apagadas/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(
      await screen.findByText('Cole a chave de alguém para começar uma conversa'),
    ).toBeInTheDocument()
    expect(lista()).toHaveLength(0)
    expect(publicar).not.toHaveBeenCalled()
  })

  it('pubkey sem conversa volta para a lista', async () => {
    abrir(`/conversas/${amigo}`)
    expect(
      await screen.findByText('Cole a chave de alguém para começar uma conversa'),
    ).toBeInTheDocument()
  })
})

describe('meu codigo', () => {
  it('mostra a npub, o QR e copiar; sem Web Share nao oferece Compartilhar', () => {
    abrir('/meu-codigo')
    expect(screen.getByText(meuNpub)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Meu código' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).not.toBeInTheDocument()
  })

  it('com Web Share oferece Compartilhar e envia a npub', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    abrir('/meu-codigo')
    await userEvent.click(screen.getByRole('button', { name: 'Compartilhar' }))
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining(meuNpub) }),
    )
  })
})
