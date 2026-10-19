// RN-WEB-GRUPOS-*: o grupo vive so nos aparelhos de quem participa. Nao ha chave nem lista no relay:
// cada mensagem e uma copia cifrada para cada membro (NIP-17), e a lista de membros viaja em mensagens de
// controle assinadas pelo admin.
export const MAXIMO_MEMBROS = 30
export const TAMANHO_MAXIMO_NOME_GRUPO = 40

export type EstadoGrupo = 'convidado' | 'ativo' | 'saiu' | 'removido' | 'encerrado'

export interface Grupo {
  // 32 bytes aleatorios em hex, escolhidos pelo admin ao criar.
  id: string
  nome: string
  admin: string
  // Quem ja aceitou (inclui o admin).
  membros: string[]
  // Convidados que ainda nao responderam. So o admin tem o dado completo; os membros recebem a lista.
  pendentes: string[]
  // Sobe a cada mudanca da lista. Vale a maior versao assinada pelo admin.
  versao: number
  estado: EstadoGrupo
  criadoEm: number
  // Mensagens ate este instante (segundos) nao voltam, mesmo que um relay as reentregue.
  apagadoAte?: number
}

// O que a lista de membros carrega (sem estado nem datas locais).
export interface DadosGrupo {
  id: string
  nome: string
  admin: string
  membros: string[]
  pendentes: string[]
  versao: number
}

export const chaveDaConversa = (id: string) => `grupo:${id}`
export const ehConversaDeGrupo = (conversa: string) => conversa.startsWith('grupo:')
export const idDaConversa = (conversa: string) => conversa.slice('grupo:'.length)
