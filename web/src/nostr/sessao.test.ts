import { get } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { gerarChave, nsecDe, pubkeyDe } from './signer/chaves'
import {
  abrirSessaoComChave,
  apagarTudoDoVoz,
  conferirSenha,
  destravarSessao,
  protegerSessaoComSenha,
  trocarSenhaDaSessao,
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

describe('proteger e trocar a senha depois', () => {
  it('RN-WEB-AUTH-011: conta sem senha passa a pedir senha e a mesma identidade abre', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, undefined)
    await protegerSessaoComSenha('minhasenha1', LOGN_TESTE)
    const salva = (await lerSessaoSalva()) as Extract<SessaoSalva, { metodo: 'nsec' }>
    expect(salva.protegida).toBe(true)
    expect(salva.segredo).toMatch(/^ncryptsec1/)
    expect(salva.segredo).not.toContain(nsecDe(chave))
    expect(await restaurarSessao()).toMatchObject({ tipo: 'precisa-senha' })
    expect((await destravarSessao('minhasenha1')).pubkey).toBe(pubkeyDe(chave))
  })

  it('RN-WEB-AUTH-011: proteger uma conta que ja tem senha e recusado', async () => {
    await abrirSessaoComChave(gerarChave(), 'senha forte', LOGN_TESTE)
    await expect(protegerSessaoComSenha('outrasenha1', LOGN_TESTE)).rejects.toMatchObject({
      motivo: 'falhou',
    })
  })

  it('RN-WEB-AUTH-011: trocar exige a atual e a nova passa a valer', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, 'senha antiga', LOGN_TESTE)
    await expect(
      trocarSenhaDaSessao('errada123', 'senha nova 1', LOGN_TESTE),
    ).rejects.toMatchObject({
      motivo: 'senha-errada',
    })
    await trocarSenhaDaSessao('senha antiga', 'senha nova 1', LOGN_TESTE)
    await expect(destravarSessao('senha antiga')).rejects.toMatchObject({ motivo: 'senha-errada' })
    expect((await destravarSessao('senha nova 1')).pubkey).toBe(pubkeyDe(chave))
  })

  it('RN-WEB-AUTH-012: conferirSenha aceita a certa e recusa a errada', async () => {
    await abrirSessaoComChave(gerarChave(), 'senha forte', LOGN_TESTE)
    await expect(conferirSenha('senha forte')).resolves.toBeUndefined()
    await expect(conferirSenha('nao e')).rejects.toMatchObject({ motivo: 'senha-errada' })
  })
})
