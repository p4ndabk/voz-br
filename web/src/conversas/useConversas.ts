import { create } from 'zustand'
import {
  desdeNesteNavegador,
  estaVisivel,
  listarConversas,
  obterConversa,
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
  // Marca o historico como apagado ate `limite` (segundos). Cria a conversa se nao existir, para
  // que mensagens antigas reenviadas pelos relays nao a ressuscitem.
  registrarApagamento(pubkey: string, limite: number, por: 'eu' | 'outro'): Promise<void>
  // RN-WEB-CONVERSAS-008: tira da lista; nao apaga mensagens nem avisa o amigo.
  remover(pubkey: string): Promise<void>
}

export const useConversas = create<EstadoConversas>((definir, obter) => {
  const gravar = async (conversa: Conversa) => {
    await salvarConversa(conversa)
    // Conversa removida (e sem novidade depois) continua guardada, mas fora da lista.
    const resto = (estado: { conversas: Conversa[] }) =>
      estado.conversas.filter((c) => c.pubkey !== conversa.pubkey)
    definir((estado) => ({
      conversas: estaVisivel(conversa)
        ? [...resto(estado), conversa].sort(ordemRecente)
        : resto(estado),
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
        // Reabrir uma conversa removida: o marcador de remocao continua, mas a reabertura e mais nova.
        const reaberta =
          existente.removidaEm !== undefined && !estaVisivel(existente)
            ? { ...existente, reabertaEm: Math.floor(Date.now() / 1000) }
            : existente
        if (reaberta !== existente || !obter().conversas.some((c) => c.pubkey === pubkey)) {
          await gravar(reaberta)
        }
        return { conversa: reaberta, criada: false }
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
        lidaAte: await desdeNesteNavegador(Math.floor(Date.now() / 1000)),
      }
      // RN-WEB-CONVERSAS-010 e 011: so conta o que e do outro e mais novo que o ja visto.
      const vistoAte = base.lidaAte ?? base.ultimaMensagemEm ?? 0
      const naoLida = !propria && quando > vistoAte
      const atualizada: Conversa = {
        ...base,
        naoLidas: (base.naoLidas ?? 0) + (naoLida ? 1 : 0),
        ultimaMensagemEm: Math.max(base.ultimaMensagemEm ?? 0, quando),
        trecho: quando >= (base.ultimaMensagemEm ?? 0) ? trecho : base.trecho,
      }
      await gravar(atualizada)
      return atualizada
    },

    async marcarVista(pubkey) {
      const existente = await obterConversa(pubkey)
      if (!existente) return
      if (existente.novaPessoa || existente.naoLidas) {
        await gravar({
          ...existente,
          novaPessoa: false,
          naoLidas: 0,
          lidaAte: Math.max(existente.lidaAte ?? 0, existente.ultimaMensagemEm ?? 0),
        })
      }
    },

    async registrarApagamento(pubkey, limite, por) {
      const existente = await obterConversa(pubkey)
      const base: Conversa = existente ?? {
        pubkey,
        relaysDica: [],
        criadaEm: limite,
        novaPessoa: por === 'outro',
      }
      await gravar({
        ...base,
        apagadoAte: Math.max(base.apagadoAte ?? 0, limite),
        apagadoPor: por,
        ultimaMensagemEm: limite,
        trecho: undefined,
      })
    },

    async remover(pubkey) {
      // RN-WEB-SYNC-003: fica um marcador (escondido da lista) para a remocao tambem valer nos outros aparelhos.
      const existente = await obterConversa(pubkey)
      if (existente) {
        await salvarConversa({ ...existente, removidaEm: Math.floor(Date.now() / 1000) })
      }
      definir((estado) => ({ conversas: estado.conversas.filter((c) => c.pubkey !== pubkey) }))
    },
  }
})
