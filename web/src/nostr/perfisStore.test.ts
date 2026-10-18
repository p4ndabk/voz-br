import { clear, get, set } from 'idb-keyval'
import { finalizeEvent } from 'nostr-tools'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VALIDADE_CACHE_MS, type PerfilSalvo } from './perfis'
import { usePerfis } from './perfisStore'
import { gerarChave, pubkeyDe } from './signer/chaves'

const consultar = vi.hoisted(() => vi.fn())
vi.mock('./relays', () => ({ relays: { consultar } }))

const chave = gerarChave()
const pubkey = pubkeyDe(chave)
const evento = (name: string, created_at: number) =>
  finalizeEvent({ kind: 0, created_at, tags: [], content: JSON.stringify({ name }) }, chave)

beforeEach(async () => {
  await clear()
  consultar.mockReset()
  usePerfis.setState({ perfis: {} })
})

describe('perfisStore', () => {
  it('busca nos relays, guarda no estado e grava o cache', async () => {
    consultar.mockResolvedValue([evento('maria', 1000)])
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({ nome: 'maria' })
    expect((await get<PerfilSalvo>(`voz:perfil:${pubkey}`))?.evento.content).toContain('maria')
  })

  it('pessoa sem perfil em nenhum relay vira null (e nao grava cache)', async () => {
    consultar.mockResolvedValue([])
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toBeNull()
    expect(await get(`voz:perfil:${pubkey}`)).toBeUndefined()
  })

  it('RN-WEB-PERFIL-007: cache de 2 h aparece na hora e nao consulta os relays', async () => {
    const salvo: PerfilSalvo = {
      evento: evento('maria', 1000),
      buscadoEm: Date.now() - 2 * 60 * 60 * 1000,
    }
    await set(`voz:perfil:${pubkey}`, salvo)
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({ nome: 'maria' })
    expect(consultar).not.toHaveBeenCalled()
  })

  it('RN-WEB-PERFIL-007: cache velho aparece e e atualizado em segundo plano', async () => {
    const salvo: PerfilSalvo = {
      evento: evento('maria', 1000),
      buscadoEm: Date.now() - VALIDADE_CACHE_MS - 1,
    }
    await set(`voz:perfil:${pubkey}`, salvo)
    consultar.mockResolvedValue([evento('Maria Silva', 2000)])
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({ nome: 'Maria Silva' })
    expect((await get<PerfilSalvo>(`voz:perfil:${pubkey}`))?.evento.created_at).toBe(2000)
  })

  it('relay atrasado com perfil mais antigo nao sobrescreve o cache mais novo', async () => {
    const salvo: PerfilSalvo = {
      evento: evento('novo', 2000),
      buscadoEm: Date.now() - VALIDADE_CACHE_MS - 1,
    }
    await set(`voz:perfil:${pubkey}`, salvo)
    consultar.mockResolvedValue([evento('velho', 1000)])
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({ nome: 'novo' })
  })

  it('sem internet mantem o perfil do cache', async () => {
    const salvo: PerfilSalvo = {
      evento: evento('maria', 1000),
      buscadoEm: Date.now() - VALIDADE_CACHE_MS - 1,
    }
    await set(`voz:perfil:${pubkey}`, salvo)
    consultar.mockRejectedValue(new Error('sem rede'))
    await usePerfis.getState().carregar(pubkey)
    expect(usePerfis.getState().perfis[pubkey]).toMatchObject({ nome: 'maria' })
  })

  it('chamadas simultaneas para a mesma pessoa fazem uma consulta so', async () => {
    consultar.mockResolvedValue([evento('maria', 1000)])
    await Promise.all([
      usePerfis.getState().carregar(pubkey),
      usePerfis.getState().carregar(pubkey),
    ])
    expect(consultar).toHaveBeenCalledOnce()
  })
})
