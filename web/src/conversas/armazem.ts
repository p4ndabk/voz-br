import { del, entries, get, set } from 'idb-keyval'

// RN-WEB-CONVERSAS-006: a lista de conversas vive so no IndexedDB deste navegador.
// Uma sala = eu + uma pubkey (RN-WEB-CONVERSAS-001); a chave do registro e a pubkey do amigo.
export interface Conversa {
  pubkey: string
  relaysDica: string[]
  criadaEm: number
  ultimaMensagemEm?: number
  trecho?: string
  novaPessoa: boolean
  // Historico apagado: mensagens com created_at ate este instante (em segundos) nao voltam, mesmo
  // que um relay as entregue de novo (RN-WEB-APAGAR-009). `apagadoPor` diz quem pediu.
  apagadoAte?: number
  apagadoPor?: 'eu' | 'outro'
  // Nao lidas (RN-WEB-CONVERSAS-010): `lidaAte` e o instante (segundos) da ultima mensagem vista;
  // ausente = tudo lido (conversas anteriores a este recurso).
  lidaAte?: number
  naoLidas?: number
  // RN-WEB-SYNC-003: "remover da lista" guarda o instante em vez de apagar o registro, para a remocao
  // viajar entre aparelhos. `reabertaEm` e quando a pessoa voltou a abrir a conversa removida.
  removidaEm?: number
  reabertaEm?: number
}

// A conversa aparece na lista se nunca foi removida ou se houve mensagem ou reabertura depois da remocao.
export function estaVisivel(c: Conversa): boolean {
  if (c.removidaEm === undefined) return true
  // Reabrir e uma acao da pessoa: vale mesmo no mesmo segundo da remocao. Mensagem precisa ser mais nova.
  return (c.ultimaMensagemEm ?? 0) > c.removidaEm || (c.reabertaEm ?? 0) >= c.removidaEm
}

const PREFIXO = 'voz:conversa:'

// Todas, inclusive as removidas (a sincronia precisa dos marcadores).
export async function listarTodasConversas(): Promise<Conversa[]> {
  const todas = await entries()
  return todas
    .filter(([chave]) => typeof chave === 'string' && chave.startsWith(PREFIXO))
    .map(([, valor]) => valor as Conversa)
}

export async function listarConversas(): Promise<Conversa[]> {
  return (await listarTodasConversas()).filter(estaVisivel)
}

export function obterConversa(pubkey: string): Promise<Conversa | undefined> {
  return get<Conversa>(PREFIXO + pubkey)
}

export function salvarConversa(conversa: Conversa): Promise<void> {
  return set(PREFIXO + conversa.pubkey, conversa)
}

export function removerConversaSalva(pubkey: string): Promise<void> {
  return del(PREFIXO + pubkey)
}

// Instante em que este navegador viu o Voz pela primeira vez. Mensagens mais antigas que ele
// chegam do historico dos relays e nao contam como novas (RN-WEB-CONVERSAS-011).
export async function desdeNesteNavegador(agora: number): Promise<number> {
  const guardado = await get<number>('voz:desde')
  if (guardado !== undefined) return guardado
  await set('voz:desde', agora)
  return agora
}
