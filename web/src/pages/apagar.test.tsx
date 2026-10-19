import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoApagar } from '@/conversas/apagar'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conversa } from './Conversa'
import { LayoutConversas } from './conversas/LayoutConversas'
import { PainelVazio } from './conversas/PainelVazio'

const apagarHistorico = vi.hoisted(() => vi.fn())
vi.mock('@/conversas/apagar', async (original) => ({
  ...(await original<typeof import('@/conversas/apagar')>()),
  apagarHistorico,
}))
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
nomes[eu.pubkey] = 'Ana'
nomes[maria] = 'Maria'

const resultado = (extra: Partial<ResultadoApagar> = {}): ResultadoApagar => ({
  apagadas: 3,
  relaysAtendidos: 3,
  relaysTotal: 3,
  aviso: 'enviado',
  semChave: 0,
  pendentes: 0,
  ...extra,
})

function abrir() {
  render(
    <MemoryRouter initialEntries={[`/conversas/${maria}`]}>
      <Routes>
        <Route path="/conversas" element={<LayoutConversas />}>
          <Route index element={<PainelVazio />} />
          <Route path=":pubkey" element={<Conversa />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const abrirModal = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Mais' }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Apagar histórico' }))
  return screen.getByRole('dialog', { name: 'Apagar histórico' })
}

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  useSessao.setState({ fase: 'dentro', assinante: eu })
  apagarHistorico.mockReset()
  apagarHistorico.mockImplementation(async () => {
    await useConversas.getState().registrarApagamento(maria, Math.floor(Date.now() / 1000), 'eu')
    return resultado()
  })
  await useConversas.getState().abrirOuCriar(maria)
})

describe('apagar historico (interface)', () => {
  it('RN-WEB-APAGAR-004: a primeira etapa diz o que e certo e o que e so um pedido', async () => {
    abrir()
    const modal = within(await abrirModal())
    expect(
      modal.getByText(
        'Do seu aparelho, apagamos com certeza. Dos relays e do aparelho de Maria, enviamos um pedido. A maioria atende, mas não dá para garantir, e quem já leu ou copiou pode ter guardado.',
      ),
    ).toBeInTheDocument()
    expect(apagarHistorico).not.toHaveBeenCalled()
  })

  it('RN-WEB-APAGAR-001: abrir o aviso nao apaga nada; um clique em Apagar apaga', async () => {
    abrir()
    const modal = within(await abrirModal())
    expect(modal.queryByLabelText('Confirmação')).not.toBeInTheDocument()
    expect(apagarHistorico).not.toHaveBeenCalled()
    await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))
    expect(apagarHistorico).toHaveBeenCalledOnce()
  })

  it('RN-WEB-APAGAR-001: fechar o aviso nao apaga nada', async () => {
    abrir()
    const modal = within(await abrirModal())
    await userEvent.click(modal.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog', { name: 'Apagar histórico' })).not.toBeInTheDocument()
    expect(apagarHistorico).not.toHaveBeenCalled()
  })

  async function apagarTudo() {
    abrir()
    const modal = within(await abrirModal())
    await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))
    return modal
  }

  it('apaga com o meu nome para o aviso e mostra o resumo', async () => {
    const modal = await apagarTudo()
    expect(apagarHistorico).toHaveBeenCalledWith(eu, maria, 'Ana')
    expect(await modal.findByText('Apagado deste aparelho.')).toBeInTheDocument()
    expect(modal.getByText('Pedido enviado a 3 de 3 relays.')).toBeInTheDocument()
    expect(modal.getByText('Pedido enviado a Maria.')).toBeInTheDocument()
    expect(modal.queryByText(/quando a conexão voltar/)).not.toBeInTheDocument()
  })

  it('a conversa fica vazia com a linha "Historico apagado em"', async () => {
    const modal = await apagarTudo()
    await modal.findByText('Apagado deste aparelho.')
    await userEvent.click(modal.getByRole('button', { name: 'Fechar' }))
    const hoje = new Intl.DateTimeFormat('pt-BR').format(new Date())
    expect(screen.getByTestId('linha-apagado')).toHaveTextContent(`Histórico apagado em ${hoje}`)
    const meio = within(screen.getByTestId('coluna-conversa'))
    expect(meio.queryByText('Nenhuma mensagem ainda')).not.toBeInTheDocument()
  })

  it('RN-WEB-APAGAR-003: sem internet avisa que os pedidos saem quando a conexao voltar', async () => {
    apagarHistorico.mockResolvedValue(
      resultado({ relaysAtendidos: 0, aviso: 'pendente', pendentes: 7 }),
    )
    const modal = await apagarTudo()
    expect(await modal.findByText('Apagado deste aparelho.')).toBeInTheDocument()
    expect(modal.getByText('Pedido enviado a 0 de 3 relays.')).toBeInTheDocument()
    expect(
      modal.getByText('O aviso a Maria será enviado quando a conexão voltar.'),
    ).toBeInTheDocument()
    expect(
      modal.getByText('Os pedidos aos relays serão enviados quando a conexão voltar.'),
    ).toBeInTheDocument()
  })

  it('RN-WEB-APAGAR-008: informa quantas mensagens antigas nao puderam ser pedidas', async () => {
    apagarHistorico.mockResolvedValue(resultado({ semChave: 5 }))
    const modal = await apagarTudo()
    expect(
      await modal.findByText('5 mensagens antigas não puderam ser pedidas para apagar nos relays.'),
    ).toBeInTheDocument()
  })

  it('RN-WEB-APAGAR-008: singular quando e so uma', async () => {
    apagarHistorico.mockResolvedValue(resultado({ semChave: 1 }))
    const modal = await apagarTudo()
    expect(
      await modal.findByText('1 mensagem antiga não pôde ser pedida para apagar nos relays.'),
    ).toBeInTheDocument()
  })

  it('se der erro inesperado, mostra a falha em vez de fingir que apagou', async () => {
    apagarHistorico.mockRejectedValue(new Error('boom'))
    const modal = await apagarTudo()
    expect(await modal.findByRole('alert')).toHaveTextContent('Não foi possível enviar')
    expect(modal.queryByText('Apagado deste aparelho.')).not.toBeInTheDocument()
  })

  it('quando foi o amigo que apagou, a linha diz o nome dele', async () => {
    await useConversas.getState().registrarApagamento(maria, Math.floor(Date.now() / 1000), 'outro')
    abrir()
    expect(await screen.findByTestId('linha-apagado')).toHaveTextContent(
      /Maria apagou o histórico desta conversa em \d{2}\/\d{2}\/\d{4}\./,
    )
  })
})
