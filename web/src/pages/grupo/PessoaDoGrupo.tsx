import { Identidade } from '@/components/ui/Identidade'
import { useFotoLiberada } from '@/conversas/useConversas'

// Uma pessoa do grupo: foto so se eu a conheco (RN-WEB-PRIVACIDADE-005); o cartao abre a chave.
export function PessoaDoGrupo({ pubkey, tamanho = 40 }: { pubkey: string; tamanho?: number }) {
  const liberada = useFotoLiberada(pubkey)
  return <Identidade pubkey={pubkey} tamanho={tamanho} mostrarFoto={liberada} />
}
