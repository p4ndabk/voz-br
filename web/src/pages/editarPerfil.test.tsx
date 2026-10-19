import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePerfis } from '@/nostr/perfisStore'
import { gerarChave } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { perfilAssinado } from '@/nostr/suporteDeTeste'
import { useSessao } from '@/nostr/useSessao'
import type { ResultadoLightning } from '@/perfil/lightning'
import { EditarPerfil } from './EditarPerfil'

const rede = vi.hoisted(() => ({
  noRelay: [] as unknown[],
  aceitos: 3,
  publicados: [] as { content: string; created_at: number; kind: number }[],
}))
vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    consultar: vi.fn(async () => JSON.parse(JSON.stringify(rede.noRelay))),
    publicar: vi.fn(async (evento: (typeof rede.publicados)[number]) => {
      rede.publicados.push(evento)
      return { aceitos: rede.aceitos, total: 3, porRelay: {} }
    }),
  },
}))
const verificar = vi.hoisted(() => vi.fn())
vi.mock('@/perfil/lightning', () => ({ verificarEnderecoLightning: verificar }))
vi.mock('@/nostr/usePerfil', () => ({ usePerfil: () => null }))

const chave = gerarChave()
const eu = criarAssinanteLocal(chave)

const perfilExistente = {
  name: 'maria',
  display_name: 'Maria',
  about: 'bio antiga',
  picture: 'https://exemplo.org/maria.png',
  lud16: 'maria@getalby.com',
  banner: 'https://exemplo.org/banner.png',
  nip05: 'maria@maria.org',
}

async function abrir(existente: object | null = perfilExistente, secao?: 'perfil' | 'carteira') {
  rede.noRelay = existente ? [perfilAssinado(chave, existente, 1000)] : []
  render(
    <MemoryRouter initialEntries={['/configuracoes/perfil']}>
      <Routes>
        <Route path="/configuracoes/perfil" element={<EditarPerfil secao={secao} />} />
        <Route path="/configuracoes/conta" element={<p>tela da conta</p>} />
      </Routes>
    </MemoryRouter>,
  )
  // Na secao Carteira nao ha o campo Nome: espera pelo que existe em cada tela.
  await screen.findByLabelText(secao === 'carteira' ? 'Endereço Lightning' : 'Nome')
}

const salvar = () => screen.getByRole('button', { name: /^Salvar (perfil|carteira)$/ })
const campo = (nome: string | RegExp) => screen.getByLabelText(nome)
const limparEEscrever = async (rotulo: string | RegExp, texto: string) => {
  await userEvent.clear(campo(rotulo))
  if (texto) await userEvent.type(campo(rotulo), texto)
}
const publicado = () => JSON.parse(rede.publicados[0]!.content) as Record<string, unknown>

beforeEach(async () => {
  await clear()
  usePerfis.setState({ perfis: {} })
  useSessao.setState({ fase: 'dentro', assinante: eu })
  rede.aceitos = 3
  rede.publicados = []
  verificar.mockReset()
})

describe('editar perfil', () => {
  it('RN-WEB-PERFIL-010: carrega o perfil atual dos relays nos campos', async () => {
    await abrir()
    expect(campo('Nome')).toHaveValue('Maria')
    expect(campo('Sobre você')).toHaveValue('bio antiga')
    expect(campo(/Foto/)).toHaveValue('https://exemplo.org/maria.png')
    expect(campo('Endereço Lightning')).toHaveValue('maria@getalby.com')
  })

  it('o botao Salvar so habilita depois de uma mudanca', async () => {
    await abrir()
    expect(salvar()).toBeDisabled()
    await userEvent.type(campo('Nome'), ' Silva')
    expect(salvar()).toBeEnabled()
    await limparEEscrever('Nome', 'Maria')
    expect(salvar()).toBeDisabled() // voltou ao original
  })

  it('RN-WEB-PERFIL-009 e 013: salva o nome novo preservando o resto e mostra em quantos relays saiu', async () => {
    await abrir()
    await limparEEscrever('Nome', 'Maria Silva')
    await userEvent.click(salvar())

    expect(await screen.findByText('Perfil publicado em 3 de 3 relays.')).toBeInTheDocument()
    expect(rede.publicados).toHaveLength(1)
    expect(rede.publicados[0]).toMatchObject({ kind: 0 })
    expect(publicado()).toEqual({
      ...perfilExistente,
      display_name: 'Maria Silva',
    })
    expect(rede.publicados[0]!.created_at).toBeGreaterThan(1000)
    expect(salvar()).toBeDisabled() // nada mais a salvar
  })

  it('troca a foto e o endereco lightning (normalizado) de uma vez', async () => {
    await abrir()
    await limparEEscrever(/Foto/, 'https://exemplo.org/nova.png')
    await limparEEscrever('Endereço Lightning', 'Maria@GetAlby.com')
    await userEvent.click(salvar())
    await screen.findByText(/Perfil publicado/)
    expect(publicado()).toMatchObject({
      picture: 'https://exemplo.org/nova.png',
      lud16: 'maria@getalby.com',
    })
  })

  it('esvaziar o endereco lightning o remove do perfil, e o banner continua', async () => {
    await abrir()
    await limparEEscrever('Endereço Lightning', '')
    await userEvent.click(salvar())
    await screen.findByText(/Perfil publicado/)
    expect('lud16' in publicado()).toBe(false)
    expect(publicado().banner).toBe('https://exemplo.org/banner.png')
  })

  it('RN-WEB-PERFIL-010: conta sem perfil avisa antes de salvar, mas deixa criar', async () => {
    await abrir(null)
    expect(screen.getByText(/Não encontramos um perfil seu nos relays/)).toBeInTheDocument()
    await userEvent.type(campo('Nome'), 'Nova')
    await userEvent.click(salvar())
    await screen.findByText(/Perfil publicado/)
    expect(publicado()).toMatchObject({ display_name: 'Nova', name: 'Nova' })
  })

  it('com perfil encontrado, nao mostra o aviso de "nao encontramos"', async () => {
    await abrir()
    expect(screen.queryByText(/Não encontramos um perfil seu/)).not.toBeInTheDocument()
  })

  it('RN-WEB-PERFIL-013: nenhum relay aceitou: mostra o erro e deixa tentar de novo', async () => {
    rede.aceitos = 0
    await abrir()
    await limparEEscrever('Nome', 'Outro')
    await userEvent.click(salvar())
    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhum relay aceitou o perfil')
    expect(campo('Nome')).toHaveValue('Outro') // o texto digitado continua
    expect(salvar()).toBeEnabled()
    expect(usePerfis.getState().perfis[eu.pubkey]).toBeUndefined()
  })

  describe('validacao', () => {
    it('RN-WEB-PERFIL-012: endereco lightning invalido mostra o erro e impede salvar', async () => {
      await abrir()
      await limparEEscrever('Endereço Lightning', 'maria@localhost')
      expect(screen.getByText('Use o formato usuario@dominio.com')).toBeInTheDocument()
      expect(salvar()).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Verificar endereço' })).toBeDisabled()
    })

    it('RN-WEB-PERFIL-011: foto que nao e https mostra o erro e impede salvar', async () => {
      await abrir()
      await limparEEscrever(/Foto/, 'http://exemplo.org/a.png')
      expect(screen.getByText('Use um endereço que comece com https://')).toBeInTheDocument()
      expect(salvar()).toBeDisabled()
    })

    it('RN-WEB-PERFIL-014: nome com mais de 40 caracteres e recusado', async () => {
      await abrir()
      await limparEEscrever('Nome', 'a'.repeat(41))
      expect(screen.getByText('Use no máximo 40 caracteres.')).toBeInTheDocument()
      expect(salvar()).toBeDisabled()
    })

    it('RN-WEB-PERFIL-014: o sobre aceita 300 e recusa 301', async () => {
      await abrir()
      await userEvent.click(campo('Sobre você'))
      await userEvent.clear(campo('Sobre você'))
      await userEvent.paste('a'.repeat(300))
      expect(salvar()).toBeEnabled()
      await userEvent.paste('a')
      expect(screen.getByText('Use no máximo 300 caracteres.')).toBeInTheDocument()
      expect(salvar()).toBeDisabled()
    })
  })

  describe('previa da foto', () => {
    it('RN-WEB-PERFIL-008: mostra a imagem sem enviar referrer', async () => {
      await abrir()
      const img = screen.getByAltText('Pré-visualização da foto')
      expect(img).toHaveAttribute('src', 'https://exemplo.org/maria.png')
      expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    })

    it('imagem que nao carrega mostra um aviso e volta ao avatar gerado', async () => {
      await abrir()
      fireEvent.error(screen.getByAltText('Pré-visualização da foto'))
      expect(await screen.findByText('Não foi possível carregar essa imagem.')).toBeInTheDocument()
      expect(screen.queryByAltText('Pré-visualização da foto')).not.toBeInTheDocument()
    })

    it('sem endereco valido nao tenta carregar imagem nenhuma', async () => {
      await abrir()
      await limparEEscrever(/Foto/, 'javascript:alert(1)')
      expect(screen.queryByAltText('Pré-visualização da foto')).not.toBeInTheDocument()
    })
  })

  describe('verificar endereco lightning', () => {
    const ok = (aceitaZap: boolean): ResultadoLightning => ({
      ok: true,
      minSats: 1,
      maxSats: 500000,
      aceitaZap,
    })

    it('RN-WEB-PERFIL-012: so consulta o servidor quando a pessoa pede, e avisa sobre o IP', async () => {
      await abrir()
      expect(verificar).not.toHaveBeenCalled()
      expect(
        screen.getByText(/o servidor do endereço, que fica sabendo o seu IP/),
      ).toBeInTheDocument()
    })

    it('endereco que aceita zap', async () => {
      verificar.mockResolvedValue(ok(true))
      await abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Verificar endereço' }))
      expect(
        await screen.findByText('Endereço encontrado. Aceita de 1 a 500000 sats.'),
      ).toBeInTheDocument()
      expect(screen.getByText('Aceita zaps (gorjetas pelo Nostr).')).toBeInTheDocument()
      expect(verificar).toHaveBeenCalledWith('maria@getalby.com')
    })

    it('endereco que recebe pagamento mas nao declara zap', async () => {
      verificar.mockResolvedValue(ok(false))
      await abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Verificar endereço' }))
      expect(await screen.findByText(/não declara suporte a zaps/)).toBeInTheDocument()
    })

    it('servico fora do ar nao prova que o endereco esta errado e nao impede salvar', async () => {
      verificar.mockResolvedValue({ ok: false, motivo: 'indisponivel' })
      await abrir()
      await limparEEscrever('Nome', 'Maria S')
      await userEvent.click(screen.getByRole('button', { name: 'Verificar endereço' }))
      expect(
        await screen.findByText(/Isso não significa que o endereço esteja errado/),
      ).toBeInTheDocument()
      expect(salvar()).toBeEnabled()
    })

    it('servico que nao reconhece o endereco diz isso, mas tambem nao bloqueia', async () => {
      verificar.mockResolvedValue({ ok: false, motivo: 'invalido' })
      await abrir()
      await limparEEscrever('Nome', 'Maria S')
      await userEvent.click(screen.getByRole('button', { name: 'Verificar endereço' }))
      expect(await screen.findByText('O serviço não reconheceu esse endereço.')).toBeInTheDocument()
      expect(salvar()).toBeEnabled()
    })

    it('mudar o endereco limpa o resultado antigo', async () => {
      verificar.mockResolvedValue(ok(true))
      await abrir()
      await userEvent.click(screen.getByRole('button', { name: 'Verificar endereço' }))
      await screen.findByText(/Endereço encontrado/)
      await userEvent.type(campo('Endereço Lightning'), 'x')
      expect(screen.queryByText(/Endereço encontrado/)).not.toBeInTheDocument()
    })
  })

  describe('secoes das configuracoes (RN-WEB-LAYOUT-008)', () => {
    it('Perfil mostra nome, sobre e foto, sem o endereco Lightning', async () => {
      await abrir(perfilExistente, 'perfil')
      expect(campo('Nome')).toBeInTheDocument()
      expect(campo('Sobre você')).toBeInTheDocument()
      expect(campo(/Foto/)).toBeInTheDocument()
      expect(screen.queryByLabelText('Endereço Lightning')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Editar perfil' })).toBeInTheDocument()
    })

    it('Carteira mostra so o endereco Lightning, com a explicacao de receber e de pagar', async () => {
      await abrir(perfilExistente, 'carteira')
      expect(campo('Endereço Lightning')).toHaveValue('maria@getalby.com')
      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Foto/)).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Carteira' })).toBeInTheDocument()
      expect(screen.getByText(/por onde você recebe bitcoin/)).toBeInTheDocument()
      expect(screen.getByText(/nunca guarda chave de pagamento/)).toBeInTheDocument()
    })

    it('RN-WEB-PERFIL-010: trocar o endereco pela Carteira publica o perfil sem perder nome, sobre, foto nem o banner', async () => {
      await abrir(perfilExistente, 'carteira')
      await limparEEscrever('Endereço Lightning', 'nova@getalby.com')
      await userEvent.click(salvar())
      await screen.findByText(/Perfil publicado/)
      expect(publicado()).toEqual({ ...perfilExistente, lud16: 'nova@getalby.com' })
    })

    it('RN-WEB-PERFIL-010: salvar o Perfil nao mexe no endereco Lightning', async () => {
      await abrir(perfilExistente, 'perfil')
      await limparEEscrever('Nome', 'Maria Nova')
      await userEvent.click(salvar())
      await screen.findByText(/Perfil publicado/)
      expect(publicado()).toEqual({ ...perfilExistente, display_name: 'Maria Nova' })
    })

    it('a seta de voltar so aparece no celular nas secoes (e nao existe o link antigo de voltar)', async () => {
      await abrir(perfilExistente, 'perfil')
      expect(screen.getByRole('link', { name: 'Voltar' })).toHaveClass('md:hidden')
      expect(screen.queryByRole('link', { name: 'Voltar à conta' })).not.toBeInTheDocument()
    })
  })
})
