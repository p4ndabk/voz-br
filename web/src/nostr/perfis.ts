import { nip19, verifyEvent, type NostrEvent } from 'nostr-tools'
import { TAMANHO_MAXIMO_NOME } from './identidade'

export interface Perfil {
  nomeExibicao?: string
  nome?: string
  foto?: string
  sobre?: string
  // Endereco Lightning (LUD-16), "nome@dominio.com": e por ele que a pessoa recebe pagamentos.
  lightning?: string
}

export interface PerfilSalvo {
  evento: NostrEvent
  buscadoEm: number
}

// RN-WEB-PERFIL-007: perfil em cache aparece na hora e so e buscado de novo depois de 24 h.
export const VALIDADE_CACHE_MS = 24 * 60 * 60 * 1000

export function limitarTexto(texto: string, maximo = TAMANHO_MAXIMO_NOME): string {
  const chars = Array.from(texto)
  return chars.length <= maximo ? texto : `${chars.slice(0, maximo).join('')}…`
}

function texto(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined
  const limpo = valor.trim()
  return limpo === '' ? undefined : limpo
}

// RN-WEB-PERFIL-008: so endereco http(s) vira foto.
function enderecoDeFoto(valor: unknown): string | undefined {
  const bruto = texto(valor)
  if (!bruto) return undefined
  try {
    const url = new URL(bruto)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

const LIGHTNING = /^[a-z0-9._+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/

// RN-WEB-PERFIL-012: o formato precisa ser "usuario@dominio.tld" (o TLD tem letras, o que
// descarta IP e localhost: o endereco vira uma URL que o navegador consultaria).
export function normalizarLightning(entrada: string): string {
  return entrada
    .trim()
    .replace(/^lightning:/i, '')
    .toLowerCase()
}

export function enderecoLightningValido(entrada: string): boolean {
  const e = normalizarLightning(entrada)
  return e.length <= 120 && LIGHTNING.test(e)
}

function enderecoLightning(valor: unknown): string | undefined {
  const bruto = texto(valor)
  if (!bruto) return undefined
  const e = normalizarLightning(bruto)
  return enderecoLightningValido(e) ? e : undefined
}

// RN-WEB-PERFIL-004: JSON invalido, ou que nao e um objeto, e "sem perfil".
export function lerPerfil(evento: Pick<NostrEvent, 'content'>): Perfil | null {
  let dados: unknown
  try {
    dados = JSON.parse(evento.content)
  } catch {
    return null
  }
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) return null
  const campos = dados as Record<string, unknown>
  return {
    nomeExibicao: texto(campos.display_name),
    nome: texto(campos.name),
    foto: enderecoDeFoto(campos.picture),
    sobre: texto(campos.about),
    lightning: enderecoLightning(campos.lud16),
  }
}

// npub1 + 8 primeiros e 4 ultimos caracteres: "npub1q3sle0kv…x4ku".
export function npubAbreviada(pubkey: string): string {
  const npub = nip19.npubEncode(pubkey)
  return `${npub.slice(0, 13)}…${npub.slice(-4)}`
}

// RN-WEB-PERFIL-001: display_name, depois name, depois a chave abreviada.
export function nomeExibido(
  perfil: Perfil | null | undefined,
  pubkey: string,
): { texto: string; temNome: boolean } {
  const nome = perfil?.nomeExibicao ?? perfil?.nome
  if (nome) return { texto: limitarTexto(nome), temNome: true }
  return { texto: npubAbreviada(pubkey), temNome: false }
}

function assinaturaValida(evento: NostrEvent): boolean {
  try {
    return verifyEvent(evento)
  } catch {
    return false
  }
}

// RN-WEB-PERFIL-003: entre todos os relays vale o kind 0 (ou o `kind` pedido) valido mais recente. Evento que nao
// e do autor, nao e kind 0 ou tem assinatura invalida e descartado. No empate de created_at,
// vence o menor id (NIP-01).
export function maisRecente(eventos: unknown[], pubkey: string, kind = 0): NostrEvent | null {
  let melhor: NostrEvent | null = null
  for (const candidato of eventos) {
    const evento = candidato as NostrEvent
    if (evento?.kind !== kind || evento.pubkey !== pubkey) continue
    if (!assinaturaValida(evento)) continue
    if (
      !melhor ||
      evento.created_at > melhor.created_at ||
      (evento.created_at === melhor.created_at && evento.id < melhor.id)
    ) {
      melhor = evento
    }
  }
  return melhor
}
