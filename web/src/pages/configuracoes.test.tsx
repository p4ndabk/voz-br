import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { LayoutConfiguracoes } from './configuracoes/LayoutConfiguracoes'
import { SecaoConta } from './configuracoes/SecaoConta'
import { SecaoSons } from './configuracoes/SecaoSons'

vi.mock('@/nostr/relays', () => ({
  relays: { publicar: vi.fn(), consultar: vi.fn(async () => []) },
}))

const eu = criarAssinanteLocal(gerarChave())

function abrir(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/conversas" element={<p>lista de conversas</p>} />
        <Route path="/configuracoes" element={<LayoutConfiguracoes />}>
          <Route index element={<SecaoConta />} />
          <Route path="conta" element={<SecaoConta />} />
          <Route path="perfil" element={<p>secao perfil</p>} />
          <Route path="carteira" element={<p>secao carteira</p>} />
          <Route path="relays" element={<p>secao relays</p>} />
          <Route path="sons" element={<SecaoSons />} />
          <Route path="seguranca" element={<p>secao seguranca</p>} />
          <Route path="sincronizacao" element={<p>secao sincronizacao</p>} />
        </Route>
        <Route path="/conta" element={<Navigate to="/configuracoes/conta" replace />} />
        <Route path="/conta/relays" element={<Navigate to="/configuracoes/relays" replace />} />
      </Routes>
    </MemoryRouter>,
  )
}

const menu = () => screen.getByTestId('menu-configuracoes')
const conteudo = () => screen.getByTestId('conteudo-configuracoes')

beforeEach(async () => {
  await clear()
  localStorage.clear()
  useSessao.setState({ fase: 'dentro', assinante: eu })
})

describe('tela de configuracoes (RN-WEB-LAYOUT-008)', () => {
  it('RN-WEB-LAYOUT-008: o menu tem todas as secoes, com Carteira, e nao mostra a lista de conversas', () => {
    abrir('/configuracoes')
    const nav = within(screen.getByRole('navigation', { name: 'Seções das configurações' }))
    expect(nav.getAllByRole('link').map((l) => l.textContent?.replace('›', '').trim())).toEqual([
      'Minha conta',
      'Perfil',
      'Carteira',
      'Segurança',
      'Relays',
      'Sons e avisos',
      'Vários aparelhos',
    ])
    // Agrupadas por assunto, com um rotulo discreto em cada grupo.
    expect(within(menu()).getByText('Você')).toBeInTheDocument()
    expect(within(menu()).getByText('Aplicativo')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Suas conversas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('RN-WEB-LAYOUT-008: no menu do celular ninguem fica destacado; so em tela larga', () => {
    abrir('/configuracoes')
    const conta = within(menu()).getByRole('link', { name: 'Minha conta' })
    expect(conta.className).toContain('md:border-borda')
    expect(conta.className).not.toMatch(/(^|\s)border-borda/)
  })

  it('RN-WEB-LAYOUT-008: o indice mostra Minha conta e a marca como secao atual', () => {
    abrir('/configuracoes')
    expect(within(conteudo()).getByRole('heading', { name: 'Minha conta' })).toBeInTheDocument()
    expect(within(menu()).getByRole('link', { name: 'Minha conta' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('RN-WEB-LAYOUT-008: escolher uma secao abre ela ao lado do menu e a destaca', async () => {
    abrir('/configuracoes')
    await userEvent.click(within(menu()).getByRole('link', { name: 'Carteira' }))
    expect(within(conteudo()).getByText('secao carteira')).toBeInTheDocument()
    expect(within(menu()).getByRole('link', { name: 'Carteira' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(menu()).getByRole('link', { name: 'Minha conta' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('RN-WEB-LAYOUT-008: no celular o menu aparece sozinho e, dentro de uma secao, so ela', async () => {
    abrir('/configuracoes')
    expect(menu()).not.toHaveClass('hidden')
    expect(conteudo()).toHaveClass('hidden', 'md:flex')
    await userEvent.click(within(menu()).getByRole('link', { name: 'Relays' }))
    expect(menu()).toHaveClass('hidden', 'md:flex')
    expect(conteudo()).not.toHaveClass('hidden')
  })

  it('RN-WEB-LAYOUT-008: a seta do menu volta para as conversas', async () => {
    abrir('/configuracoes')
    await userEvent.click(screen.getByRole('link', { name: 'Voltar às conversas' }))
    expect(screen.getByText('lista de conversas')).toBeInTheDocument()
  })

  it('RN-WEB-LAYOUT-008: Sair fica no menu e pede confirmacao', async () => {
    abrir('/configuracoes/sons')
    await userEvent.click(within(menu()).getByRole('button', { name: 'Sair' }))
    expect(useSessao.getState().assinante).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Sair mesmo' }))
    expect(useSessao.getState().assinante).toBeNull()
  })

  it('RN-WEB-LAYOUT-008: os enderecos antigos /conta e /conta/relays seguem funcionando', () => {
    abrir('/conta/relays')
    expect(within(conteudo()).getByText('secao relays')).toBeInTheDocument()
  })

  it('Sons e avisos junta o som (plin e fogo) e os avisos do navegador', () => {
    abrir('/configuracoes/sons')
    const secao = within(conteudo())
    expect(secao.getByText('Sons do Voz')).toBeInTheDocument()
    expect(secao.getByRole('button', { name: 'Ouvir o fogo' })).toBeInTheDocument()
    expect(secao.getByText('Avisos do navegador')).toBeInTheDocument()
  })
})
