import { describe, expect, it } from 'vitest'
import {
  iguais,
  lerCampos,
  LIMITE_FOTO,
  LIMITE_NOME,
  LIMITE_SOBRE,
  mesclarPerfil,
  normalizarCampos,
  temErros,
  validarCampos,
  type CamposEditaveis,
} from './campos'

const vazios: CamposEditaveis = { nome: '', sobre: '', foto: '', lightning: '' }
const com = (c: Partial<CamposEditaveis>): CamposEditaveis => ({ ...vazios, ...c })

describe('lerCampos', () => {
  it('le nome (display_name antes de name), sobre, foto e lightning', () => {
    expect(
      lerCampos({
        display_name: 'Maria Silva',
        name: 'maria',
        about: 'oi',
        picture: 'https://x.org/a.png',
        lud16: 'm@getalby.com',
      }),
    ).toEqual({
      nome: 'Maria Silva',
      sobre: 'oi',
      foto: 'https://x.org/a.png',
      lightning: 'm@getalby.com',
    })
    expect(lerCampos({ name: 'maria' }).nome).toBe('maria')
  })

  it('perfil vazio ou com campos de tipo errado vira campos vazios', () => {
    expect(lerCampos({})).toEqual(vazios)
    expect(lerCampos({ name: 5, about: ['x'], picture: null, lud16: {} })).toEqual(vazios)
  })
})

describe('validarCampos', () => {
  it('campos vazios sao validos (removem o campo)', () => {
    expect(validarCampos(vazios)).toEqual({})
  })

  it('RN-WEB-PERFIL-014: limites de nome e sobre', () => {
    expect(validarCampos(com({ nome: 'a'.repeat(LIMITE_NOME) }))).toEqual({})
    expect(validarCampos(com({ nome: 'a'.repeat(LIMITE_NOME + 1) }))).toEqual({ nome: 'longo' })
    expect(validarCampos(com({ sobre: 'a'.repeat(LIMITE_SOBRE) }))).toEqual({})
    expect(validarCampos(com({ sobre: 'a'.repeat(LIMITE_SOBRE + 1) }))).toEqual({ sobre: 'longo' })
  })

  it('espacos nas pontas nao contam para o limite', () => {
    expect(validarCampos(com({ nome: `  ${'a'.repeat(LIMITE_NOME)}  ` }))).toEqual({})
  })

  it('RN-WEB-PERFIL-011: foto so https (http, javascript, data e texto solto sao recusados)', () => {
    expect(validarCampos(com({ foto: 'https://exemplo.org/a.png' }))).toEqual({})
    for (const ruim of [
      'http://exemplo.org/a.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'minha foto',
      'ftp://x.org/a.png',
    ]) {
      expect(validarCampos(com({ foto: ruim })), ruim).toEqual({ foto: 'invalido' })
    }
    expect(validarCampos(com({ foto: `https://x.org/${'a'.repeat(LIMITE_FOTO)}` }))).toEqual({
      foto: 'longo',
    })
  })

  it('RN-WEB-PERFIL-012: lightning precisa ser usuario@dominio.tld', () => {
    expect(validarCampos(com({ lightning: 'maria@getalby.com' }))).toEqual({})
    expect(validarCampos(com({ lightning: 'maria@localhost' }))).toEqual({ lightning: 'invalido' })
    expect(temErros(validarCampos(com({ lightning: 'x' })))).toBe(true)
  })
})

describe('mesclarPerfil', () => {
  const atual = {
    name: 'maria',
    display_name: 'Maria',
    about: 'bio antiga',
    picture: 'https://x.org/velha.png',
    banner: 'https://x.org/banner.png',
    website: 'https://maria.org',
    nip05: 'maria@maria.org',
    lud06: 'lnurl1abc',
    campo_de_outro_app: { aninhado: [1, 2, 3] },
  }

  it('RN-WEB-PERFIL-009: preserva tudo que o Voz nao edita', () => {
    const novo = mesclarPerfil(atual, com({ nome: 'Maria Silva', foto: 'https://x.org/nova.png' }))
    expect(novo).toMatchObject({
      banner: 'https://x.org/banner.png',
      website: 'https://maria.org',
      nip05: 'maria@maria.org',
      lud06: 'lnurl1abc',
      campo_de_outro_app: { aninhado: [1, 2, 3] },
    })
    expect(novo.display_name).toBe('Maria Silva')
    expect(novo.picture).toBe('https://x.org/nova.png')
  })

  it('nao muda o "name" (handle) que ja existe', () => {
    expect(mesclarPerfil(atual, com({ nome: 'Outro Nome' })).name).toBe('maria')
  })

  it('sem "name" anterior, usa o nome novo tambem como name (clientes antigos so leem name)', () => {
    expect(mesclarPerfil({}, com({ nome: 'Maria' }))).toMatchObject({
      name: 'Maria',
      display_name: 'Maria',
    })
  })

  it('campo esvaziado e removido do perfil; os demais ficam', () => {
    const novo = mesclarPerfil(atual, com({ nome: 'Maria' }))
    expect('about' in novo).toBe(false)
    expect('picture' in novo).toBe(false)
    expect('lud16' in novo).toBe(false)
    expect(novo.banner).toBe('https://x.org/banner.png')
  })

  it('grava o endereco lightning normalizado e tira espacos', () => {
    const novo = mesclarPerfil(
      {},
      com({ lightning: ' lightning:Maria@GetAlby.com ', sobre: '  oi  ' }),
    )
    expect(novo).toMatchObject({ lud16: 'maria@getalby.com', about: 'oi' })
  })

  it('nao altera o objeto original', () => {
    const copia = JSON.parse(JSON.stringify(atual))
    mesclarPerfil(atual, com({ nome: 'X' }))
    expect(atual).toEqual(copia)
  })
})

describe('iguais e normalizarCampos', () => {
  it('ignora espacos nas pontas e caixa do endereco lightning', () => {
    expect(
      iguais(
        com({ nome: 'Maria', lightning: 'maria@getalby.com' }),
        com({ nome: ' Maria ', lightning: ' Maria@GetAlby.com' }),
      ),
    ).toBe(true)
    expect(iguais(com({ nome: 'Maria' }), com({ nome: 'Joana' }))).toBe(false)
    expect(normalizarCampos(com({ lightning: '   ' })).lightning).toBe('')
  })
})
