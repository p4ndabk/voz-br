import { verifyEvent } from 'nostr-tools'

export interface DadosDoRecibo {
  // Chave que o servico Lightning declarou (nostrPubkey) e que assina os recibos.
  nostrPubkey: string
  // Id do pedido de zap (kind 9734) que eu assinei.
  pedidoId: string
  // Fatura que mostrei para a pessoa pagar.
  fatura: string
}

// RN-WEB-ZAP-007: so um recibo (kind 9735) assinado pelo servico, do meu pedido e da minha fatura confirma.
export function reciboConfirma(evento: unknown, dados: DadosDoRecibo): boolean {
  try {
    const e = evento as { kind?: number; pubkey?: string; tags?: unknown }
    if (e?.kind !== 9735 || e.pubkey !== dados.nostrPubkey) return false
    if (!verifyEvent(e as Parameters<typeof verifyEvent>[0])) return false
    const tags = (Array.isArray(e.tags) ? e.tags : []) as string[][]
    const valor = (nome: string) => tags.find((t) => t[0] === nome)?.[1]
    if (valor('bolt11')?.toLowerCase() !== dados.fatura.trim().toLowerCase()) return false
    const pedido = JSON.parse(valor('description') ?? '') as { id?: string }
    return pedido.id === dados.pedidoId
  } catch {
    return false
  }
}
