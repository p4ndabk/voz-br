import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conta } from './Conta'
import { Conversa } from './Conversa'
import { LayoutConversas } from './conversas/LayoutConversas'
import { PainelVazio } from './conversas/PainelVazio'
import { NovaConversa } from './NovaConversa'

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: { publicar: vi.fn(), consultar: vi.fn(async () => []), inscrever: vi.fn() },
}))
const nomes = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('@/nostr/usePerfil', () => ({
  usePerfil: (pubkey: string) => (nomes[pubkey] ? { nome: nomes[pubkey] } : null),
}))

const eu = criarAssinanteLocal(gerarChave())
const maria = pubkeyDe(gerarChave())
const joao = pubkeyDe(gerarChave())
nomes[maria] = 'Maria'
nomes[joao] = 'João'

function abrir(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route element={<LayoutConversas />}>
          <Route path="/conversas">
            <Route index element={<PainelVazio />} />
            <Route path="nova" element={<NovaConversa />} />
            <Route path=":pubkey" element={<Conversa />} />
          </Route>
          <Route path="/conta" element={<Conta />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const lateral = () => screen.getByTestId('coluna-lista')
const meio = () => screen.getByTestId('coluna-conversa')
const itemDa = (nome: string) =>
  within(screen.getByRole('list', { name: 'Suas conversas' })).getByRole('link', {
    name: new RegExp(nome),
  })

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  useSessao.setState({ fase: 'dentro', assinante: eu })
  await useConversas.getState().registrarRecebida(maria, 1000, 'oi, tudo bem?')
  await useConversas.getState().registrarRecebida(joao, 2000, 'e Platão?', [], true)
  useConversas.setState({ conversas: [], carregada: false })
})

describe('layout de duas colunas', () => {
  it('RN-WEB-LAYOUT-001: na lista (/conversas) a lateral aparece e o centro so em tela larga', async () => {
    abrir('/conversas')
    await screen.findByRole('list', { name: 'Suas conversas' })
    expect(lateral()).not.toHaveClass('hidden')
    expect(lateral()).toHaveClass('md:flex')
    expect(meio()).toHaveClass('hidden', 'md:flex')
    expect(within(meio()).getByText('Selecione uma conversa')).toBeInTheDocument()
  })

  it('RN-WEB-LAYOUT-001: com uma conversa aberta, o centro aparece e a lateral so em tela larga', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    expect(meio()).not.toHaveClass('hidden')
    expect(lateral()).toHaveClass('hidden', 'md:flex')
  })

  it('RN-WEB-LAYOUT-001: nova conversa tambem ocupa o centro', async () => {
    abrir('/conversas/nova')
    expect(await screen.findByLabelText('Chave do amigo')).toBeInTheDocument()
    expect(meio()).not.toHaveClass('hidden')
    expect(lateral()).toHaveClass('hidden', 'md:flex')
  })

  it('a lista mostra o nome, o trecho, a hora e "Nova pessoa" de cada conversa', async () => {
    abrir('/conversas')
    const m = await screen.findByRole('link', { name: /Maria/ })
    expect(within(m).getByText('oi, tudo bem?')).toBeInTheDocument()
    expect(within(m).getByText('Nova pessoa')).toBeInTheDocument()
    const j = itemDa('João')
    expect(within(j).getByText('e Platão?')).toBeInTheDocument()
    expect(within(j).queryByText('Nova pessoa')).not.toBeInTheDocument()
  })

  it('ordena a lateral pela ultima mensagem (a mais recente em cima)', async () => {
    abrir('/conversas')
    // A lista existe antes de as conversas carregarem: espera os itens.
    await screen.findByRole('link', { name: /Maria/ })
    await screen.findByRole('link', { name: /João/ })
    const nomesNaOrdem = within(screen.getByRole('list', { name: 'Suas conversas' }))
      .getAllByRole('link')
      .map((l) => (/Maria|João/.exec(l.textContent ?? '') ?? [])[0])
    expect(nomesNaOrdem).toEqual(['João', 'Maria'])
  })

  it('RN-WEB-LAYOUT-002: a conversa aberta fica destacada na lista', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    expect(itemDa('Maria')).toHaveAttribute('aria-current', 'page')
    expect(itemDa('João')).not.toHaveAttribute('aria-current')
  })

  it('RN-WEB-LAYOUT-003: trocar de conversa mantem a lista e muda a conversa do centro', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    const listaAntes = screen.getByRole('list', { name: 'Suas conversas' })

    await userEvent.click(itemDa('João'))
    await vi.waitFor(() => expect(itemDa('João')).toHaveAttribute('aria-current', 'page'))

    expect(screen.getByRole('list', { name: 'Suas conversas' })).toBe(listaAntes)
    expect(itemDa('Maria')).not.toHaveAttribute('aria-current')
    expect(within(meio()).getByText('João')).toBeInTheDocument()
  })

  it('o cabecalho da conversa tem o caminho de volta para a lista (usado em tela estreita)', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    const voltar = within(meio()).getByRole('link', { name: 'Voltar às conversas' })
    expect(voltar).toHaveClass('md:hidden')
    await userEvent.click(voltar)
    expect(await screen.findByText('Selecione uma conversa')).toBeInTheDocument()
  })

  it('sem conversas, a lateral mostra o estado vazio e o centro convida a escolher', async () => {
    await clear()
    abrir('/conversas')
    expect(
      await screen.findByText('Cole a chave de alguém para começar uma conversa'),
    ).toBeInTheDocument()
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument()
  })

  // RN-WEB-LAYOUT-004
  it('a lateral oferece Nova conversa e, no pe, Editar perfil, Meu codigo e Sair', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    const nav = within(lateral())
    expect(nav.getByRole('link', { name: 'Nova conversa' })).toHaveAttribute(
      'href',
      '/conversas/nova',
    )
    expect(nav.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute(
      'href',
      '/conta/perfil',
    )
    expect(nav.getByRole('link', { name: 'Meu código' })).toHaveAttribute('href', '/meu-codigo')
    expect(nav.getAllByRole('link', { name: 'Minha conta' })[0]).toHaveAttribute('href', '/conta')
  })

  it('Sair pede confirmacao e so entao encerra a sessao', async () => {
    abrir(`/conversas/${maria}`)
    await screen.findByText('Privado')
    await userEvent.click(within(lateral()).getByRole('button', { name: 'Sair' }))
    expect(useSessao.getState().assinante).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Sair mesmo' }))
    expect(useSessao.getState().assinante).toBeNull()
  })

  it('a conta abre no painel do meio e a lista continua na lateral', async () => {
    abrir('/conta')
    await screen.findByRole('heading', { name: 'Minha conta' })
    expect(within(meio()).getByRole('heading', { name: 'Minha conta' })).toBeInTheDocument()
    expect(within(lateral()).getByRole('list', { name: 'Suas conversas' })).toBeInTheDocument()
  })
})
