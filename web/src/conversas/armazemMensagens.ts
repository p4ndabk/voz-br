import { del } from 'idb-keyval'
import { gravarCofre, lerCofre, listarCofre } from '@/nostr/cofre'
import type { Mencao } from '@/grupos/mencoes'
import type { EventoNostr } from '@/nostr/dm'

export type EstadoMensagem = 'enviando' | 'enviada' | 'falhou' | 'recebida'

// Chave = id do rumor. Guardada em texto no IndexedDB porque, sem isso, quem entra por extensao
// ou NIP-46 precisaria autorizar a decifragem de cada mensagem a cada abertura.
export interface Mensagem {
  id: string
  conversa: string
  autor: string
  texto: string
  criadoEm: number
  estado: EstadoMensagem
  // O amigo nao tem lista de relays de DM: enviamos pelas dicas e pelos relays padrao.
  semRelaysDm?: boolean
  // Aviso do proprio Voz no meio da conversa (nao e balao de ninguem). `texto` guarda a pubkey de quem entrou.
  sistema?: 'entrou'
  // Pessoas marcadas com @ (so em grupo).
  mencoes?: Mencao[]
}

// Embrulho que EU criei. Guarda a chave efemera (para o pedido de apagar da spec 0007) e o
// evento (para reenviar uma mensagem que falhou sem criar outra).
export interface EmbrulhoSalvo {
  id: string
  conversa: string
  rumorId: string
  evento: EventoNostr
  chaveEfemera: string
  paraMim: boolean
  relays: string[]
}

const PREFIXO_MENSAGEM = 'voz:msg:'
const PREFIXO_EMBRULHO = 'voz:embrulho:'

export function obterMensagem(id: string): Promise<Mensagem | undefined> {
  return lerCofre<Mensagem>(PREFIXO_MENSAGEM + id)
}

export function salvarMensagem(mensagem: Mensagem): Promise<void> {
  return gravarCofre(PREFIXO_MENSAGEM + mensagem.id, mensagem)
}

const todos = <T>(prefixo: string) => listarCofre<T>(prefixo)

export const listarMensagens = (conversa: string) =>
  todos<Mensagem>(PREFIXO_MENSAGEM).then((lista) => lista.filter((m) => m.conversa === conversa))

export const listarTodasMensagens = () => todos<Mensagem>(PREFIXO_MENSAGEM)

export function salvarEmbrulho(embrulho: EmbrulhoSalvo): Promise<void> {
  return gravarCofre(PREFIXO_EMBRULHO + embrulho.id, embrulho)
}

export const embrulhosDaMensagem = (rumorId: string) =>
  todos<EmbrulhoSalvo>(PREFIXO_EMBRULHO).then((lista) => lista.filter((e) => e.rumorId === rumorId))

export async function removerMensagens(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => del(PREFIXO_MENSAGEM + id)))
}

export async function removerEmbrulhos(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => del(PREFIXO_EMBRULHO + id)))
}

export const embrulhosDaConversa = (conversa: string) =>
  todos<EmbrulhoSalvo>(PREFIXO_EMBRULHO).then((lista) =>
    lista.filter((e) => e.conversa === conversa),
  )

export async function registrarRelaysDoEmbrulho(id: string, relays: string[]): Promise<void> {
  const atual = await lerCofre<EmbrulhoSalvo>(PREFIXO_EMBRULHO + id)
  if (atual) await gravarCofre(PREFIXO_EMBRULHO + id, { ...atual, relays })
}

// Fila de eventos que ainda precisam sair (pedidos de apagar e aviso ao amigo). Sobrevive a
// fechar a pagina e e reenviada quando os relays voltam (RN-WEB-APAGAR-003).
export interface ItemDaFila {
  id: string
  tipo: 'apagar' | 'aviso'
  evento: EventoNostr
  relays: string[]
  tentativas: number
}

const PREFIXO_FILA = 'voz:fila:'

export function salvarNaFila(item: ItemDaFila): Promise<void> {
  return gravarCofre(PREFIXO_FILA + item.id, item)
}

export const listarFila = () => todos<ItemDaFila>(PREFIXO_FILA)

export function removerDaFila(id: string): Promise<void> {
  return del(PREFIXO_FILA + id)
}
