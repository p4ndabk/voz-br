import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoApagar } from '@/conversas/apagar'
import { queimar } from '@/conversas/queima'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conversa } from './Conversa'
import { LayoutConversas } from './conversas/LayoutConversas'
import { PainelVazio } from './conversas/PainelVazio'

const tocarFogo = vi.hoisted(() => vi.fn())
vi.mock('@/conversas/som', async (original) => ({
  ...(await original<typeof import('@/conversas/som')>()),
  tocarFogo,
}))
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
  tocarFogo.mockClear()
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

  it('um clique em Apagar fecha o aviso, apaga com o meu nome e nao mostra tela de resultado', async () => {
    await apagarTudo()
    expect(apagarHistorico).toHaveBeenCalledWith(eu, maria, 'Ana')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Apagado deste aparelho.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Pedido enviado/)).not.toBeInTheDocument()
  })

  it('a conversa fica vazia com a linha "Historico apagado em"', async () => {
    await apagarTudo()
    const hoje = new Intl.DateTimeFormat('pt-BR').format(new Date())
    expect(await screen.findByTestId('linha-apagado')).toHaveTextContent(
      `Histórico apagado em ${hoje}`,
    )
    const meio = within(screen.getByTestId('coluna-conversa'))
    expect(meio.queryByText('Nenhuma mensagem ainda')).not.toBeInTheDocument()
  })

  it('RN-WEB-APAGAR-013: erro no envio dos pedidos nao mostra nada nem quebra a tela', async () => {
    apagarHistorico.mockRejectedValue(new Error('boom'))
    await apagarTudo()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('coluna-conversa')).toBeInTheDocument()
  })

  it('quando foi o amigo que apagou, a linha diz o nome dele', async () => {
    await useConversas.getState().registrarApagamento(maria, Math.floor(Date.now() / 1000), 'outro')
    abrir()
    expect(await screen.findByTestId('linha-apagado')).toHaveTextContent(
      /Maria apagou o histórico desta conversa em \d{2}\/\d{2}\/\d{4}\./,
    )
  })

  describe('fogo (RN-WEB-APAGAR-010 a 012)', () => {
    const lapis = () => Math.floor(Date.now() / 1000)

    async function semear() {
      for (const [i, texto] of ['primeira', 'segunda', 'terceira'].entries()) {
        await useMensagens.getState().inserir({
          id: `m${i}`,
          conversa: maria,
          autor: i % 2 ? eu.pubkey : maria,
          texto,
          criadoEm: lapis() - 100 + i,
          estado: i % 2 ? 'enviada' : 'recebida',
        })
      }
    }

    // O apagarHistorico de verdade chama `queimar` e so depois tira as mensagens da tela.
    function apagarComFogo() {
      apagarHistorico.mockImplementation(async () => {
        const limite = lapis()
        await useConversas.getState().registrarApagamento(maria, limite, 'eu')
        await queimar(maria, limite)
        useMensagens.getState().removerAte(maria, limite)
        return resultado()
      })
    }

    function simularCanvas() {
      const contexto = new Proxy(
        {
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
        },
        {
          get: (alvo, nome) => (nome in alvo ? alvo[nome as keyof typeof alvo] : () => {}),
          set: () => true,
        },
      )
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        contexto as unknown as CanvasRenderingContext2D,
      )
      let t = 0
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
        setTimeout(() => cb((t += 300)), 0),
      )
      vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
    }

    const movimentoReduzido = (reduzido: boolean) =>
      vi.stubGlobal('matchMedia', (consulta: string) => ({
        matches: reduzido && consulta.includes('reduce'),
        media: consulta,
      }))

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('RN-WEB-APAGAR-010: ao apagar, o fogo aparece, as mensagens queimam e depois saem, sem tela de resultado', async () => {
      await semear()
      apagarComFogo()
      simularCanvas()
      movimentoReduzido(false)
      abrir()
      await screen.findByText('primeira')
      const modal = within(await abrirModal())
      await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))

      expect(await screen.findByTestId('fogo')).toBeInTheDocument()
      // RN-WEB-APAGAR-014: o som toca junto com o fogo.
      expect(tocarFogo).toHaveBeenCalledOnce()
      expect(screen.getByText('primeira').closest('li')).toHaveClass('queimar')
      expect(screen.getByText('Queimando o histórico da conversa…')).toBeInTheDocument()
      // O aviso fecha no clique: so o fogo fica na tela.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await waitFor(() => expect(screen.queryByTestId('fogo')).not.toBeInTheDocument(), {
        timeout: 5000,
      })
      expect(screen.queryByText('primeira')).not.toBeInTheDocument()
      // Nada de tela de resultado depois.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('RN-WEB-APAGAR-011: com movimento reduzido nao ha fogo, so esmaece', async () => {
      await semear()
      apagarComFogo()
      simularCanvas()
      movimentoReduzido(true)
      abrir()
      await screen.findByText('primeira')
      const modal = within(await abrirModal())
      await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))

      await waitFor(() =>
        expect(screen.getByText('primeira').closest('li')).toHaveClass('queimar-suave'),
      )
      expect(screen.queryByTestId('fogo')).not.toBeInTheDocument()
      // RN-WEB-APAGAR-014: sem fogo, sem som.
      expect(tocarFogo).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByText('primeira')).not.toBeInTheDocument(), {
        timeout: 3000,
      })
    })

    it('RN-WEB-APAGAR-010: se o canvas nao funciona, as mensagens saem do mesmo jeito', async () => {
      await semear()
      apagarComFogo()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
      movimentoReduzido(false)
      abrir()
      await screen.findByText('primeira')
      const modal = within(await abrirModal())
      await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))
      await waitFor(() => expect(screen.queryByText('primeira')).not.toBeInTheDocument())
      expect(apagarHistorico).toHaveBeenCalledOnce()
    })

    it('RN-WEB-APAGAR-010: mensagem que chega durante o fogo nao queima', async () => {
      await semear()
      apagarComFogo()
      simularCanvas()
      movimentoReduzido(false)
      abrir()
      await screen.findByText('primeira')
      const modal = within(await abrirModal())
      await userEvent.click(modal.getByRole('button', { name: 'Apagar' }))
      await screen.findByTestId('fogo')
      await useMensagens.getState().inserir({
        id: 'nova',
        conversa: maria,
        autor: maria,
        texto: 'chegou agora',
        criadoEm: lapis() + 10,
        estado: 'recebida',
      })
      expect(await screen.findByText('chegou agora')).toBeInTheDocument()
      expect(screen.getByText('chegou agora').closest('li')).not.toHaveClass('queimar')
      await waitFor(() => expect(screen.queryByTestId('fogo')).not.toBeInTheDocument(), {
        timeout: 5000,
      })
      expect(screen.getByText('chegou agora')).toBeInTheDocument()
    })
  })
})
