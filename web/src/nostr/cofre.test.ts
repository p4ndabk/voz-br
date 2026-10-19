import { entries, get } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  abrirCofre,
  cifrarTudoQueFaltar,
  cofreAberto,
  fecharCofre,
  gravarCofre,
  lerCofre,
  listarCofre,
} from './cofre'
import { gerarChave } from './signer/chaves'
import {
  abrirSessaoComChave,
  apagarTudoDoVoz,
  destravarSessao,
  protegerSessaoComSenha,
} from './sessao'

const LOGN_TESTE = 10
const msg = { id: 'm1', texto: 'SEGREDO-do-historico-123' }
const todoOIndexedDb = async () => JSON.stringify(await entries())

beforeEach(async () => {
  await apagarTudoDoVoz()
})

describe('cofre (RN-WEB-PRIVACIDADE-007)', () => {
  it('RN-WEB-PRIVACIDADE-007: sem cofre aberto, o dado fica em texto (conta sem senha)', async () => {
    await gravarCofre('voz:msg:m1', msg)
    expect(await get('voz:msg:m1')).toEqual(msg)
    expect(await lerCofre('voz:msg:m1')).toEqual(msg)
  })

  it('RN-WEB-PRIVACIDADE-007: com cofre aberto, o texto nunca aparece no armazenamento', async () => {
    await abrirCofre(gerarChave())
    await gravarCofre('voz:msg:m1', msg)
    expect(await todoOIndexedDb()).not.toContain('SEGREDO')
    expect(await lerCofre('voz:msg:m1')).toEqual(msg)
    expect(await listarCofre('voz:msg:')).toEqual([msg])
  })

  it('RN-WEB-PRIVACIDADE-007: cofre fechado ou chave de outra conta nao abre o dado', async () => {
    await abrirCofre(gerarChave())
    await gravarCofre('voz:msg:m1', msg)
    fecharCofre()
    expect(cofreAberto()).toBe(false)
    expect(await lerCofre('voz:msg:m1')).toBeUndefined()
    expect(await listarCofre('voz:msg:')).toEqual([])
    await abrirCofre(gerarChave())
    expect(await lerCofre('voz:msg:m1')).toBeUndefined()
  })

  it('RN-WEB-PRIVACIDADE-007: cifra o que ja estava em texto, so as chaves sensiveis, e repete sem estragar', async () => {
    await gravarCofre('voz:msg:m1', msg)
    await gravarCofre('voz:perfil:x', { nome: 'publico' })
    await abrirCofre(gerarChave())
    expect(await cifrarTudoQueFaltar()).toBe(1)
    expect(await cifrarTudoQueFaltar()).toBe(0)
    const tudo = await todoOIndexedDb()
    expect(tudo).not.toContain('SEGREDO')
    expect(tudo).toContain('publico') // perfil e cache de dado publico
    expect(await lerCofre('voz:msg:m1')).toEqual(msg)
  })
})

describe('cofre e senha da conta (RN-WEB-PRIVACIDADE-007)', () => {
  it('RN-WEB-PRIVACIDADE-007: conta criada com senha cifra o historico; destravar de novo reabre', async () => {
    const chave = gerarChave()
    await abrirSessaoComChave(chave, 'senha forte', LOGN_TESTE)
    await gravarCofre('voz:msg:m1', msg)
    expect(await todoOIndexedDb()).not.toContain('SEGREDO')
    fecharCofre() // recarregou a pagina
    expect(await lerCofre('voz:msg:m1')).toBeUndefined()
    await destravarSessao('senha forte')
    expect(await lerCofre('voz:msg:m1')).toEqual(msg)
  })

  it('RN-WEB-PRIVACIDADE-007: proteger com senha uma conta que estava sem cifra o que ja existia', async () => {
    await abrirSessaoComChave(gerarChave(), undefined, LOGN_TESTE)
    await gravarCofre('voz:msg:m1', msg)
    expect(await todoOIndexedDb()).toContain('SEGREDO')
    await protegerSessaoComSenha('senha forte', LOGN_TESTE)
    expect(await todoOIndexedDb()).not.toContain('SEGREDO')
    expect(await lerCofre('voz:msg:m1')).toEqual(msg)
  })

  it('RN-WEB-PRIVACIDADE-007: sair apaga tudo e fecha o cofre', async () => {
    await abrirCofre(gerarChave())
    await apagarTudoDoVoz()
    expect(cofreAberto()).toBe(false)
    expect(await entries()).toEqual([])
  })
})
