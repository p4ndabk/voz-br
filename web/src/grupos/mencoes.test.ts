import { describe, expect, it } from 'vitest'
import {
  aplicarMencao,
  consultaDeMencao,
  mencoesValidas,
  partirPorMencoes,
  sugerir,
} from './mencoes'

const pk = (n: number) => n.toString(16).padStart(64, '0')
const MARIA = pk(1)
const JOAO = pk(2)
const membros = [
  { pubkey: MARIA, nome: 'Maria Silva' },
  { pubkey: JOAO, nome: 'João' },
]

describe('marcar alguem (RN-WEB-GRUPOS-016)', () => {
  it('RN-WEB-GRUPOS-016: o @ digitado no comeco ou depois de espaco abre a busca', () => {
    expect(consultaDeMencao('@', 1)).toEqual({ inicio: 0, consulta: '' })
    expect(consultaDeMencao('oi @ma', 6)).toEqual({ inicio: 3, consulta: 'ma' })
    expect(consultaDeMencao('oi @maria silva', 15)).toBeNull() // espaco depois do nome encerra a busca
    expect(consultaDeMencao('email@x', 7)).toBeNull() // @ colado numa palavra nao e marcacao
    expect(consultaDeMencao('oi', 2)).toBeNull()
  })

  it('RN-WEB-GRUPOS-016: sugere por qualquer parte do nome, sem acento nem maiuscula', () => {
    expect(sugerir(membros, '').map((s) => s.pubkey)).toEqual([MARIA, JOAO])
    expect(sugerir(membros, 'sil').map((s) => s.pubkey)).toEqual([MARIA])
    expect(sugerir(membros, 'joa').map((s) => s.pubkey)).toEqual([JOAO])
    expect(sugerir(membros, 'JOAO').map((s) => s.pubkey)).toEqual([JOAO])
    expect(sugerir(membros, 'xyz')).toEqual([])
  })

  it('RN-WEB-GRUPOS-016: escolher troca "@consulta" por "@Nome " e leva o cursor para depois', () => {
    expect(aplicarMencao('oi @ma tudo bem', 6, 3, 'Maria Silva')).toEqual({
      texto: 'oi @Maria Silva  tudo bem',
      cursor: 16,
    })
  })

  it('RN-WEB-GRUPOS-016: so vale a marcacao que continua no texto e de quem e membro', () => {
    const marcadas = [
      { pubkey: MARIA, texto: '@Maria Silva' },
      { pubkey: JOAO, texto: '@João' }, // apagada do texto
      { pubkey: pk(9), texto: '@Intruso' }, // nao e membro
      { pubkey: MARIA, texto: '@Maria Silva' }, // repetida
    ]
    expect(mencoesValidas('oi @Maria Silva', marcadas, [MARIA, JOAO])).toEqual([
      { pubkey: MARIA, texto: '@Maria Silva' },
    ])
  })

  it('RN-WEB-GRUPOS-016: parte o texto em pedacos comuns e marcacoes, na ordem', () => {
    const m = [
      { pubkey: MARIA, texto: '@Maria Silva' },
      { pubkey: JOAO, texto: '@João' },
    ]
    expect(partirPorMencoes('oi @João e @Maria Silva, vamos?', m)).toEqual([
      'oi ',
      m[1],
      ' e ',
      m[0],
      ', vamos?',
    ])
    expect(partirPorMencoes('sem ninguem', m)).toEqual(['sem ninguem'])
  })
})
