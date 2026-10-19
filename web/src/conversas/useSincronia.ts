import { create } from 'zustand'
import { GRACA_PERFIL_MS, relaysPadrao, TEMPO_PUBLICAR_MS } from '@/nostr/config'
import {
  ID_LISTA_PORTATIL,
  KIND_LISTA_PORTATIL,
  lerListaPortatil,
  montarListaPortatil,
  type ConversaPortatil,
} from '@/nostr/listaPortatil'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import { listarTodasConversas, salvarConversa } from './armazem'
import { mesclar, paraPortatil, resumoDaLista } from './sincronia'
import { useConversas } from './useConversas'

// RN-WEB-SYNC-005: espera depois da ultima mudanca antes de publicar.
export const ESPERA_PUBLICAR_MS = 5_000
const CHAVE = 'voz:sincronia'

export type EstadoDaSincronia = 'parada' | 'sincronizando' | 'ok' | 'falhou'

// RN-WEB-SYNC-004: ligada por padrao; so "off" desliga.
function lerLigada(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'off'
  } catch {
    return true
  }
}

interface EstadoSincronia {
  ligada: boolean
  estado: EstadoDaSincronia
  // Instante (ms) da ultima sincronizacao que deu certo.
  ultimaEm?: number
  definirLigada(ligada: boolean): void
  sincronizarAgora(assinante: Assinante): Promise<void>
}

const agoraEmSegundos = () => Math.floor(Date.now() / 1000)

function relaysDaLista(): string[] {
  return [...new Set([...relays.snapshot().map((r) => r.url), ...relaysPadrao])]
}

async function buscarRemota(assinante: Assinante) {
  const eventos = await relays.consultar(
    {
      kinds: [KIND_LISTA_PORTATIL],
      authors: [assinante.pubkey],
      '#d': [ID_LISTA_PORTATIL],
      limit: 5,
    },
    undefined,
    relaysDaLista(),
    { suficiente: (achados) => achados.length > 0, gracaMs: GRACA_PERFIL_MS },
  )
  let melhor: { criadoEm: number; conversas: ConversaPortatil[] } | null = null
  for (const evento of eventos) {
    const lida = await lerListaPortatil(assinante, evento)
    if (lida && (!melhor || lida.criadoEm > melhor.criadoEm)) melhor = lida
  }
  return melhor
}

async function publicarLista(
  assinante: Assinante,
  lista: ConversaPortatil[],
  anterior: number,
): Promise<void> {
  const evento = await montarListaPortatil(
    assinante,
    lista,
    Math.max(agoraEmSegundos(), anterior + 1),
  )
  const { aceitos } = await relays.publicar(evento, TEMPO_PUBLICAR_MS, relaysDaLista())
  // RN-WEB-SYNC-005: sem nenhum relay aceitando, nao conta como sincronizada.
  if (aceitos === 0) throw new Error('nenhum relay aceitou a lista')
}

let emAndamento: Promise<void> | null = null

export const useSincronia = create<EstadoSincronia>((definir, obter) => ({
  ligada: lerLigada(),
  estado: 'parada',

  definirLigada(ligada) {
    try {
      if (ligada) localStorage.removeItem(CHAVE)
      else localStorage.setItem(CHAVE, 'off')
    } catch {
      // Sem armazenamento: vale so ate recarregar a pagina.
    }
    definir({ ligada, estado: ligada ? obter().estado : 'parada' })
  },

  // RN-WEB-SYNC-003: le a lista dos relays, mescla com a daqui e, se a uniao tem novidade, publica.
  sincronizarAgora(assinante) {
    if (!obter().ligada) return Promise.resolve()
    if (emAndamento) return emAndamento
    definir({ estado: 'sincronizando' })
    emAndamento = (async () => {
      try {
        let remota = await buscarRemota(assinante)
        // Sem lista e com relays no ar, tenta de novo antes de dar a lista como inexistente.
        if (!remota && relays.conectados() > 0) remota = await buscarRemota(assinante)
        const resultado = mesclar(await listarTodasConversas(), remota?.conversas ?? [])
        if (resultado.alteradas.length > 0) {
          await Promise.all(resultado.alteradas.map(salvarConversa))
          await useConversas.getState().carregar()
        }
        const temAlgo = resultado.portatil.length > 0
        if (resultado.remotoDesatualizado && temAlgo && (remota || relays.conectados() > 0)) {
          await publicarLista(assinante, resultado.portatil, remota?.criadoEm ?? 0)
        }
        definir({ estado: 'ok', ultimaEm: Date.now() })
      } catch {
        definir({ estado: 'falhou' })
      } finally {
        emAndamento = null
      }
    })()
    return emAndamento
  },
}))

const resumoDaTela = () => resumoDaLista(useConversas.getState().conversas.map(paraPortatil))

// Liga a sincronia da conta: restaura ao entrar, publica (com espera) a cada mudanca e tenta de novo
// quando a rede volta. Devolve a funcao que encerra.
export function iniciarSincronia(assinante: Assinante): () => void {
  let parado = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let resumo = resumoDaTela()

  const agendar = (espera: number) => {
    clearTimeout(timer)
    if (!useSincronia.getState().ligada) return
    timer = setTimeout(() => {
      if (!parado) void useSincronia.getState().sincronizarAgora(assinante)
    }, espera)
  }

  // Ao entrar: espera os relays conectarem um instante.
  agendar(1_500)

  // So muda o resumo quando algo que importa muda (criar, remover, apagar, dicas): nao a cada mensagem.
  const deixarDeObservarConversas = useConversas.subscribe((estado, anterior) => {
    if (estado.conversas === anterior.conversas) return
    const novo = resumoDaTela()
    if (novo === resumo) return
    resumo = novo
    agendar(ESPERA_PUBLICAR_MS)
  })

  // Ligar o interruptor sincroniza; falha anterior tenta de novo quando algum relay conecta.
  const deixarDeObservarEstado = useSincronia.subscribe((estado, anterior) => {
    if (estado.ligada && !anterior.ligada) agendar(0)
  })
  const deixarDeObservarRelays = relays.assinar(() => {
    if (useSincronia.getState().estado === 'falhou' && relays.conectados() > 0)
      agendar(ESPERA_PUBLICAR_MS)
  })

  return () => {
    parado = true
    clearTimeout(timer)
    deixarDeObservarConversas()
    deixarDeObservarEstado()
    deixarDeObservarRelays()
    useSincronia.setState({ estado: 'parada' })
  }
}
