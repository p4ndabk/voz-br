import { create } from 'zustand'
import {
  desdeNesteNavegador,
  fotoLiberada,
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
  // RN-WEB-PRIVACIDADE-005: a pessoa pede para ver a foto de alguem desconhecido.
  liberarFoto(pubkey: string): Promise<void>
}

// Hook: a foto desta pessoa pode ser baixada?
export const useFotoLiberada = (pubkey: string) =>
  useConversas((estado) => fotoLiberada(estado.conversas.find((c) => c.pubkey === pubkey)))

// RN-WEB-CONVERSAS-012: ler, alterar e gravar uma conversa nao pode se misturar com outra alteracao
// (uma mensagem que chega enquanto a conversa e marcada como lida, ou enquanto a lista recarrega); senao a
// gravacao mais lenta devolve a lista a um estado antigo e ela so "atualiza" quando alguem abre um chat.
let fila: Promise<unknown> = Promise.resolve()
function exclusivo<T>(trabalho: () => Promise<T>): Promise<T> {
  const proxima = fila.then(trabalho, trabalho)
  fila = proxima.catch(() => {})
  return proxima
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

    carregar() {
      return exclusivo(async () => {
        const salvas = await listarConversas()
        definir({ conversas: salvas.sort(ordemRecente), carregada: true })
      })
    },

    abrirOuCriar(pubkey, relaysDica = []) {
      return exclusivo(async () => {
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
          conheco: true,
        }
        await gravar(conversa)
        return { conversa, criada: true }
      })
    },

    registrarRecebida(pubkey, quando, trecho, relaysDica = [], propria = false) {
      return exclusivo(async () => {
        const existente = await obterConversa(pubkey)
        const base: Conversa = existente ?? {
          pubkey,
          relaysDica,
          criadaEm: quando,
          novaPessoa: !propria,
          conheco: propria,
          lidaAte: await desdeNesteNavegador(Math.floor(Date.now() / 1000)),
        }
        // RN-WEB-CONVERSAS-010 e 011: so conta o que e do outro e mais novo que o ja visto.
        const vistoAte = base.lidaAte ?? base.ultimaMensagemEm ?? 0
        const naoLida = !propria && quando > vistoAte
        const atualizada: Conversa = {
          ...base,
          conheco: base.conheco || propria ? true : base.conheco,
          naoLidas: (base.naoLidas ?? 0) + (naoLida ? 1 : 0),
          ultimaMensagemEm: Math.max(base.ultimaMensagemEm ?? 0, quando),
          trecho: quando >= (base.ultimaMensagemEm ?? 0) ? trecho : base.trecho,
        }
        await gravar(atualizada)
        return atualizada
      })
    },

    marcarVista(pubkey) {
      return exclusivo(async () => {
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
      })
    },

    registrarApagamento(pubkey, limite, por) {
      return exclusivo(async () => {
        const existente = await obterConversa(pubkey)
        const base: Conversa = existente ?? {
          pubkey,
          relaysDica: [],
          criadaEm: limite,
          novaPessoa: por === 'outro',
          conheco: por === 'eu',
        }
        await gravar({
          ...base,
          apagadoAte: Math.max(base.apagadoAte ?? 0, limite),
          apagadoPor: por,
          ultimaMensagemEm: limite,
          trecho: undefined,
        })
      })
    },

    liberarFoto(pubkey) {
      return exclusivo(async () => {
        const existente = await obterConversa(pubkey)
        if (existente && !fotoLiberada(existente)) await gravar({ ...existente, conheco: true })
      })
    },

    remover(pubkey) {
      return exclusivo(async () => {
        // RN-WEB-SYNC-003: fica um marcador (escondido da lista) para a remocao tambem valer nos outros aparelhos.
        const existente = await obterConversa(pubkey)
        if (existente) {
          await salvarConversa({ ...existente, removidaEm: Math.floor(Date.now() / 1000) })
        }
        definir((estado) => ({ conversas: estado.conversas.filter((c) => c.pubkey !== pubkey) }))
      })
    },
  }
})
