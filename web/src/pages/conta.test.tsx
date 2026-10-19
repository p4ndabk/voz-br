import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apagarTudoDoVoz, destravarSessao, lerSessaoSalva } from '@/nostr/sessao'
import { gerarChave, nsecDe } from '@/nostr/signer/chaves'
import { useSincronia } from '@/conversas/useSincronia'
import { useSessao } from '@/nostr/useSessao'
import { Conta } from './Conta'

vi.mock('@/nostr/relays', () => ({ relays: { publicar: vi.fn() } }))

// scrypt de producao leva ~1 s: estes testes esperam mais que o padrao.
const ESPERA = { timeout: 15_000 }

beforeEach(async () => {
  await apagarTudoDoVoz()
  useSessao.setState({ fase: 'fora', assinante: null })
})

function abrir() {
  render(
    <MemoryRouter initialEntries={['/conta']}>
      <Conta />
    </MemoryRouter>,
  )
}

describe('senha da chave em Conta', () => {
  it('RN-WEB-AUTH-011: conta sem senha ganha "Proteger com senha" e passa a ser protegida', async () => {
    await useSessao.getState().entrarComNsec(nsecDe(gerarChave()))
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Proteger com senha' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Nova senha'), 'minhasenha1')
    await userEvent.type(within(modal).getByLabelText('Repita a senha'), 'minhasenha1')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByText('Senha salva.', {}, ESPERA)).toBeInTheDocument()
    expect(await lerSessaoSalva()).toMatchObject({ metodo: 'nsec', protegida: true })
    expect(await screen.findByRole('button', { name: 'Trocar senha' })).toBeInTheDocument()
  }, 20_000)

  it('RN-WEB-AUTH-011: senha curta no modal e recusada', async () => {
    await useSessao.getState().entrarComNsec(nsecDe(gerarChave()))
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Proteger com senha' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Nova senha'), 'curta')
    await userEvent.type(within(modal).getByLabelText('Repita a senha'), 'curta')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar senha' }))
    expect(
      await within(modal).findByText('A senha precisa ter pelo menos 8 caracteres.'),
    ).toBeInTheDocument()
    expect(await lerSessaoSalva()).toMatchObject({ protegida: false })
  })

  it('RN-WEB-AUTH-011: trocar com a senha atual errada falha e nada muda', async () => {
    await useSessao.getState().entrarComNsec(nsecDe(gerarChave()), 'senhaantiga1')
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Trocar senha' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Senha atual'), 'erradaerrada')
    await userEvent.type(within(modal).getByLabelText('Nova senha'), 'senhanova123')
    await userEvent.type(within(modal).getByLabelText('Repita a senha'), 'senhanova123')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar senha' }))
    expect(await within(modal).findByText('Senha incorreta.', {}, ESPERA)).toBeInTheDocument()
    await expect(destravarSessao('senhaantiga1')).resolves.toBeDefined()
  }, 20_000)

  it('RN-WEB-AUTH-011: trocar com a atual certa faz a nova valer', async () => {
    await useSessao.getState().entrarComNsec(nsecDe(gerarChave()), 'senhaantiga1')
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Trocar senha' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Senha atual'), 'senhaantiga1')
    await userEvent.type(within(modal).getByLabelText('Nova senha'), 'senhanova123')
    await userEvent.type(within(modal).getByLabelText('Repita a senha'), 'senhanova123')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByText('Senha salva.', {}, ESPERA)).toBeInTheDocument()
    await expect(destravarSessao('senhanova123')).resolves.toBeDefined()
    await expect(destravarSessao('senhaantiga1')).rejects.toMatchObject({ motivo: 'senha-errada' })
  }, 30_000)

  it('RN-WEB-AUTH-012: com senha, ver a chave pede a senha; errada nao mostra, certa mostra', async () => {
    const chave = gerarChave()
    await useSessao.getState().entrarComNsec(nsecDe(chave), 'minhasenha1')
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver chave secreta' }))
    const mostrar = screen.getByRole('button', { name: 'Mostrar minha chave secreta' })
    expect(mostrar).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Sua senha'), 'senhaerrada')
    await userEvent.click(mostrar)
    expect(await screen.findByText('Senha incorreta.', {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(nsecDe(chave))).not.toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Sua senha'))
    await userEvent.type(screen.getByLabelText('Sua senha'), 'minhasenha1')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar minha chave secreta' }))
    await waitFor(() => expect(screen.getByText(nsecDe(chave))).toBeInTheDocument(), ESPERA)
  }, 30_000)

  it('RN-WEB-AUTH-012: sem senha a chave continua aparecendo sem pedir nada', async () => {
    const chave = gerarChave()
    await useSessao.getState().entrarComNsec(nsecDe(chave))
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Ver chave secreta' }))
    expect(screen.queryByLabelText('Sua senha')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar minha chave secreta' }))
    expect(screen.getByText(nsecDe(chave))).toBeInTheDocument()
  })
})

describe('lista em varios aparelhos em Conta', () => {
  it('RN-WEB-SYNC-004: o interruptor desliga e religa a sincronizacao', async () => {
    await useSessao.getState().entrarComNsec(nsecDe(gerarChave()))
    localStorage.clear()
    useSincronia.setState({ ligada: true, estado: 'parada' })
    abrir()
    expect(await screen.findByText('Lista em vários aparelhos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Desligar sincronização' }))
    expect(screen.getByText(/Sincronização desligada/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sincronizar agora' })).not.toBeInTheDocument()
    expect(localStorage.getItem('voz:sincronia')).toBe('off')
    await userEvent.click(screen.getByRole('button', { name: 'Ligar sincronização' }))
    expect(localStorage.getItem('voz:sincronia')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeInTheDocument()
  })
})
