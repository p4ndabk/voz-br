import { create } from 'zustand'
import {
  listarConversas,
  obterConversa,
  removerConversaSalva,
  salvarConversa,
  type Conversa,
} from './armazem'

const ordemRecente = (a: Conversa, b: Conversa) =>
  (b.ultimaMensagemEm ?? b.criadaEm) - (a.ultimaMensagemEm ?? a.criadaEm)

interface EstadoConversas {
  conversas: Conversa[]
  carregada: boolean
  carregar(): Promise<void>
  // RN-WEB-CONVERSAS-005: no maximo uma sala por pubkey; se ja existe, devolve a existente.
  abrirOuCriar(
    pubkey: string,
    relaysDica?: string[],
  ): Promise<{ conversa: Conversa; criada: boolean }>
  // Chamado ao chegar (ou enviar) mensagem. Cria a sala como "Nova pessoa" se nao existir, a nao
  // ser que a mensagem seja minha (ex.: escrita em outro aparelho).
  registrarRecebida(
    pubkey: string,
    quando: number,
    trecho?: string,
    relaysDica?: string[],
    propria?: boolean,
  ): Promise<Conversa>
  marcarVista(pubkey: string): Promise<void>
  // RN-WEB-CONVERSAS-008: tira da lista; nao apaga mensagens nem avisa o amigo.
  remover(pubkey: string): Promise<void>
}

export const useConversas = create<EstadoConversas>((definir, obter) => {
  const gravar = async (conversa: Conversa) => {
    await salvarConversa(conversa)
    definir((estado) => ({
      conversas: [...estado.conversas.filter((c) => c.pubkey !== conversa.pubkey), conversa].sort(
        ordemRecente,
      ),
    }))
  }

  return {
    conversas: [],
    carregada: false,

    async carregar() {
      const salvas = await listarConversas()
      definir({ conversas: salvas.sort(ordemRecente), carregada: true })
    },

    async abrirOuCriar(pubkey, relaysDica = []) {
      const existente = await obterConversa(pubkey)
      if (existente) {
        if (!obter().conversas.some((c) => c.pubkey === pubkey)) await gravar(existente)
        return { conversa: existente, criada: false }
      }
      const conversa: Conversa = {
        pubkey,
        relaysDica,
        criadaEm: Math.floor(Date.now() / 1000),
        novaPessoa: false,
      }
      await gravar(conversa)
      return { conversa, criada: true }
    },

    async registrarRecebida(pubkey, quando, trecho, relaysDica = [], propria = false) {
      const existente = await obterConversa(pubkey)
      const base: Conversa = existente ?? {
        pubkey,
        relaysDica,
        criadaEm: quando,
        novaPessoa: !propria,
      }
      const atualizada: Conversa = {
        ...base,
        ultimaMensagemEm: Math.max(base.ultimaMensagemEm ?? 0, quando),
        trecho: quando >= (base.ultimaMensagemEm ?? 0) ? trecho : base.trecho,
      }
      await gravar(atualizada)
      return atualizada
    },

    async marcarVista(pubkey) {
      const existente = await obterConversa(pubkey)
      if (existente?.novaPessoa) await gravar({ ...existente, novaPessoa: false })
    },

    async remover(pubkey) {
      await removerConversaSalva(pubkey)
      definir((estado) => ({ conversas: estado.conversas.filter((c) => c.pubkey !== pubkey) }))
    },
  }
})
