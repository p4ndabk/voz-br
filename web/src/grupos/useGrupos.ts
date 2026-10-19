import { create } from 'zustand'
import { listarGrupos, obterGrupo, salvarGrupo } from './armazem'
import type { Grupo } from './tipos'

const ordem = (a: Grupo, b: Grupo) =>
  (b.ultimaMensagemEm ?? b.alteradoEm ?? b.criadoEm) -
  (a.ultimaMensagemEm ?? a.alteradoEm ?? a.criadoEm)

interface EstadoGrupos {
  grupos: Grupo[]
  carregada: boolean
  carregar(): Promise<void>
  // Grava e atualiza a lista. Devolve o grupo gravado.
  gravar(grupo: Grupo): Promise<Grupo>
  // Marca como lido (ao abrir a conversa do grupo).
  marcarVisto(id: string): Promise<void>
}

// RN-WEB-CONVERSAS-012: mesma ideia da lista de conversas: uma alteracao de cada vez.
let fila: Promise<unknown> = Promise.resolve()
function exclusivo<T>(trabalho: () => Promise<T>): Promise<T> {
  const proxima = fila.then(trabalho, trabalho)
  fila = proxima.catch(() => {})
  return proxima
}

export const useGrupos = create<EstadoGrupos>((definir) => ({
  grupos: [],
  carregada: false,

  carregar() {
    return exclusivo(async () => {
      const salvos = await listarGrupos()
      definir({ grupos: salvos.sort(ordem), carregada: true })
    })
  },

  gravar(grupo) {
    return exclusivo(async () => {
      await salvarGrupo(grupo)
      definir((e) => ({
        grupos: [...e.grupos.filter((g) => g.id !== grupo.id), grupo].sort(ordem),
      }))
      return grupo
    })
  },

  marcarVisto(id) {
    return exclusivo(async () => {
      const g = await obterGrupo(id)
      if (!g || !g.naoLidas) return
      const visto = {
        ...g,
        naoLidas: 0,
        lidaAte: Math.max(g.lidaAte ?? 0, g.ultimaMensagemEm ?? 0),
      }
      await salvarGrupo(visto)
      definir((e) => ({ grupos: e.grupos.map((x) => (x.id === id ? visto : x)) }))
    })
  },
}))
