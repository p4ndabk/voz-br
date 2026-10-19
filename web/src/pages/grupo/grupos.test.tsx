import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import type { Grupo as DadosDoGrupo } from '@/grupos/tipos'
import { useGrupos } from '@/grupos/useGrupos'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { LayoutConversas } from '../conversas/LayoutConversas'
import { PainelVazio } from '../conversas/PainelVazio'
import { Grupo } from './Grupo'
import { NovoGrupo } from './NovoGrupo'

vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    assinar: vi.fn(() => () => {}),
    conectados: vi.fn(() => 0),
    definirAutenticador: vi.fn(),
    definirRelays: vi.fn(),
    snapshot: vi.fn(() => []),
    publicar: vi.fn(async () => ({ aceitos: 1, total: 1, porRelay: {} })),
    consultar: vi.fn(async () => []),
    inscrever: vi.fn(() => () => {}),
  },
}))

const eu = criarAssinanteLocal(gerarChave())
const outro = criarAssinanteLocal(gerarChave())
const terceiro = criarAssinanteLocal(gerarChave())
const ID = 'ab'.repeat(32)

const grupo = (extra: Partial<DadosDoGrupo> = {}): DadosDoGrupo => ({
  id: ID,
  nome: 'Filosofia',
  admin: outro.pubkey,
  membros: [outro.pubkey, eu.pubkey],
  pendentes: [],
  versao: 2,
  estado: 'ativo',
  criadoEm: 1000,
  ...extra,
})

function abrir(caminho = '/conversas') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route element={<LayoutConversas />}>
          <Route path="/conversas">
            <Route index element={<PainelVazio />} />
            <Route path="grupo/novo" element={<NovoGrupo />} />
            <Route path="grupo/:id" element={<Grupo />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  useGrupos.setState({ grupos: [], carregada: false })
  useSessao.setState({ fase: 'dentro', assinante: eu })
})

describe('grupos na tela', () => {
  it('RN-WEB-GRUPOS-004: convite aparece separado na lista, com Aceitar e Recusar, e nada de mensagens', async () => {
    await useGrupos.getState().gravar(grupo({ estado: 'convidado', pendentes: [eu.pubkey] }))
    abrir(`/conversas/grupo/${ID}`)
    const lista = await screen.findByRole('list', { name: 'Convites' })
    expect(within(lista).getByText('Filosofia')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Aceitar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Escreva uma mensagem' })).not.toBeInTheDocument()
  })

  it('RN-WEB-GRUPOS-002: o botao Criar grupo so habilita com nome e pelo menos uma pessoa', async () => {
    await useConversas.getState().abrirOuCriar(terceiro.pubkey)
    abrir('/conversas/grupo/novo')
    const criar = await screen.findByRole('button', { name: 'Criar grupo' })
    expect(criar).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Nome do grupo'), 'Cultura')
    expect(criar).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(criar).toBeEnabled()
  })

  it('RN-WEB-GRUPOS-003 e 006: o menu do membro tem Sair; o do admin tem Passar o admin e nao tem Sair', async () => {
    await useGrupos.getState().gravar(grupo())
    abrir(`/conversas/grupo/${ID}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Mais' }))
    expect(screen.getByRole('menuitem', { name: 'Sair do grupo' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Limpar para todos' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Excluir grupo' })).toBeInTheDocument()
  })

  it('RN-WEB-GRUPOS-006: o admin ve Limpar para todos, Passar o admin e Encerrar, sem Sair', async () => {
    await useGrupos
      .getState()
      .gravar(grupo({ admin: eu.pubkey, membros: [eu.pubkey, outro.pubkey] }))
    abrir(`/conversas/grupo/${ID}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Mais' }))
    expect(screen.getByRole('menuitem', { name: 'Limpar para todos' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Passar o admin' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Encerrar grupo' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Encerrar grupo e apagar conversas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Excluir grupo' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Sair do grupo' })).not.toBeInTheDocument()
  })

  it('RN-WEB-GRUPOS-008: quem saiu ve o historico mas nao tem campo de mensagem', async () => {
    await useGrupos.getState().gravar(grupo({ estado: 'saiu' }))
    abrir(`/conversas/grupo/${ID}`)
    expect(await screen.findByText(/Você saiu deste grupo/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Escreva uma mensagem' })).not.toBeInTheDocument()
  })

  it('RN-WEB-GRUPOS-008: com o grupo ativo e outros membros, o campo de mensagem aparece', async () => {
    await useGrupos.getState().gravar(grupo())
    abrir(`/conversas/grupo/${ID}`)
    expect(await screen.findByRole('textbox', { name: 'Escreva uma mensagem' })).toBeInTheDocument()
  })

  it('RN-WEB-GRUPOS-012: o aviso de quem entrou aparece no meio da conversa', async () => {
    await useGrupos.getState().gravar(grupo())
    const { salvarMensagem } = await import('@/conversas/armazemMensagens')
    await salvarMensagem({
      id: 'sistema:1',
      conversa: `grupo:${ID}`,
      autor: '',
      texto: terceiro.pubkey,
      criadoEm: 2000,
      estado: 'recebida',
      sistema: 'entrou',
    })
    abrir(`/conversas/grupo/${ID}`)
    expect(await screen.findByText(/entrou no grupo/)).toBeInTheDocument()
  })
})
