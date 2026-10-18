import { create } from 'zustand'
import { publicarNome } from './identidade'
import {
  abrirSessaoComChave,
  apagarTudoDoVoz,
  destravarSessao,
  restaurarSessao,
  salvarSessao,
} from './sessao'
import { lerNsec } from './signer/chaves'
import { entrarComExtensao as loginExtensao } from './signer/nip07'
import type { CredencialNip46 } from './signer/nip46'
import { ErroLogin, type Assinante } from './signer/tipos'

type Fase = 'carregando' | 'fora' | 'precisa-senha' | 'dentro'

interface EstadoSessao {
  fase: Fase
  assinante: Assinante | null
  restaurar(): Promise<void>
  entrarComExtensao(): Promise<void>
  entrarComAssinante(assinante: Assinante, credencial: CredencialNip46): Promise<void>
  entrarComNsec(texto: string, senha?: string): Promise<void>
  confirmarIdentidade(chave: Uint8Array, nome: string, senha?: string): Promise<void>
  destravar(senha: string): Promise<void>
  sair(): Promise<void>
}

export const useSessao = create<EstadoSessao>((set, get) => ({
  fase: 'carregando',
  assinante: null,

  async restaurar() {
    try {
      const r = await restaurarSessao()
      if (r.tipo === 'pronta') set({ fase: 'dentro', assinante: r.assinante })
      else set({ fase: r.tipo === 'precisa-senha' ? 'precisa-senha' : 'fora', assinante: null })
    } catch {
      // extensao removida ou sessao corrompida: volta para a tela de entrar
      set({ fase: 'fora', assinante: null })
    }
  },

  async entrarComExtensao() {
    const assinante = await loginExtensao()
    await salvarSessao({ metodo: 'nip07', pubkey: assinante.pubkey })
    set({ fase: 'dentro', assinante })
  },

  async entrarComAssinante(assinante, credencial) {
    await salvarSessao({ metodo: 'nip46', pubkey: assinante.pubkey, credencial })
    set({ fase: 'dentro', assinante })
  },

  async entrarComNsec(texto, senha) {
    const lida = lerNsec(texto)
    if (!lida.ok) {
      throw new ErroLogin(lida.motivo === 'chave-publica' ? 'chave-publica' : 'chave-invalida')
    }
    const assinante = await abrirSessaoComChave(lida.chave, senha)
    set({ fase: 'dentro', assinante })
  },

  async confirmarIdentidade(chave, nome, senha) {
    const assinante = await abrirSessaoComChave(chave, senha)
    set({ fase: 'dentro', assinante })
    // Perfil e "melhor esforco": se os relays nao responderem, a pessoa ja esta dentro.
    void publicarNome(assinante, nome).catch(() => false)
  },

  async destravar(senha) {
    const assinante = await destravarSessao(senha)
    set({ fase: 'dentro', assinante })
  },

  async sair() {
    const { assinante } = get()
    await assinante?.encerrar().catch(() => {})
    await apagarTudoDoVoz()
    set({ fase: 'fora', assinante: null })
  },
}))
