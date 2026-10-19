import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conversa } from './Conversa'

const ouvintes = vi.hoisted(() => ({ lista: [] as ((e: unknown) => void)[] }))
vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    publicar: vi.fn(),
    consultar: vi.fn(async () => []),
    inscrever: vi.fn((_filtro: unknown, ouvinte: (e: unknown) => void) => {
      ouvintes.lista.push(ouvinte)
      return () => {}
    }),
  },
}))
const perfis = vi.hoisted(() => ({}) as Record<string, { nome?: string; lightning?: string }>)
vi.mock('@/nostr/usePerfil', () => ({ usePerfil: (pubkey: string) => perfis[pubkey] ?? null }))
const reciboValido = vi.hoisted(() => ({ valor: false }))
vi.mock('@/nostr/zap', () => ({ reciboConfirma: () => reciboValido.valor }))

const eu = criarAssinanteLocal(gerarChave())
const maria = pubkeyDe(gerarChave())
const joao = pubkeyDe(gerarChave())
perfis[maria] = { nome: 'Maria', lightning: 'maria@exemplo.com' }
perfis[joao] = { nome: 'João' }

function servico(extra: object = {}) {
  return {
    tag: 'payRequest',
    callback: 'https://exemplo.com/cb',
    minSendable: 10_000,
    maxSendable: 1_000_000,
    allowsNostr: true,
    nostrPubkey: 'c'.repeat(64),
    commentAllowed: 50,
    ...extra,
  }
}
const resposta = (corpo: object) => ({ ok: true, json: async () => corpo }) as Response

function abrir(pubkey: string) {
  render(
    <MemoryRouter initialEntries={[`/conversas/${pubkey}`]}>
      <Routes>
        <Route path="/conversas/:pubkey" element={<Conversa />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await clear()
  ouvintes.lista = []
  reciboValido.valor = false
  useMensagens.setState({ porConversa: {} })
  useSessao.setState({ fase: 'dentro', assinante: eu })
  await useConversas.getState().registrarRecebida(maria, 1000, 'oi')
  await useConversas.getState().registrarRecebida(joao, 1000, 'oi')
  useConversas.setState({ conversas: [], carregada: false })
  await useConversas.getState().carregar()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('enviar zap', () => {
  // RN-WEB-ZAP-001
  it('sem endereco Lightning o botao existe e o dialogo explica, sem consultar ninguem', async () => {
    const buscar = vi.fn()
    vi.stubGlobal('fetch', buscar)
    abrir(joao)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    expect(
      await screen.findByText(/ainda não configurou um endereço Lightning/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerar fatura' })).not.toBeInTheDocument()
    expect(buscar).not.toHaveBeenCalled()
  })

  // RN-WEB-ZAP-002
  it('nao consulta o servidor antes de abrir o zap', async () => {
    const buscar = vi.fn()
    vi.stubGlobal('fetch', buscar)
    abrir(maria)
    await screen.findByRole('button', { name: 'Enviar zap' })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('zap: mostra o aviso de publico, gera a fatura e confirma com o recibo', async () => {
    const buscar = vi.fn(async (url: string) =>
      url.includes('well-known') ? resposta(servico()) : resposta({ pr: 'lnbc1u1pabc' }),
    )
    vi.stubGlobal('fetch', buscar)
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))

    // RN-WEB-ZAP-004
    expect(await screen.findByText(/Fica registrado nos relays/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '100' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gerar fatura' }))

    expect(await screen.findByText('Pague 100 sats')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fatura Lightning em QR code' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir na carteira' })).toHaveAttribute(
      'href',
      'lightning:lnbc1u1pabc',
    )
    const chamada = new URL(String(buscar.mock.calls[1]?.[0]))
    expect(chamada.searchParams.get('amount')).toBe('100000')
    expect(JSON.parse(chamada.searchParams.get('nostr') ?? '{}').kind).toBe(9734)

    expect(screen.getByText('Aguardando o pagamento…')).toBeInTheDocument()
    reciboValido.valor = true
    ouvintes.lista.forEach((o) => o({}))
    expect(await screen.findByText('Zap recebido!')).toBeInTheDocument()
  })

  // RN-WEB-ZAP-007
  it('recibo invalido nao confirma', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('well-known') ? resposta(servico()) : resposta({ pr: 'lnbc1u1pabc' }),
      ),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar fatura' }))
    await screen.findByText('Pague 100 sats')
    ouvintes.lista.forEach((o) => o({}))
    expect(screen.queryByText('Zap recebido!')).not.toBeInTheDocument()
  })

  it('fatura comum: nao assina pedido e avisa que nao ha confirmacao', async () => {
    const buscar = vi.fn(async (url: string) =>
      url.includes('well-known') ? resposta(servico()) : resposta({ pr: 'lnbc1u1pabc' }),
    )
    vi.stubGlobal('fetch', buscar)
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    await userEvent.click(await screen.findByRole('radio', { name: /Fatura comum/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Gerar fatura' }))
    await screen.findByText('Pague 100 sats')
    expect(new URL(String(buscar.mock.calls[1]?.[0])).searchParams.get('nostr')).toBeNull()
    expect(screen.getByText(/O Voz não vê se o pagamento foi feito/)).toBeInTheDocument()
    expect(ouvintes.lista).toHaveLength(0)
  })

  it('servico sem zap: so fatura comum, com aviso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta(servico({ allowsNostr: false }))),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    expect(await screen.findByText(/não aceita zaps/)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  // RN-WEB-ZAP-003
  it('valor fora do limite desabilita Gerar fatura', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta(servico())),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    const campo = await screen.findByLabelText('Outro valor (sats)')
    await userEvent.clear(campo)
    await userEvent.type(campo, '5')
    expect(screen.getByRole('button', { name: 'Gerar fatura' })).toBeDisabled()
    expect(screen.getAllByText('De 10 a 1.000 sats.').length).toBeGreaterThan(0)
  })

  // RN-WEB-ZAP-006
  it('fatura de valor diferente e descartada com aviso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('well-known') ? resposta(servico()) : resposta({ pr: 'lnbc50u1pabc' }),
      ),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar fatura' }))
    expect(await screen.findByText(/não confere com o valor escolhido/)).toBeInTheDocument()
    expect(screen.queryByText(/Pague/)).not.toBeInTheDocument()
  })

  it('servidor fora do ar: avisa e deixa tentar de novo', async () => {
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValue(resposta(servico()))
    vi.stubGlobal('fetch', buscar)
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    expect(await screen.findByText(/Não foi possível falar com o serviço/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Gerar fatura' })).toBeInTheDocument(),
    )
  })

  // RN-WEB-ZAP-008
  it('WebLN so aparece se existir e so paga no clique', async () => {
    const pagar = vi.fn(async () => ({ preimage: 'x' }))
    vi.stubGlobal('webln', { enable: vi.fn(async () => {}), sendPayment: pagar })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('well-known') ? resposta(servico()) : resposta({ pr: 'lnbc1u1pabc' }),
      ),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar fatura' }))
    const botao = await screen.findByRole('button', { name: /Pagar com a extensão/ })
    expect(pagar).not.toHaveBeenCalled()
    await userEvent.click(botao)
    expect(pagar).toHaveBeenCalledWith('lnbc1u1pabc')
  })

  // Spec 0012: servico sem CORS (como a Bipa) passa pela API do Voz.
  it('servico que bloqueia o navegador: consulta e fatura passam pela API, com aviso', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const buscar = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://exemplo.com')) throw new TypeError('Failed to fetch')
      if (url.startsWith('http://api.test/lnurl/consulta')) {
        return resposta({
          url: 'https://exemplo.com/.well-known/lnurlp/maria',
          min_sats: 1,
          max_sats: 1000,
          aceita_zap: true,
          nostr_pubkey: 'c'.repeat(64),
          comentario_max: 100,
        })
      }
      expect(JSON.parse(String(init?.body))).toMatchObject({
        endereco: 'maria@exemplo.com',
        sats: 100,
      })
      return resposta({ fatura: 'lnbc1u1pabc' })
    })
    vi.stubGlobal('fetch', buscar)
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))

    expect(await screen.findByText(/passa pela API do Voz/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gerar fatura' }))
    expect(await screen.findByText('Pague 100 sats')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir na carteira' })).toHaveAttribute(
      'href',
      'lightning:lnbc1u1pabc',
    )
  })

  it('consulta direta que funciona nao mostra o aviso da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta(servico())),
    )
    abrir(maria)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar zap' }))
    await screen.findByRole('button', { name: 'Gerar fatura' })
    expect(screen.queryByText(/passa pela API do Voz/)).not.toBeInTheDocument()
  })
})
