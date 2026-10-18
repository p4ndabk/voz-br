import { get } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { gerarChave, nsecDe, pubkeyDe } from './signer/chaves'
import {
  abrirSessaoComChave,
  apagarTudoDoVoz,
  destravarSessao,
  lerSessaoSalva,
  restaurarSessao,
  type SessaoSalva,
} from './sessao'

// logn baixo so nos testes: o scrypt de producao (2^16) leva ~1 s por chamada.
const LOGN_TESTE = 10

beforeEach(async () => {
  await apagarTudoDoVoz()
})

describe('sessao por nsec', () => {
  it('RN-WEB-AUTH-001: com senha, a nsec nunca fica em claro no armazenamento', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, 'senha forte', LOGN_TESTE)
    const salva = await lerSessaoSalva()
    expect(salva).toMatchObject({ metodo: 'nsec', protegida: true })
    expect(JSON.stringify(salva)).not.toContain(nsecDe(chave))
    expect((salva as Extract<SessaoSalva, { metodo: 'nsec' }>).segredo).toMatch(/^ncryptsec1/)
  })

  it('ao reabrir, sessao protegida pede senha e a senha certa devolve a mesma identidade', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, 'senha forte', LOGN_TESTE)
    const restauracao = await restaurarSessao()
    expect(restauracao).toEqual({ tipo: 'precisa-senha', pubkey: pubkeyDe(chave) })
    const assinante = await destravarSessao('senha forte')
    expect(assinante.pubkey).toBe(pubkeyDe(chave))
  })

  it('senha errada nao destrava', async () => {
    await abrirSessaoComChave(gerarChave(), 'senha forte', LOGN_TESTE)
    await expect(destravarSessao('outra senha')).rejects.toMatchObject({ motivo: 'senha-errada' })
  })

  it('sem senha, a sessao volta pronta ao reabrir', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, undefined)
    const restauracao = await restaurarSessao()
    expect(restauracao.tipo).toBe('pronta')
    if (restauracao.tipo === 'pronta') expect(restauracao.assinante.pubkey).toBe(pubkeyDe(chave))
  })

  it('sem nada guardado, nao ha sessao', async () => {
    expect(await restaurarSessao()).toEqual({ tipo: 'nenhuma' })
  })

  it('RN-WEB-AUTH-008: apagar tudo remove sessao e qualquer outra chave do Voz', async () => {
    await abrirSessaoComChave(gerarChave(), undefined)
    const { set } = await import('idb-keyval')
    await set('voz:outro', 'qualquer coisa')
    await apagarTudoDoVoz()
    expect(await lerSessaoSalva()).toBeUndefined()
    expect(await get('voz:outro')).toBeUndefined()
  })
})
