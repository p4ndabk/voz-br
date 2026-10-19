import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salvarMensagem, type Mensagem } from '@/conversas/armazemMensagens'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { useSessao } from '@/nostr/useSessao'
import { Conversa } from './Conversa'
import { LayoutConversas } from './conversas/LayoutConversas'
import { PainelVazio } from './conversas/PainelVazio'

const enviarMensagem = vi.hoisted(() => vi.fn(async () => ({})))
const reenviarMensagem = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/conversas/mensageria', async (original) => ({
  ...(await original<typeof import('@/conversas/mensageria')>()),
  enviarMensagem,
  reenviarMensagem,
}))
vi.mock('@/nostr/usePerfil', () => ({ usePerfil: () => ({ nome: 'Maria' }) }))

const eu = criarAssinanteLocal(gerarChave())
const amigo = pubkeyDe(gerarChave())

const agoraS = Math.floor(Date.now() / 1000)
function mensagem(
  id: string,
  autor: 'eu' | 'amigo',
  texto: string,
  extra: Partial<Mensagem> = {},
): Mensagem {
  return {
    id,
    conversa: amigo,
    autor: autor === 'eu' ? eu.pubkey : amigo,
    texto,
    criadoEm: agoraS,
    estado: autor === 'eu' ? 'enviada' : 'recebida',
    ...extra,
  }
}

async function abrir(mensagens: Mensagem[] = []) {
  await useConversas.getState().abrirOuCriar(amigo)
  // Gravadas no IndexedDB, de onde a tela as carrega ao abrir (como no uso real).
  await Promise.all(mensagens.map(salvarMensagem))
  render(
    <MemoryRouter initialEntries={[`/conversas/${amigo}`]}>
      <Routes>
        <Route path="/conversas" element={<LayoutConversas />}>
          <Route index element={<PainelVazio />} />
          <Route path=":pubkey" element={<Conversa />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByText('Privado')
  if (mensagens.length > 0) await screen.findByRole('list', { name: 'Mensagens' })
}

const campo = () => screen.getByRole('textbox', { name: 'Escreva uma mensagem' })
const botaoEnviar = () => screen.getByRole('button', { name: 'Enviar' })

beforeEach(async () => {
  await clear()
  useConversas.setState({ conversas: [], carregada: false })
  useMensagens.setState({ porConversa: {} })
  useSessao.setState({ fase: 'dentro', assinante: eu })
  enviarMensagem.mockClear()
  reenviarMensagem.mockClear()
})

describe('mensagens na tela', () => {
  it('mostra as mensagens com hora e o dia, as minhas e as do amigo', async () => {
    await abrir([mensagem('1', 'amigo', 'oi, tudo bem?'), mensagem('2', 'eu', 'tudo! e Platão?')])
    const lista = screen.getByRole('list', { name: 'Mensagens' })
    expect(within(lista).getByText('oi, tudo bem?')).toBeInTheDocument()
    expect(within(lista).getByText('tudo! e Platão?')).toBeInTheDocument()
    expect(within(lista).getByText('Hoje')).toBeInTheDocument()
    expect(within(lista).getAllByText(/^\d{2}:\d{2}$/)).toHaveLength(2)
  })

  it('RN-WEB-MENSAGENS-008: o selo Privado esta na tela antes de qualquer mensagem', async () => {
    await abrir([])
    expect(screen.getByText('Privado')).toBeInTheDocument()
    // A lateral tambem mostra "Nenhuma mensagem ainda" no item da conversa: olha so a coluna do meio.
    const meio = within(screen.getByTestId('coluna-conversa'))
    expect(meio.getByText('Nenhuma mensagem ainda')).toBeInTheDocument()
  })

  it('agrupa por dia: um rotulo por dia', async () => {
    const ontem = agoraS - 24 * 60 * 60
    await abrir([
      mensagem('1', 'amigo', 'de ontem', { criadoEm: ontem }),
      mensagem('2', 'amigo', 'de ontem 2', { criadoEm: ontem + 60 }),
      mensagem('3', 'eu', 'de hoje'),
    ])
    expect(screen.getAllByText('Ontem')).toHaveLength(1)
    expect(screen.getAllByText('Hoje')).toHaveLength(1)
  })

  it('RN-WEB-MENSAGENS-010: HTML aparece como texto e so http(s) vira link', async () => {
    await abrir([mensagem('1', 'amigo', '<script>alert(1)</script> https://exemplo.org')])
    expect(screen.getByRole('list', { name: 'Mensagens' })).toHaveTextContent(
      '<script>alert(1)</script> https://exemplo.org',
    )
    expect(screen.getByRole('link', { name: 'https://exemplo.org' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
    expect(document.querySelector('script')).toBeNull()
  })
})

describe('enviar', () => {
  it('Enter envia e limpa o campo', async () => {
    await abrir()
    await userEvent.type(campo(), 'oi, tudo bem?{Enter}')
    expect(enviarMensagem).toHaveBeenCalledWith(eu, amigo, 'oi, tudo bem?')
    expect(campo()).toHaveValue('')
  })

  it('Shift+Enter quebra a linha e nao envia', async () => {
    await abrir()
    await userEvent.type(campo(), 'linha 1{Shift>}{Enter}{/Shift}linha 2')
    expect(enviarMensagem).not.toHaveBeenCalled()
    expect(campo()).toHaveValue('linha 1\nlinha 2')
  })

  it('o botao Enviar tambem envia', async () => {
    await abrir()
    await userEvent.type(campo(), 'oi')
    await userEvent.click(botaoEnviar())
    expect(enviarMensagem).toHaveBeenCalledWith(eu, amigo, 'oi')
  })

  it('RN-WEB-MENSAGENS-004: vazio ou so espacos desabilita o botao e o Enter nao envia', async () => {
    await abrir()
    expect(botaoEnviar()).toBeDisabled()
    await userEvent.type(campo(), '   {Enter}')
    expect(botaoEnviar()).toBeDisabled()
    expect(enviarMensagem).not.toHaveBeenCalled()
  })

  it('RN-WEB-MENSAGENS-005: com 4.001 caracteres o contador fica vermelho e nao envia', async () => {
    await abrir()
    await userEvent.click(campo())
    await userEvent.paste('a'.repeat(4001))
    const contador = screen.getByText('4001/4000')
    expect(contador).toHaveClass('text-vermelho')
    expect(botaoEnviar()).toBeDisabled()
    await userEvent.keyboard('{Enter}')
    expect(enviarMensagem).not.toHaveBeenCalled()
  })

  it('com 4.000 caracteres ainda envia', async () => {
    await abrir()
    await userEvent.click(campo())
    await userEvent.paste('a'.repeat(4000))
    expect(screen.getByText('4000/4000')).not.toHaveClass('text-vermelho')
    expect(botaoEnviar()).toBeEnabled()
  })
})

describe('estados da mensagem', () => {
  it('enviando mostra "enviando…"', async () => {
    await abrir([mensagem('1', 'eu', 'oi', { estado: 'enviando' })])
    expect(screen.getByText('enviando…')).toBeInTheDocument()
  })

  it('falhou mostra o erro e "Tentar de novo" reenvia a mesma mensagem', async () => {
    await abrir([mensagem('abc', 'eu', 'oi', { estado: 'falhou' })])
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível enviar')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(reenviarMensagem).toHaveBeenCalledWith(eu, 'abc')
  })

  it('enviada para quem nao tem relays de DM avisa que pode nao chegar', async () => {
    await abrir([mensagem('1', 'eu', 'oi', { semRelaysDm: true })])
    expect(
      screen.getByText('Essa pessoa pode não receber se usar outro aplicativo.'),
    ).toBeInTheDocument()
  })

  it('so as minhas mensagens mostram estado', async () => {
    await abrir([mensagem('1', 'amigo', 'oi', { estado: 'falhou' })])
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })
})

describe('aviso de privacidade', () => {
  it('aparece na primeira vez, explica o que os relays veem e some depois de "Entendi"', async () => {
    await abrir()
    expect(
      await screen.findByText(
        /O conteúdo é criptografado: só você e Maria conseguem ler\. Os servidores \(relays\) só sabem que houve uma mensagem e quando/,
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(
      screen.queryByText(/O conteúdo é criptografado: só você e Maria conseguem ler/),
    ).not.toBeInTheDocument()
  })

  it('nao volta nas proximas vezes que a conversa e aberta', async () => {
    await abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Entendi' }))
    await vi.waitFor(async () => {
      const { get } = await import('idb-keyval')
      expect(await get(`voz:aviso-visto:${amigo}`)).toBe(true)
    })
    document.body.innerHTML = ''
    render(
      <MemoryRouter initialEntries={[`/conversas/${amigo}`]}>
        <Routes>
          <Route path="/conversas/:pubkey" element={<Conversa />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByText('Privado')
    await new Promise((r) => setTimeout(r, 30))
    expect(
      screen.queryByText(/O conteúdo é criptografado: só você e Maria conseguem ler/),
    ).not.toBeInTheDocument()
  })
})

describe('novas mensagens', () => {
  function simularRolagem(distanciaDoFim: number) {
    const lista = screen
      .getByRole('list', { name: 'Mensagens' })
      .closest<HTMLElement>('.overflow-y-auto')!
    Object.defineProperty(lista, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(lista, 'clientHeight', { value: 400, configurable: true })
    lista.scrollTop = 1000 - 400 - distanciaDoFim
    lista.dispatchEvent(new Event('scroll'))
    return lista
  }

  it('lendo mensagens antigas, uma nova nao puxa a tela: aparece o botao "Novas mensagens"', async () => {
    await abrir([mensagem('1', 'amigo', 'antiga')])
    const lista = simularRolagem(500)
    await act(async () => {
      await useMensagens.getState().inserir(mensagem('2', 'amigo', 'nova'))
    })
    expect(screen.getByRole('button', { name: 'Novas mensagens ↓' })).toBeInTheDocument()
    expect(lista.scrollTop).toBe(100) // continuou onde estava

    await userEvent.click(screen.getByRole('button', { name: 'Novas mensagens ↓' }))
    expect(screen.queryByRole('button', { name: 'Novas mensagens ↓' })).not.toBeInTheDocument()
  })

  it('no fim da conversa, a mensagem nova rola sozinha e nao mostra o botao', async () => {
    await abrir([mensagem('1', 'amigo', 'antiga')])
    simularRolagem(10)
    await act(async () => {
      await useMensagens.getState().inserir(mensagem('2', 'amigo', 'nova'))
    })
    expect(screen.queryByRole('button', { name: 'Novas mensagens ↓' })).not.toBeInTheDocument()
  })

  it('mensagem que EU escrevo sempre leva ao fim, mesmo lendo o historico', async () => {
    await abrir([mensagem('1', 'amigo', 'antiga')])
    simularRolagem(500)
    await act(async () => {
      await useMensagens.getState().inserir(mensagem('2', 'eu', 'minha'))
    })
    expect(screen.queryByRole('button', { name: 'Novas mensagens ↓' })).not.toBeInTheDocument()
  })

  describe('ficar no fim quando a area muda de tamanho', () => {
    let aoRedimensionar: (() => void) | undefined
    beforeEach(() => {
      aoRedimensionar = undefined
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            aoRedimensionar = callback
          }
          observe() {}
          disconnect() {}
        },
      )
    })
    afterEach(() => vi.unstubAllGlobals())

    it('quem esta no fim continua no fim (ex.: o aviso de privacidade aparece)', async () => {
      await abrir([mensagem('1', 'amigo', 'antiga')])
      const lista = simularRolagem(10)
      lista.scrollTop = 0 // a area encolheu e o conteudo "subiu"
      act(() => aoRedimensionar?.())
      expect(lista.scrollTop).toBe(1000)
    })

    it('quem esta lendo o historico nao e puxado para o fim', async () => {
      await abrir([mensagem('1', 'amigo', 'antiga')])
      const lista = simularRolagem(500)
      act(() => aoRedimensionar?.())
      expect(lista.scrollTop).toBe(100)
    })
  })
})
