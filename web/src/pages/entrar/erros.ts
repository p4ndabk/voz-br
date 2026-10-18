import { t } from '@/i18n/pt-BR'
import { ErroLogin } from '@/nostr/signer/tipos'

export function mensagemDoErro(erro: unknown): string {
  return t.erros[erro instanceof ErroLogin ? erro.motivo : 'falhou']
}
