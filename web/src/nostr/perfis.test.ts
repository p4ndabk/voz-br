import { finalizeEvent } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { gerarChave, pubkeyDe } from './signer/chaves'
import { limitarTexto, lerPerfil, maisRecente, nomeExibido, npubAbreviada } from './perfis'

const chave = gerarChave()
const pubkey = pubkeyDe(chave)

function kind0(conteudo: unknown, created_at = 1000, chaveAutor = chave) {
  return finalizeEvent(
    {
      kind: 0,
      created_at,
      tags: [],
      content: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo),
    },
    chaveAutor,
  )
}

describe('nomeExibido', () => {
  it('RN-WEB-PERFIL-001: display_name vence name', () => {
    const perfil = lerPerfil(kind0({ display_name: 'Maria Silva', name: 'maria' }))
    expect(nomeExibido(perfil, pubkey)).toEqual({ texto: 'Maria Silva', temNome: true })
  })

  it('RN-WEB-PERFIL-001: so name', () => {
    expect(nomeExibido(lerPerfil(kind0({ name: 'maria' })), pubkey)).toEqual({
      texto: 'maria',
      temNome: true,
    })
  })

  it('RN-WEB-PERFIL-001: sem perfil ou sem nome mostra a npub abreviada', () => {
    const esperado = { texto: npubAbreviada(pubkey), temNome: false }
    expect(nomeExibido(null, pubkey)).toEqual(esperado)
    expect(nomeExibido(undefined, pubkey)).toEqual(esperado)
    expect(nomeExibido(lerPerfil(kind0({ about: 'so bio', name: '   ' })), pubkey)).toEqual(
      esperado,
    )
  })

  it('nome longo e cortado em 40 caracteres com reticencias', () => {
    const longo = 'a'.repeat(60)
    const { texto } = nomeExibido(lerPerfil(kind0({ name: longo })), pubkey)
    expect(texto).toBe(`${'a'.repeat(40)}…`)
  })
})

describe('npubAbreviada', () => {
  it('npub1 + 8 caracteres + reticencias + 4 finais', () => {
    expect(npubAbreviada(pubkey)).toMatch(/^npub1[0-9a-z]{8}…[0-9a-z]{4}$/)
  })
})

describe('limitarTexto', () => {
  it('nao corta emoji ao meio', () => {
    expect(limitarTexto('😀😀😀', 2)).toBe('😀😀…')
  })
})

describe('lerPerfil', () => {
  it('RN-WEB-PERFIL-004: JSON invalido ou que nao e objeto vira sem perfil', () => {
    expect(lerPerfil({ content: 'isso nao e json' })).toBeNull()
    expect(lerPerfil({ content: '"texto"' })).toBeNull()
    expect(lerPerfil({ content: '[1,2]' })).toBeNull()
    expect(lerPerfil({ content: 'null' })).toBeNull()
  })

  it('ignora campos que nao sao texto', () => {
    expect(lerPerfil({ content: JSON.stringify({ name: 42, display_name: { a: 1 } }) })).toEqual({
      nomeExibicao: undefined,
      nome: undefined,
      foto: undefined,
    })
  })

  it('RN-WEB-PERFIL-008: so aceita foto http(s)', () => {
    const foto = (picture: string) => lerPerfil({ content: JSON.stringify({ picture }) })?.foto
    expect(foto('https://exemplo.org/a.png')).toBe('https://exemplo.org/a.png')
    expect(foto('javascript:alert(1)')).toBeUndefined()
    expect(foto('data:image/png;base64,AAAA')).toBeUndefined()
    expect(foto('nao e url')).toBeUndefined()
  })
})

describe('maisRecente', () => {
  it('RN-WEB-PERFIL-003: escolhe o kind 0 de created_at mais recente', () => {
    const antigo = kind0({ name: 'joao' }, 1000)
    const novo = kind0({ name: 'João P.' }, 2000)
    expect(maisRecente([antigo, novo], pubkey)).toEqual(novo)
    expect(maisRecente([novo, antigo], pubkey)).toEqual(novo)
  })

  it('descarta evento de outro autor, de outro kind e com assinatura invalida', () => {
    const outro = gerarChave()
    const deOutro = kind0({ name: 'intruso' }, 9999, outro)
    const kind1 = finalizeEvent({ kind: 1, created_at: 9999, tags: [], content: 'x' }, chave)
    // Passa por JSON como o evento que chega da rede: o nostr-tools marca com um Symbol os eventos
    // que ele mesmo ja verificou, e um spread copiaria essa marca para o evento adulterado.
    const adulterado = JSON.parse(
      JSON.stringify({ ...kind0({ name: 'bom' }, 9999), content: '{"name":"adulterado"}' }),
    )
    const valido = kind0({ name: 'maria' }, 1000)
    expect(maisRecente([deOutro, kind1, adulterado, valido, null, 'lixo'], pubkey)).toEqual(valido)
  })

  it('sem eventos validos devolve null', () => {
    expect(maisRecente([], pubkey)).toBeNull()
  })

  it('no empate de created_at vence o menor id', () => {
    const a = kind0({ name: 'a' }, 1000)
    const b = kind0({ name: 'b' }, 1000)
    const menor = a.id < b.id ? a : b
    expect(maisRecente([a, b], pubkey)).toEqual(menor)
    expect(maisRecente([b, a], pubkey)).toEqual(menor)
  })
})
