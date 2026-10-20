import { TAG_VOZ, type Rumor } from '@/nostr/dm'
import { MAXIMO_TEXTO_MENCAO, type Mencao } from './mencoes'
import { MAXIMO_MEMBROS, TAMANHO_MAXIMO_NOME_GRUPO, type DadosGrupo } from './tipos'

// RN-WEB-GRUPOS-*: as mensagens de controle do grupo sao rumores kind 14 comuns (legiveis em outros
// clientes) com a tag ["voz", <acao>, <idDoGrupo>] e os dados em tags proprias, sem JSON.
export const ACAO_MENSAGEM = 'grupo'
export const ACAO_CONVITE = 'grupo-convite'
export const ACAO_ACEITO = 'grupo-aceito'
export const ACAO_RECUSADO = 'grupo-recusado'
export const ACAO_MEMBROS = 'grupo-membros'
export const ACAO_SAIR = 'grupo-sair'
export const ACAO_LIMPAR = 'grupo-limpar'
export const ACAO_ENCERRAR = 'grupo-encerrar'

const HEX_64 = /^[0-9a-f]{64}$/
const INTEIRO = /^\d{1,12}$/

export type AcaoDeGrupo =
  | { tipo: 'mensagem'; grupo: string; mencoes: Mencao[] }
  | { tipo: 'convite'; dados: DadosGrupo }
  | { tipo: 'aceito'; grupo: string }
  | { tipo: 'recusado'; grupo: string }
  | { tipo: 'membros'; dados: DadosGrupo }
  | { tipo: 'sair'; grupo: string }
  | { tipo: 'limpar'; grupo: string; ate: number }
  | { tipo: 'encerrar'; grupo: string }

export const idValido = (id: unknown): id is string => typeof id === 'string' && HEX_64.test(id)

export function nomeValido(nome: string): boolean {
  const limpo = nome.trim()
  return limpo.length > 0 && limpo.length <= TAMANHO_MAXIMO_NOME_GRUPO
}

function lerDados(rumor: Rumor, id: string): DadosGrupo | null {
  const valor = (nome: string) => rumor.tags.find((t) => t[0] === nome)?.[1]
  const todos = (nome: string) => rumor.tags.filter((t) => t[0] === nome).map((t) => t[1] ?? '')
  const nomeDoGrupo = valor('nome')
  const admin = valor('admin')
  const versao = valor('versao')
  if (!nomeDoGrupo || !nomeValido(nomeDoGrupo) || !idValido(admin)) return null
  if (versao === undefined || !INTEIRO.test(versao)) return null
  const membros = todos('membro')
  const pendentes = todos('pendente')
  if (![...membros, ...pendentes].every(idValido)) return null
  const unicos = new Set([...membros, ...pendentes])
  if (unicos.size !== membros.length + pendentes.length) return null
  if (!membros.includes(admin) || membros.length > MAXIMO_MEMBROS) return null
  if (membros.length + pendentes.length > MAXIMO_MEMBROS) return null
  return { id, nome: nomeDoGrupo.trim(), admin, membros, pendentes, versao: Number(versao) }
}

// Marcacoes: ["mencao", pubkey, "@Nome"]. As invalidas sao ignoradas (a mensagem vale do mesmo jeito).
function lerMencoes(rumor: Rumor): Mencao[] {
  return rumor.tags
    .filter((t) => t[0] === 'mencao' && idValido(t[1]) && typeof t[2] === 'string')
    .filter((t) => t[2]!.startsWith('@') && t[2]!.length <= MAXIMO_TEXTO_MENCAO)
    .slice(0, MAXIMO_MEMBROS)
    .map((t) => ({ pubkey: t[1]!, texto: t[2]! }))
}

// null = nao e mensagem de grupo (ou esta malformada): segue o caminho normal ou e descartada.
export function lerAcaoDeGrupo(rumor: Rumor): AcaoDeGrupo | null {
  const tag = rumor.tags.find((t) => t[0] === TAG_VOZ && t[1]?.startsWith('grupo'))
  if (!tag) return null
  const [, acao, id] = tag
  if (!idValido(id)) return null
  switch (acao) {
    case ACAO_MENSAGEM:
      return { tipo: 'mensagem', grupo: id, mencoes: lerMencoes(rumor) }
    case ACAO_ACEITO:
      return { tipo: 'aceito', grupo: id }
    case ACAO_RECUSADO:
      return { tipo: 'recusado', grupo: id }
    case ACAO_SAIR:
      return { tipo: 'sair', grupo: id }
    case ACAO_ENCERRAR:
      return { tipo: 'encerrar', grupo: id }
    case ACAO_LIMPAR: {
      const ate = tag[3]
      if (ate === undefined || !INTEIRO.test(ate)) return null
      // RN-WEB-GRUPOS-009: o pedido nunca vale para o futuro.
      return { tipo: 'limpar', grupo: id, ate: Math.min(Number(ate), rumor.created_at) }
    }
    case ACAO_CONVITE:
    case ACAO_MEMBROS: {
      const dados = lerDados(rumor, id)
      return dados ? { tipo: acao === ACAO_CONVITE ? 'convite' : 'membros', dados } : null
    }
    default:
      return null
  }
}

// Tags de cada acao. Os destinatarios (tags `p`) entram junto, como no NIP-17 de grupo.
const paraTodos = (destinos: readonly string[]) => destinos.map((pk) => ['p', pk])

export const tagsDeMensagem = (
  grupo: string,
  destinos: readonly string[],
  mencoes: readonly Mencao[] = [],
) => [
  ...paraTodos(destinos),
  [TAG_VOZ, ACAO_MENSAGEM, grupo],
  ...mencoes.map((m) => ['mencao', m.pubkey, m.texto]),
]

function tagsDeDados(acao: string, d: DadosGrupo, destinos: readonly string[]) {
  return [
    ...paraTodos(destinos),
    [TAG_VOZ, acao, d.id],
    ['nome', d.nome],
    ['admin', d.admin],
    ['versao', String(d.versao)],
    ...d.membros.map((pk) => ['membro', pk]),
    ...d.pendentes.map((pk) => ['pendente', pk]),
  ]
}

export const tagsDeConvite = (d: DadosGrupo, convidado: string) =>
  tagsDeDados(ACAO_CONVITE, d, [convidado])
export const tagsDeMembros = (d: DadosGrupo, destinos: readonly string[]) =>
  tagsDeDados(ACAO_MEMBROS, d, destinos)
export const tagsSimples = (acao: string, grupo: string, destinos: readonly string[]) => [
  ...paraTodos(destinos),
  [TAG_VOZ, acao, grupo],
]
export const tagsDeLimpar = (grupo: string, ate: number, destinos: readonly string[]) => [
  ...paraTodos(destinos),
  [TAG_VOZ, ACAO_LIMPAR, grupo, String(ate)],
]
