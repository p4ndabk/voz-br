import type { EventTemplate, NostrEvent } from 'nostr-tools'

export type MetodoLogin = 'nip07' | 'nip46' | 'nsec'

// Interface unica de assinatura: o resto do app so conhece isto, nao importa como a pessoa entrou.
export interface Assinante {
  readonly metodo: MetodoLogin
  readonly pubkey: string
  assinar(modelo: EventTemplate): Promise<NostrEvent>
  nip44: {
    cifrar(pubkeyDoOutro: string, texto: string): Promise<string>
    decifrar(pubkeyDoOutro: string, cifrado: string): Promise<string>
  }
  // Libera o que a sessao segura (conexao NIP-46, etc.). Nao apaga o armazenamento local.
  encerrar(): Promise<void>
  // So existe quando o Voz tem a chave secreta (login por nsec ou identidade criada).
  exportarNsec?: () => string
}

export type MotivoErroLogin =
  | 'sem-extensao'
  | 'recusado'
  | 'sem-nip44'
  | 'expirou'
  | 'chave-invalida'
  | 'chave-publica'
  | 'link-invalido'
  | 'senha-errada'
  | 'falhou'

export class ErroLogin extends Error {
  constructor(public readonly motivo: MotivoErroLogin) {
    super(motivo)
    this.name = 'ErroLogin'
  }
}
