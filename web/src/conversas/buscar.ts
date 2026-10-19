import { npubDe } from '@/nostr/perfis'
import type { Conversa } from './armazem'

// Sem acento e sem caixa: "Jose" acha "José".
const simples = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// RN-WEB-LAYOUT-006: a busca olha o nome, o trecho da ultima mensagem e o npub. Termo vazio = tudo.
export function filtrarConversas(
  conversas: Conversa[],
  termo: string,
  nomes: Record<string, string | undefined>,
): Conversa[] {
  const alvo = simples(termo.trim())
  if (alvo === '') return conversas
  return conversas.filter((c) => {
    const campos = [nomes[c.pubkey] ?? '', c.trecho ?? '', npubDe(c.pubkey)]
    return campos.some((campo) => simples(campo).includes(alvo))
  })
}
