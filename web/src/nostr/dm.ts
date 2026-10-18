import {
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  nip44,
  verifyEvent,
  type NostrEvent,
} from 'nostr-tools'
import { bytesToHex, hexToBytes } from 'nostr-tools/utils'
import { normalizarRelay } from './relays'
import type { Assinante } from './signer/tipos'

export type { NostrEvent as EventoNostr } from 'nostr-tools'

export const KIND_MENSAGEM = 14
export const KIND_SELO = 13
export const KIND_EMBRULHO = 1059
export const KIND_RELAYS_DM = 10050
export const KIND_APAGAR = 5
export const MAXIMO_RELAYS_DM = 5

// Mensagem de controle do pedido de apagar historico (spec 0007): um rumor kind 14 comum, com
// texto legivel para quem usa outro cliente e esta tag para o Voz: ["voz", "apagar-historico", limite].
export const TAG_VOZ = 'voz'
export const ACAO_APAGAR_HISTORICO = 'apagar-historico'

// Evento "de verdade" (kind 14) que nunca e publicado sem estar dentro de um selo e um embrulho.
export interface Rumor {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
}

export interface Embrulho {
  evento: NostrEvent
  // RN-WEB-MENSAGENS-002: uma chave nova por embrulho. Guardada para o pedido de apagar (spec 0007).
  chaveEfemera: string
  destinatario: string
}

const DOIS_DIAS_S = 2 * 24 * 60 * 60

// NIP-59: os created_at do selo e do embrulho sao sorteados ate 2 dias no passado.
function momentoSorteado(agora: number): number {
  const sorteio = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
  return Math.floor(agora - sorteio * DOIS_DIAS_S)
}

export function criarRumor(
  autor: string,
  amigo: string,
  texto: string,
  relayDica: string | undefined,
  agora: number,
  tagsExtras: string[][] = [],
): Rumor {
  const semId = {
    kind: KIND_MENSAGEM,
    pubkey: autor,
    created_at: agora,
    tags: [relayDica ? ['p', amigo, relayDica] : ['p', amigo], ...tagsExtras],
    content: texto,
  }
  return { ...semId, id: getEventHash(semId) }
}

async function embrulharPara(
  assinante: Assinante,
  rumor: Rumor,
  destinatario: string,
  agora: number,
): Promise<Embrulho> {
  const cifradoDoSelo = await assinante.nip44.cifrar(destinatario, JSON.stringify(rumor))
  const selo = await assinante.assinar({
    kind: KIND_SELO,
    created_at: momentoSorteado(agora),
    tags: [],
    content: cifradoDoSelo,
  })
  const chave = generateSecretKey()
  const evento = finalizeEvent(
    {
      kind: KIND_EMBRULHO,
      created_at: momentoSorteado(agora),
      tags: [['p', destinatario]],
      content: nip44.encrypt(JSON.stringify(selo), nip44.getConversationKey(chave, destinatario)),
    },
    chave,
  )
  return { evento, chaveEfemera: bytesToHex(chave), destinatario }
}

// RN-WEB-MENSAGENS-001: kind 14 -> selo 13 -> embrulho 1059, uma copia para o amigo e outra para mim.
export async function criarEmbrulhos(
  assinante: Assinante,
  amigo: string,
  texto: string,
  relayDica: string | undefined,
  agora = Math.floor(Date.now() / 1000),
  tagsExtras: string[][] = [],
): Promise<{ rumor: Rumor; paraAmigo: Embrulho; paraMim: Embrulho }> {
  const rumor = criarRumor(assinante.pubkey, amigo, texto, relayDica, agora, tagsExtras)
  const [paraAmigo, paraMim] = await Promise.all([
    embrulharPara(assinante, rumor, amigo, agora),
    embrulharPara(assinante, rumor, assinante.pubkey, agora),
  ])
  return { rumor, paraAmigo, paraMim }
}

function rumorValido(dados: unknown): dados is Rumor {
  const r = dados as Rumor
  return (
    typeof r === 'object' &&
    r !== null &&
    r.kind === KIND_MENSAGEM &&
    typeof r.id === 'string' &&
    typeof r.pubkey === 'string' &&
    typeof r.content === 'string' &&
    typeof r.created_at === 'number' &&
    Array.isArray(r.tags) &&
    r.tags.every((t) => Array.isArray(t) && t.every((v) => typeof v === 'string'))
  )
}

function assinaturaValida(evento: NostrEvent): boolean {
  try {
    return verifyEvent(evento)
  } catch {
    return false
  }
}

// Abre um embrulho recebido. Devolve null (nunca lanca) para qualquer coisa que nao seja uma
// mensagem valida para mim.
// RN-WEB-MENSAGENS-006: o autor do selo precisa ser o mesmo do rumor; senao alguem se passaria
// pelo amigo escrevendo um rumor "dele" dentro de um selo proprio.
export async function abrirEmbrulho(
  assinante: Assinante,
  embrulho: unknown,
): Promise<Rumor | null> {
  try {
    const envelope = embrulho as NostrEvent
    if (envelope?.kind !== KIND_EMBRULHO || !assinaturaValida(envelope)) return null
    if (!envelope.tags.some((t) => t[0] === 'p' && t[1] === assinante.pubkey)) return null

    const selo = JSON.parse(await assinante.nip44.decifrar(envelope.pubkey, envelope.content))
    if (selo?.kind !== KIND_SELO || !assinaturaValida(selo)) return null

    const rumor: unknown = JSON.parse(await assinante.nip44.decifrar(selo.pubkey, selo.content))
    if (!rumorValido(rumor)) return null
    if (rumor.pubkey !== selo.pubkey) return null
    const { id, ...semId } = rumor
    if (getEventHash(semId) !== id) return null
    // Tem de ser para mim: ou eu sou o autor (copia minha) ou estou na tag p.
    const eMinha = rumor.pubkey === assinante.pubkey
    const paraMim = rumor.tags.some((t) => t[0] === 'p' && t[1] === assinante.pubkey)
    return eMinha || paraMim ? rumor : null
  } catch {
    return null
  }
}

// Com quem e a conversa: se o rumor e meu, o destinatario; se e do outro, o autor.
export function parceiroDoRumor(rumor: Rumor, minhaPubkey: string): string | null {
  if (rumor.pubkey !== minhaPubkey) return rumor.pubkey
  const destino = rumor.tags.find((t) => t[0] === 'p' && t[1] && t[1] !== minhaPubkey)
  return destino?.[1] ?? null
}

// Relays de DM (kind 10050): tags ["relay", url].
export function relaysDoEvento(evento: NostrEvent | null): string[] {
  if (!evento) return []
  const urls = evento.tags
    .filter((t) => t[0] === 'relay' && t[1])
    .map((t) => normalizarRelay(t[1]!))
    .filter((u): u is string => u !== null)
  return [...new Set(urls)].slice(0, MAXIMO_RELAYS_DM)
}

// RN-WEB-APAGAR-007: o pedido so vale ate o instante dele. O limite declarado nao pode passar do
// created_at do proprio rumor (senao um pedido apagaria mensagens que ainda nem existem).
// Tag ausente ou invalida: devolve null e o rumor segue como mensagem comum (nada e apagado).
export function lerPedidoDeApagar(rumor: Rumor): number | null {
  const tag = rumor.tags.find((t) => t[0] === TAG_VOZ && t[1] === ACAO_APAGAR_HISTORICO)
  if (!tag || tag[2] === undefined || !/^\d{1,12}$/.test(tag[2])) return null
  return Math.min(Number(tag[2]), rumor.created_at)
}

// RN-WEB-APAGAR-005: o pedido NIP-09 de cada embrulho e assinado pela chave efemera DELE (a unica
// que o relay aceita como autora) e nunca pela chave principal.
export function criarEventoDeApagar(
  embrulho: { id: string; chaveEfemera: string },
  agora = Math.floor(Date.now() / 1000),
): NostrEvent {
  return finalizeEvent(
    {
      kind: KIND_APAGAR,
      created_at: agora,
      tags: [
        ['e', embrulho.id],
        ['k', String(KIND_EMBRULHO)],
      ],
      content: '',
    },
    hexToBytes(embrulho.chaveEfemera),
  )
}
