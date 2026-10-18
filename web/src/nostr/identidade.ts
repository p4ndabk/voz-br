import { gerarChave, nsecDe } from './signer/chaves'
import type { Assinante } from './signer/tipos'
import { relays } from './relays'

// Identidade nova: a chave nasce na memoria do navegador. So vira sessao depois que a pessoa
// confirma que guardou a nsec (RN-WEB-AUTH-005).
export function gerarIdentidade(): { chave: Uint8Array; nsec: string } {
  const chave = gerarChave()
  return { chave, nsec: nsecDe(chave) }
}

export const TAMANHO_MAXIMO_NOME = 40

// Perfil (kind 0, NIP-01) com o nome escolhido; publicado nos relays padrao.
export async function publicarNome(assinante: Assinante, nome: string): Promise<boolean> {
  const limpo = nome.trim().slice(0, TAMANHO_MAXIMO_NOME)
  if (limpo === '') return false
  const evento = await assinante.assinar({
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify({ name: limpo }),
  })
  const { aceitos } = await relays.publicar(evento)
  return aceitos > 0
}
