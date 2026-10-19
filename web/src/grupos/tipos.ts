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
  // Quando o admin (neste aparelho) mudou a lista pela ultima vez. Pedidos de membros mais velhos que isso
  // sao reentregas de um relay e nao valem de novo (um "sair" antigo nao tira quem voltou).
  alteradoEm?: number
  // Mesmos campos da lista de conversas, para ordenar e contar nao lidas.
  ultimaMensagemEm?: number
  trecho?: string
  lidaAte?: number
  naoLidas?: number
}

// Folga para relogios diferentes entre os aparelhos.
export const TOLERANCIA_RELOGIO_S = 300

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
