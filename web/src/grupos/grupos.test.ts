import { describe, expect, it } from 'vitest'
import type { Rumor } from '@/nostr/dm'
import { convidar, criarGrupo, passarAdmin, podeSair, remover } from './administrar'
import {
  ACAO_LIMPAR,
  ACAO_MENSAGEM,
  lerAcaoDeGrupo,
  tagsDeConvite,
  tagsDeLimpar,
  tagsDeMembros,
  tagsDeMensagem,
  tagsSimples,
  ACAO_SAIR,
} from './protocolo'
import { aplicarAcao, paraDados } from './regras'
import { MAXIMO_MEMBROS, type Grupo } from './tipos'

const pk = (n: number) => n.toString(16).padStart(64, '0')
const ADMIN = pk(1)
const BIA = pk(2)
const CAIO = pk(3)
const DUDA = pk(4)
const ID = 'ab'.repeat(32)

const rumor = (tags: string[][], pubkey = ADMIN, created_at = 1000): Rumor => ({
  id: 'x'.repeat(64),
  pubkey,
  created_at,
  kind: 14,
  tags,
  content: 'texto legivel',
})

const novo = () => {
  const r = criarGrupo(ADMIN, 'Filosofia', [BIA, CAIO], ID, 500)
  if (!r.ok) throw new Error(r.erro)
  return r.grupo
}
const comoConvidado = (g: Grupo): Grupo => ({
  ...g,
  estado: 'convidado',
  membros: [g.admin],
})
const ativo = (extra: Partial<Grupo> = {}): Grupo => ({
  ...novo(),
  membros: [ADMIN, BIA],
  pendentes: [CAIO],
  versao: 3,
  ...extra,
})

describe('protocolo do grupo (RN-WEB-GRUPOS-001)', () => {
  it('RN-WEB-GRUPOS-001: o convite ida e volta com nome, admin, membros e pendentes', () => {
    const g = novo()
    const acao = lerAcaoDeGrupo(rumor(tagsDeConvite(paraDados(g), BIA)))
    expect(acao).toEqual({ tipo: 'convite', dados: paraDados(g) })
  })

  it('RN-WEB-GRUPOS-001: mensagem, sair, limpar e membros sao lidos pela tag voz', () => {
    expect(lerAcaoDeGrupo(rumor(tagsDeMensagem(ID, [BIA])))).toEqual({
      tipo: 'mensagem',
      grupo: ID,
    })
    expect(lerAcaoDeGrupo(rumor(tagsSimples(ACAO_SAIR, ID, [ADMIN])))).toEqual({
      tipo: 'sair',
      grupo: ID,
    })
    expect(lerAcaoDeGrupo(rumor(tagsDeMembros(paraDados(novo()), [BIA])))?.tipo).toBe('membros')
  })

  it('RN-WEB-GRUPOS-009: limpar nunca vale para o futuro', () => {
    const r = rumor(tagsDeLimpar(ID, 9_999_999, [BIA]), ADMIN, 2000)
    expect(lerAcaoDeGrupo(r)).toEqual({ tipo: 'limpar', grupo: ID, ate: 2000 })
  })

  it('RN-WEB-GRUPOS-001: tag malformada vira null (o rumor segue como mensagem comum ou e descartado)', () => {
    expect(lerAcaoDeGrupo(rumor([['voz', ACAO_MENSAGEM, 'curto']]))).toBeNull()
    expect(lerAcaoDeGrupo(rumor([['voz', ACAO_LIMPAR, ID]]))).toBeNull()
    expect(lerAcaoDeGrupo(rumor([['voz', 'grupo-inventada', ID]]))).toBeNull()
    expect(lerAcaoDeGrupo(rumor([['voz', 'apagar-historico', '123']]))).toBeNull()
    expect(lerAcaoDeGrupo(rumor([]))).toBeNull()
  })

  it('RN-WEB-GRUPOS-001: lista invalida e recusada (nome vazio, admin fora, duplicados, acima do limite)', () => {
    const base = paraDados(novo())
    const tags = (d: typeof base) => tagsDeMembros(d, [BIA])
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, nome: '   ' })))).toBeNull()
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, nome: 'x'.repeat(41) })))).toBeNull()
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, membros: [BIA] })))).toBeNull()
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, pendentes: [ADMIN] })))).toBeNull()
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, pendentes: ['zz'] })))).toBeNull()
    const muitos = Array.from({ length: MAXIMO_MEMBROS }, (_, i) => pk(100 + i))
    expect(lerAcaoDeGrupo(rumor(tags({ ...base, pendentes: muitos })))).toBeNull()
  })
})

describe('criar e administrar (RN-WEB-GRUPOS-002 a 006)', () => {
  it('RN-WEB-GRUPOS-002: quem cria e o admin, entra sozinho e os convidados ficam pendentes', () => {
    const g = novo()
    expect(g).toMatchObject({
      admin: ADMIN,
      membros: [ADMIN],
      pendentes: [BIA, CAIO],
      estado: 'ativo',
      versao: 1,
    })
  })

  it('RN-WEB-GRUPOS-002: nome vazio ou comprido, sem convidados e acima de 30 sao recusados', () => {
    expect(criarGrupo(ADMIN, '  ', [BIA], ID, 1)).toEqual({ ok: false, erro: 'nome-invalido' })
    expect(criarGrupo(ADMIN, 'x'.repeat(41), [BIA], ID, 1)).toMatchObject({ ok: false })
    expect(criarGrupo(ADMIN, 'ok', [ADMIN], ID, 1)).toEqual({ ok: false, erro: 'sem-convidados' })
    const muitos = Array.from({ length: MAXIMO_MEMBROS }, (_, i) => pk(100 + i))
    expect(criarGrupo(ADMIN, 'ok', muitos, ID, 1)).toEqual({ ok: false, erro: 'cheio' })
  })

  it('RN-WEB-GRUPOS-003: so o admin convida e remove', () => {
    const g = ativo()
    expect(convidar(g, BIA, DUDA)).toEqual({ ok: false, erro: 'nao-e-admin' })
    expect(remover(g, BIA, CAIO)).toEqual({ ok: false, erro: 'nao-e-admin' })
    expect(passarAdmin(g, BIA, BIA)).toEqual({ ok: false, erro: 'nao-e-admin' })
    const r = convidar(g, ADMIN, DUDA)
    expect(r.ok && r.grupo.pendentes).toContain(DUDA)
    expect(r.ok && r.grupo.membros).not.toContain(DUDA) // convidar nao coloca ninguem como membro
    expect(r.ok && r.grupo.versao).toBe(4)
  })

  it('RN-WEB-GRUPOS-003: nao convida duas vezes, nem acima do limite; nao remove o admin', () => {
    const g = ativo()
    expect(convidar(g, ADMIN, BIA)).toEqual({ ok: false, erro: 'ja-na-lista' })
    expect(convidar(g, ADMIN, CAIO)).toEqual({ ok: false, erro: 'ja-na-lista' })
    expect(remover(g, ADMIN, ADMIN)).toEqual({ ok: false, erro: 'e-o-admin' })
    expect(remover(g, ADMIN, DUDA)).toEqual({ ok: false, erro: 'nao-esta-na-lista' })
    const cheio = ativo({
      membros: [ADMIN, ...Array.from({ length: MAXIMO_MEMBROS - 1 }, (_, i) => pk(100 + i))],
      pendentes: [],
    })
    expect(convidar(cheio, ADMIN, DUDA)).toEqual({ ok: false, erro: 'cheio' })
  })

  it('RN-WEB-GRUPOS-003: remover tira o membro ou cancela o convite pendente', () => {
    const g = ativo()
    const m = remover(g, ADMIN, BIA)
    expect(m.ok && m.grupo.membros).toEqual([ADMIN])
    const p = remover(g, ADMIN, CAIO)
    expect(p.ok && p.grupo.pendentes).toEqual([])
  })

  it('RN-WEB-GRUPOS-006: o admin so sai depois de passar o cargo; membro comum sai quando quiser', () => {
    const g = ativo()
    expect(podeSair(g, ADMIN)).toBe(false)
    expect(podeSair(g, BIA)).toBe(true)
    const r = passarAdmin(g, ADMIN, BIA)
    expect(r.ok && r.grupo.admin).toBe(BIA)
    expect(r.ok && podeSair(r.grupo, ADMIN)).toBe(true)
    expect(passarAdmin(g, ADMIN, CAIO)).toEqual({ ok: false, erro: 'nao-esta-na-lista' }) // pendente nao
  })
})

describe('regras de quem recebe (RN-WEB-GRUPOS-004, 005, 007, 008)', () => {
  it('RN-WEB-GRUPOS-004: o convite cria o grupo so como "convidado", sem entregar mensagens', () => {
    const d = paraDados(novo())
    const r = aplicarAcao(undefined, ADMIN, { tipo: 'convite', dados: d }, BIA, 900)
    expect(r.ok && r.grupo.estado).toBe('convidado')
    // convidado ainda nao e membro: mensagem do grupo e recusada
    const g = r.ok ? r.grupo : undefined
    expect(aplicarAcao(g, ADMIN, { tipo: 'mensagem', grupo: ID }, BIA, 900)).toEqual({
      ok: false,
      motivo: 'inativo',
    })
  })

  it('RN-WEB-GRUPOS-004: convite so vale do admin declarado e para quem esta nos pendentes', () => {
    const d = paraDados(novo())
    expect(aplicarAcao(undefined, CAIO, { tipo: 'convite', dados: d }, BIA, 1)).toEqual({
      ok: false,
      motivo: 'nao-e-admin',
    })
    expect(aplicarAcao(undefined, ADMIN, { tipo: 'convite', dados: d }, DUDA, 1)).toEqual({
      ok: false,
      motivo: 'sem-convite',
    })
  })

  it('RN-WEB-GRUPOS-004: convite repetido de um grupo ativo e ignorado', () => {
    const d = paraDados(ativo())
    expect(aplicarAcao(ativo(), ADMIN, { tipo: 'convite', dados: d }, BIA, 1)).toMatchObject({
      ok: false,
    })
  })

  it('RN-WEB-GRUPOS-005: o admin processa o aceite, inclui a pessoa e manda a lista nova', () => {
    const g = novo()
    const r = aplicarAcao(g, BIA, { tipo: 'aceito', grupo: ID }, ADMIN, 900)
    expect(r.ok && r.grupo.membros).toEqual([ADMIN, BIA])
    expect(r.ok && r.grupo.pendentes).toEqual([CAIO])
    expect(r.ok && r.publicarMembros).toBe(true)
    expect(r.ok && r.grupo.versao).toBe(2)
  })

  it('RN-WEB-GRUPOS-005: aceite de quem nao foi convidado, ou fora do admin, nao entra', () => {
    const g = novo()
    expect(aplicarAcao(g, DUDA, { tipo: 'aceito', grupo: ID }, ADMIN, 1)).toEqual({
      ok: false,
      motivo: 'sem-convite',
    })
    // quem nao e o admin nao muda a lista
    expect(
      aplicarAcao(comoConvidado(g), BIA, { tipo: 'aceito', grupo: ID }, CAIO, 1),
    ).toMatchObject({
      ok: false,
    })
  })

  it('RN-WEB-GRUPOS-005: recusa tira so o pendente', () => {
    const r = aplicarAcao(novo(), BIA, { tipo: 'recusado', grupo: ID }, ADMIN, 1)
    expect(r.ok && r.grupo.pendentes).toEqual([CAIO])
    expect(r.ok && r.grupo.membros).toEqual([ADMIN])
  })

  it('RN-WEB-GRUPOS-005: grupo cheio nao aceita mais ninguem', () => {
    const cheio = ativo({
      membros: [ADMIN, ...Array.from({ length: MAXIMO_MEMBROS - 1 }, (_, i) => pk(100 + i))],
      pendentes: [CAIO],
    })
    expect(aplicarAcao(cheio, CAIO, { tipo: 'aceito', grupo: ID }, ADMIN, 1)).toEqual({
      ok: false,
      motivo: 'cheio',
    })
  })

  it('RN-WEB-GRUPOS-006: quem sai deixa a lista; o admin nao sai por mensagem', () => {
    const g = ativo({ pendentes: [] })
    const r = aplicarAcao(g, BIA, { tipo: 'sair', grupo: ID }, ADMIN, 1)
    expect(r.ok && r.grupo.membros).toEqual([ADMIN])
    expect(r.ok && r.publicarMembros).toBe(true)
    expect(aplicarAcao(g, ADMIN, { tipo: 'sair', grupo: ID }, ADMIN, 1)).toMatchObject({
      ok: false,
    })
    expect(aplicarAcao(g, DUDA, { tipo: 'sair', grupo: ID }, ADMIN, 1)).toMatchObject({ ok: false })
  })

  it('RN-WEB-GRUPOS-007: lista nova so vale se vier do admin e com versao maior', () => {
    const meu = ativo({ pendentes: [] })
    const nova = { ...paraDados(meu), versao: 4, membros: [ADMIN, BIA, DUDA] }
    expect(aplicarAcao(meu, BIA, { tipo: 'membros', dados: nova }, CAIO, 1)).toEqual({
      ok: false,
      motivo: 'nao-e-admin',
    })
    expect(
      aplicarAcao(meu, ADMIN, { tipo: 'membros', dados: { ...nova, versao: 3 } }, BIA, 1),
    ).toEqual({ ok: false, motivo: 'versao-antiga' })
    const r = aplicarAcao(meu, ADMIN, { tipo: 'membros', dados: nova }, BIA, 1)
    expect(r.ok && r.grupo.membros).toEqual([ADMIN, BIA, DUDA])
  })

  it('RN-WEB-GRUPOS-007: ao ser incluido o convidado vira ativo; ao sair da lista vira removido', () => {
    const conv = { ...comoConvidado(novo()), versao: 1 }
    const entrou = { ...paraDados(novo()), versao: 2, membros: [ADMIN, BIA], pendentes: [CAIO] }
    const a = aplicarAcao(conv, ADMIN, { tipo: 'membros', dados: entrou }, BIA, 1)
    expect(a.ok && a.grupo.estado).toBe('ativo')
    const saiu = { ...entrou, versao: 3, membros: [ADMIN] }
    const b = aplicarAcao(a.ok ? a.grupo : conv, ADMIN, { tipo: 'membros', dados: saiu }, BIA, 1)
    expect(b.ok && b.grupo.estado).toBe('removido')
  })

  it('RN-WEB-GRUPOS-007: passar o admin: so o admin atual assina; depois o novo manda', () => {
    const meu = ativo({ pendentes: [] })
    const nova = { ...paraDados(meu), versao: 4, admin: BIA }
    const r = aplicarAcao(meu, ADMIN, { tipo: 'membros', dados: nova }, BIA, 1)
    expect(r.ok && r.grupo.admin).toBe(BIA)
    // o antigo admin ja nao manda mais
    const depois = r.ok ? r.grupo : meu
    const outra = { ...nova, versao: 5, membros: [ADMIN, BIA, DUDA] }
    expect(aplicarAcao(depois, ADMIN, { tipo: 'membros', dados: outra }, BIA, 1)).toEqual({
      ok: false,
      motivo: 'nao-e-admin',
    })
    expect(aplicarAcao(depois, BIA, { tipo: 'membros', dados: outra }, BIA, 1)).toMatchObject({
      ok: true,
    })
  })

  it('RN-WEB-GRUPOS-008: mensagem so vale de membro, com o grupo ativo e conhecido', () => {
    const g = ativo({ pendentes: [] })
    expect(aplicarAcao(g, BIA, { tipo: 'mensagem', grupo: ID }, ADMIN, 1)).toMatchObject({
      ok: true,
      mensagem: true,
    })
    expect(aplicarAcao(g, DUDA, { tipo: 'mensagem', grupo: ID }, ADMIN, 1)).toEqual({
      ok: false,
      motivo: 'nao-e-membro',
    })
    expect(aplicarAcao(undefined, BIA, { tipo: 'mensagem', grupo: ID }, ADMIN, 1)).toEqual({
      ok: false,
      motivo: 'desconhecido',
    })
    expect(
      aplicarAcao({ ...g, estado: 'removido' }, BIA, { tipo: 'mensagem', grupo: ID }, ADMIN, 1),
    ).toEqual({ ok: false, motivo: 'inativo' })
  })

  it('RN-WEB-GRUPOS-008: quem foi removido da lista nova deixa de ter mensagem aceita', () => {
    const g = ativo({ pendentes: [] })
    const sem = { ...paraDados(g), versao: 4, membros: [ADMIN] }
    const r = aplicarAcao(g, ADMIN, { tipo: 'membros', dados: sem }, CAIO, 1)
    const depois = r.ok ? r.grupo : g
    expect(aplicarAcao(depois, BIA, { tipo: 'mensagem', grupo: ID }, ADMIN, 1)).toMatchObject({
      ok: false,
    })
  })

  it('RN-WEB-GRUPOS-009: limpar para todos so do admin e so ate o instante do pedido', () => {
    const g = ativo({ pendentes: [] })
    expect(aplicarAcao(g, BIA, { tipo: 'limpar', grupo: ID, ate: 1000 }, CAIO, 1)).toEqual({
      ok: false,
      motivo: 'nao-e-admin',
    })
    const r = aplicarAcao(g, ADMIN, { tipo: 'limpar', grupo: ID, ate: 1000 }, BIA, 1)
    expect(r.ok && r.limparAte).toBe(1000)
    expect(r.ok && r.grupo.apagadoAte).toBe(1000)
  })

  it('RN-WEB-GRUPOS-006: encerrar so do admin; depois ninguem manda mensagem', () => {
    const g = ativo({ pendentes: [] })
    expect(aplicarAcao(g, BIA, { tipo: 'encerrar', grupo: ID }, CAIO, 1)).toMatchObject({
      ok: false,
    })
    const r = aplicarAcao(g, ADMIN, { tipo: 'encerrar', grupo: ID }, BIA, 1)
    expect(r.ok && r.grupo.estado).toBe('encerrado')
  })
})
