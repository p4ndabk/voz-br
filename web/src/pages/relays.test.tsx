import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMeusRelays } from '@/conversas/meusRelays'
import { relaysPadrao } from '@/nostr/config'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Relays } from './Relays'

const rede = vi.hoisted(() => ({
  conecta: true,
  aceitos: 1,
  publicados: [] as { evento: { tags: string[][] }; urls?: readonly string[] }[],
}))

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  testarRelay: vi.fn(async () => rede.conecta),
  relays: {
    snapshot: vi.fn(() => []),
    consultar: vi.fn(async () => []),
    definirRelays: vi.fn(),
    publicar: vi.fn(async (evento: never, _t?: number, urls?: readonly string[]) => {
      rede.publicados.push({ evento, urls })
      return { aceitos: rede.aceitos, total: urls?.length ?? 0, porRelay: {} }
    }),
  },
}))
vi.mock('@/nostr/useRelays', () => ({
  useRelays: () => ({
    lista: relaysPadrao.map((url) => ({ url, estado: 'conectado' })),
    conectados: 3,
    total: 3,
  }),
}))

const eu = criarAssinanteLocal(gerarChave())

function abrir() {
  render(
    <MemoryRouter>
      <Relays />
    </MemoryRouter>,
  )
}

const campo = () => screen.getByLabelText('Endereço do relay')

async function adicionar(url: string) {
  await userEvent.type(campo(), url)
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
}

beforeEach(async () => {
  await clear()
  useMeusRelays.getState().limpar()
  useSessao.setState({ fase: 'dentro', assinante: eu })
  rede.conecta = true
  rede.aceitos = 1
  rede.publicados = []
})

describe('tela de relays', () => {
  it('mostra os relays padrao com o estado e um caminho de volta', () => {
    abrir()
    for (const url of relaysPadrao) expect(screen.getByText(url)).toBeInTheDocument()
    expect(screen.getAllByText('conectado')).toHaveLength(relaysPadrao.length)
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/conta')
    expect(screen.getByRole('button', { name: 'Salvar relays' })).toBeDisabled()
  })

  it('RN-WEB-RELAYS-007: adiciona o relay proprio, salva e publica o kind 10050', async () => {
    abrir()
    await adicionar('wss://meu.relay.com/')
    expect(await screen.findByText('wss://meu.relay.com')).toBeInTheDocument()
    expect(screen.getByText('ainda não salvo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar relays' }))
    expect(await screen.findByText(/Lista publicada em 1 de/)).toBeInTheDocument()
    expect(rede.publicados[0]!.evento.tags).toEqual([
      ...relaysPadrao.map((u) => ['relay', u]),
      ['relay', 'wss://meu.relay.com'],
    ])
    expect(useMeusRelays.getState().lista).toContain('wss://meu.relay.com')
  })

  it('RN-WEB-RELAYS-009: relay que nao conecta avisa e deixa adicionar mesmo assim', async () => {
    rede.conecta = false
    abrir()
    await adicionar('wss://fora.do.ar')
    expect(
      await screen.findByText(/Não consegui conectar em wss:\/\/fora.do.ar/),
    ).toBeInTheDocument()
    expect(screen.queryByText('wss://fora.do.ar', { selector: 'span' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar mesmo assim' }))
    expect(screen.getByText('wss://fora.do.ar', { selector: 'span' })).toBeInTheDocument()
  })

  it('cancelar descarta o relay que nao conectou', async () => {
    rede.conecta = false
    abrir()
    await adicionar('wss://fora.do.ar')
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/Não consegui conectar/)).not.toBeInTheDocument()
    expect(screen.queryByText('wss://fora.do.ar', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('endereco invalido, repetido e sexto relay sao recusados com explicacao', async () => {
    abrir()
    await adicionar('http://x.com')
    expect(await screen.findByText(/comece com wss:\/\//)).toBeInTheDocument()

    await userEvent.clear(campo())
    await adicionar(relaysPadrao[0]!)
    expect(await screen.findByText('Esse relay já está na lista.')).toBeInTheDocument()
  })

  it('o limite e de 5: o sexto e recusado', async () => {
    abrir()
    await adicionar('wss://quatro.com')
    await screen.findByText('wss://quatro.com')
    await adicionar('wss://cinco.com')
    await screen.findByText('wss://cinco.com')
    await adicionar('wss://seis.com')
    expect(await screen.findByText('No máximo 5 relays.')).toBeInTheDocument()
  })

  it('remover tira da lista; o ultimo relay nao pode ser removido', async () => {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: `Remover ${relaysPadrao[0]}` }))
    await userEvent.click(screen.getByRole('button', { name: `Remover ${relaysPadrao[1]}` }))
    expect(screen.queryByText(relaysPadrao[0]!)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Remover ${relaysPadrao[2]}` })).toBeDisabled()
    expect(screen.getByText('Mantenha ao menos um relay.')).toBeInTheDocument()
  })

  it('restaurar padrao volta aos relays do Voz', async () => {
    abrir()
    await adicionar('wss://meu.relay.com')
    await screen.findByText('wss://meu.relay.com')
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    expect(screen.queryByText('wss://meu.relay.com')).not.toBeInTheDocument()
    for (const url of relaysPadrao) expect(screen.getByText(url)).toBeInTheDocument()
  })

  it('RN-WEB-RELAYS-008: se nenhum relay aceita, mostra o erro e a lista salva nao muda', async () => {
    rede.aceitos = 0
    abrir()
    await adicionar('wss://meu.relay.com')
    await screen.findByText('wss://meu.relay.com')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar relays' }))
    expect(await screen.findByText(/Nenhum relay aceitou a lista/)).toBeInTheDocument()
    expect(useMeusRelays.getState().lista).toEqual([])
    expect(screen.getByRole('button', { name: 'Salvar relays' })).toBeEnabled()
  })
})
