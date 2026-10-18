import { clear, set } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilSalvo } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'
import { gerarChave, pubkeyDe } from '@/nostr/signer/chaves'
import { criarAssinanteLocal } from '@/nostr/signer/local'
import { perfilAssinado } from '@/nostr/suporteDeTeste'
import { carregarPerfilAtual, ErroSalvarPerfil, salvarPerfil } from './editar'
import type { CamposEditaveis } from './campos'

const rede = vi.hoisted(() => ({
  noRelay: [] as unknown[],
  aceitos: 2,
  publicados: [] as {
    kind: number
    created_at: number
    pubkey: string
    content: string
    tags: string[][]
  }[],
  falhaConsulta: false,
}))
vi.mock('@/nostr/relays', async (original) => ({
  ...(await original<typeof import('@/nostr/relays')>()),
  relays: {
    consultar: vi.fn(async () => {
      if (rede.falhaConsulta) throw new Error('sem rede')
      return JSON.parse(JSON.stringify(rede.noRelay))
    }),
    publicar: vi.fn(async (evento: (typeof rede.publicados)[number]) => {
      rede.publicados.push(evento)
      return { aceitos: rede.aceitos, total: 3, porRelay: {} }
    }),
  },
}))

const chave = gerarChave()
const eu = criarAssinanteLocal(chave)
const pubkey = pubkeyDe(chave)

const kind0 = (conteudo: object, created_at: number) => perfilAssinado(chave, conteudo, created_at)

const campos = (c: Partial<CamposEditaveis> = {}): CamposEditaveis => ({
  nome: '',
  sobre: '',
  foto: '',
  lightning: '',
  ...c,
})

beforeEach(async () => {
  await clear()
  rede.noRelay = []
  rede.aceitos = 2
  rede.publicados = []
  rede.falhaConsulta = false
  usePerfis.setState({ perfis: {} })
})

describe('carregarPerfilAtual', () => {
  it('RN-WEB-PERFIL-010: pega o perfil mais novo entre os relays e o cache', async () => {
    const velho = kind0({ name: 'cache velho' }, 1000)
    await set(`voz:perfil:${pubkey}`, {
      evento: velho,
      buscadoEm: Date.now(),
    } satisfies PerfilSalvo)
    rede.noRelay = [kind0({ name: 'relay novo', banner: 'https://x.org/b.png' }, 2000)]

    const atual = await carregarPerfilAtual(pubkey)
    expect(atual).toMatchObject({ encontrado: true, criadoEm: 2000 })
    expect(atual.conteudo).toMatchObject({ name: 'relay novo', banner: 'https://x.org/b.png' })
  })

  it('o cache mais novo vence um relay atrasado', async () => {
    await set(`voz:perfil:${pubkey}`, { evento: kind0({ name: 'cache novo' }, 3000), buscadoEm: 1 })
    rede.noRelay = [kind0({ name: 'relay atrasado' }, 1000)]
    expect((await carregarPerfilAtual(pubkey)).conteudo.name).toBe('cache novo')
  })

  it('sem rede, usa o cache', async () => {
    await set(`voz:perfil:${pubkey}`, { evento: kind0({ name: 'so cache' }, 1000), buscadoEm: 1 })
    rede.falhaConsulta = true
    expect(await carregarPerfilAtual(pubkey)).toMatchObject({ encontrado: true })
  })

  it('RN-WEB-PERFIL-010: sem perfil em lugar nenhum, informa que nao encontrou', async () => {
    expect(await carregarPerfilAtual(pubkey)).toEqual({
      conteudo: {},
      criadoEm: 0,
      encontrado: false,
    })
  })

  it('perfil com content que nao e objeto JSON vira conteudo vazio (mas encontrado)', async () => {
    rede.noRelay = [perfilAssinado(chave, 'isso nao e json', 5)]
    expect(await carregarPerfilAtual(pubkey)).toMatchObject({ encontrado: true, conteudo: {} })
  })

  it('ignora kind 0 de outro autor ou adulterado', async () => {
    rede.noRelay = [perfilAssinado(gerarChave(), { name: 'intruso' }, 9999)]
    expect((await carregarPerfilAtual(pubkey)).encontrado).toBe(false)
  })
})

describe('salvarPerfil', () => {
  const atual = {
    conteudo: { name: 'maria', banner: 'https://x.org/b.png', nip05: 'maria@maria.org' },
    criadoEm: 5000,
    encontrado: true,
  }

  it('publica um kind 0 assinado por mim, com o novo conteudo e os campos antigos preservados', async () => {
    const r = await salvarPerfil(
      eu,
      atual,
      campos({
        nome: 'Maria Silva',
        foto: 'https://x.org/nova.png',
        lightning: 'Maria@GetAlby.com',
      }),
      9000,
    )
    expect(r).toMatchObject({ aceitos: 2, total: 3 })
    // devolve o perfil publicado, para a tela continuar editando em cima dele
    expect(r.publicado).toMatchObject({ encontrado: true, criadoEm: 9000 })
    expect(r.publicado.conteudo).toMatchObject({
      display_name: 'Maria Silva',
      banner: 'https://x.org/b.png',
    })
    expect(rede.publicados).toHaveLength(1)
    const evento = rede.publicados[0]!
    expect(evento).toMatchObject({ kind: 0, pubkey, created_at: 9000, tags: [] })
    expect(JSON.parse(evento.content)).toEqual({
      name: 'maria',
      display_name: 'Maria Silva',
      banner: 'https://x.org/b.png',
      nip05: 'maria@maria.org',
      picture: 'https://x.org/nova.png',
      lud16: 'maria@getalby.com',
    })
  })

  it('o created_at e sempre mais novo que o perfil substituido (mesmo com relogio atrasado)', async () => {
    await salvarPerfil(eu, atual, campos({ nome: 'X' }), 100)
    expect(rede.publicados[0]!.created_at).toBe(5001)
  })

  it('RN-WEB-PERFIL-013: ao salvar, a tela e o cache passam a mostrar o perfil novo', async () => {
    await salvarPerfil(
      eu,
      atual,
      campos({ nome: 'Maria Silva', lightning: 'maria@getalby.com' }),
      9000,
    )
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({
      nomeExibicao: 'Maria Silva',
      lightning: 'maria@getalby.com',
    })
    const atualizado = await carregarPerfilAtual(pubkey)
    expect(atualizado.conteudo.display_name).toBe('Maria Silva')
  })

  it('RN-WEB-PERFIL-013: nenhum relay aceitou: erro, e nada muda na tela nem no cache', async () => {
    rede.aceitos = 0
    await expect(salvarPerfil(eu, atual, campos({ nome: 'Novo' }), 9000)).rejects.toMatchObject({
      motivo: 'nenhum-relay',
    })
    expect(usePerfis.getState().perfis[pubkey]).toBeUndefined()
    expect((await carregarPerfilAtual(pubkey)).encontrado).toBe(false)
  })

  it('campos invalidos nao chegam a ser assinados nem publicados', async () => {
    const assinar = vi.spyOn(eu, 'assinar')
    for (const ruim of [
      campos({ lightning: 'maria@localhost' }),
      campos({ foto: 'http://inseguro.org/a.png' }),
      campos({ nome: 'a'.repeat(41) }),
    ]) {
      await expect(salvarPerfil(eu, atual, ruim)).rejects.toBeInstanceOf(ErroSalvarPerfil)
    }
    expect(assinar).not.toHaveBeenCalled()
    expect(rede.publicados).toHaveLength(0)
  })
})
