import { create } from 'zustand'
import {
  listarMensagens,
  obterMensagem,
  salvarMensagem,
  type EstadoMensagem,
  type Mensagem,
} from './armazemMensagens'

// RN-WEB-MENSAGENS-007: a ordem e a do created_at do rumor (o do embrulho e falso de proposito).
const emOrdem = (a: Mensagem, b: Mensagem) => a.criadoEm - b.criadoEm || a.id.localeCompare(b.id)

interface EstadoMensagens {
  porConversa: Record<string, Mensagem[]>
  carregar(conversa: string): Promise<void>
  // Duplicada (mesmo id de rumor, vinda de outro relay ou da copia propria) e ignorada.
  inserir(mensagem: Mensagem): Promise<boolean>
  atualizar(id: string, mudanca: { estado?: EstadoMensagem; semRelaysDm?: boolean }): Promise<void>
}

export const useMensagens = create<EstadoMensagens>((definir, obter) => ({
  porConversa: {},

  async carregar(conversa) {
    const salvas = await listarMensagens(conversa)
    definir((e) => ({ porConversa: { ...e.porConversa, [conversa]: salvas.sort(emOrdem) } }))
  },

  async inserir(mensagem) {
    if (await obterMensagem(mensagem.id)) return false
    await salvarMensagem(mensagem)
    definir((e) => {
      const atuais = e.porConversa[mensagem.conversa] ?? []
      if (atuais.some((m) => m.id === mensagem.id)) return e
      return {
        porConversa: {
          ...e.porConversa,
          [mensagem.conversa]: [...atuais, mensagem].sort(emOrdem),
        },
      }
    })
    return true
  },

  async atualizar(id, mudanca) {
    const atual = (await obterMensagem(id)) ?? undefined
    if (!atual) return
    const nova = { ...atual, ...mudanca }
    await salvarMensagem(nova)
    const { porConversa } = obter()
    const lista = porConversa[nova.conversa]
    if (lista) {
      definir({
        porConversa: {
          ...porConversa,
          [nova.conversa]: lista.map((m) => (m.id === id ? nova : m)),
        },
      })
    }
  },
}))
