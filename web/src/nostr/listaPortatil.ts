import { verifyEvent } from 'nostr-tools'
import type { EventoNostr } from './dm'
import type { Assinante } from './signer/tipos'

// RN-WEB-SYNC-001: a lista de conversas vai como evento NIP-78 (kind 30078, d = voz:conversas) com o
// conteudo cifrado por NIP-44 para a propria pessoa. So ela (ou o seu assinante) consegue ler.
export const KIND_LISTA_PORTATIL = 30078
export const ID_LISTA_PORTATIL = 'voz:conversas'
// Um evento com 400 conversas passa de 65 KB e varios relays recusam; 200 cabem com folga.
export const MAXIMO_CONVERSAS_PORTATEIS = 200
const MAXIMO_DICAS = 5
// RN-WEB-PRIVACIDADE-003: o texto cifrado tem tamanho de faixa, nao o tamanho real. Quem ve o evento
// publico nao descobre quantos contatos a pessoa tem, so em qual faixa ela esta.
export const FAIXAS_DA_LISTA = [8_192, 16_384, 32_768]

// RN-WEB-SYNC-002: so pubkey, dicas de relay, datas e marcadores. Nunca texto de mensagem.
export interface ConversaPortatil {
  pubkey: string
  relaysDica: string[]
  criadaEm: number
  // So vai quando ha remocao: serve para decidir se mensagens mais novas a ressuscitam.
  ultimaMensagemEm?: number
  apagadoAte?: number
  apagadoPor?: 'eu' | 'outro'
  removidaEm?: number
  reabertaEm?: number
}

const HEX_64 = /^[0-9a-f]{64}$/
const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const opcional = (v: unknown) => v === undefined || inteiro(v)

function lerItem(bruto: unknown): ConversaPortatil | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const c = bruto as Record<string, unknown>
  if (typeof c.pubkey !== 'string' || !HEX_64.test(c.pubkey) || !inteiro(c.criadaEm)) return null
  if (![c.ultimaMensagemEm, c.apagadoAte, c.removidaEm, c.reabertaEm].every(opcional)) return null
  const dicas = Array.isArray(c.relaysDica)
    ? c.relaysDica
        .filter((u): u is string => typeof u === 'string' && /^wss?:\/\//.test(u))
        .slice(0, MAXIMO_DICAS)
    : []
  return {
    pubkey: c.pubkey,
    relaysDica: dicas,
    criadaEm: c.criadaEm,
    ultimaMensagemEm: c.ultimaMensagemEm as number | undefined,
    apagadoAte: c.apagadoAte as number | undefined,
    apagadoPor: c.apagadoPor === 'eu' || c.apagadoPor === 'outro' ? c.apagadoPor : undefined,
    removidaEm: c.removidaEm as number | undefined,
    reabertaEm: c.reabertaEm as number | undefined,
  }
}

// Acrescenta o campo `r` (lixo) ate o texto atingir a menor faixa em que cabe.
export function preencherAteFaixa(dados: { v: number; conversas: unknown[] }): string {
  const base = JSON.stringify(dados)
  const faixa = FAIXAS_DA_LISTA.find((f) => base.length + 8 <= f) ?? base.length
  const total = JSON.stringify({ ...dados, r: '' }).length
  return JSON.stringify({ ...dados, r: 'x'.repeat(Math.max(0, faixa - total)) })
}

export async function montarListaPortatil(
  assinante: Assinante,
  conversas: ConversaPortatil[],
  criadoEm: number,
): Promise<EventoNostr> {
  const conteudo = await assinante.nip44.cifrar(
    assinante.pubkey,
    preencherAteFaixa({ v: 1, conversas: conversas.slice(0, MAXIMO_CONVERSAS_PORTATEIS) }),
  )
  return assinante.assinar({
    kind: KIND_LISTA_PORTATIL,
    created_at: criadoEm,
    tags: [['d', ID_LISTA_PORTATIL]],
    content: conteudo,
  })
}

// Le um evento recebido dos relays. null se nao for a minha lista, a assinatura for invalida ou o
// conteudo nao abrir.
export async function lerListaPortatil(
  assinante: Assinante,
  evento: unknown,
): Promise<{ criadoEm: number; conversas: ConversaPortatil[] } | null> {
  try {
    const e = evento as EventoNostr
    if (e?.kind !== KIND_LISTA_PORTATIL || e.pubkey !== assinante.pubkey) return null
    if (!e.tags.some((t) => t[0] === 'd' && t[1] === ID_LISTA_PORTATIL)) return null
    if (!verifyEvent(e)) return null
    const dados = JSON.parse(await assinante.nip44.decifrar(assinante.pubkey, e.content)) as {
      v?: unknown
      conversas?: unknown
    }
    if (dados.v !== 1 || !Array.isArray(dados.conversas)) return null
    const conversas = dados.conversas
      .map(lerItem)
      .filter((c): c is ConversaPortatil => c !== null)
      .slice(0, MAXIMO_CONVERSAS_PORTATEIS)
    return { criadoEm: e.created_at, conversas }
  } catch {
    return null
  }
}
