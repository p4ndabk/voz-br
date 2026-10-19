import { get, set } from 'idb-keyval'
import { create } from 'zustand'
import { KIND_RELAYS_DM, MAXIMO_RELAYS_DM, relaysDoEvento } from '@/nostr/dm'
import { relaysDePerfil, relaysPadrao } from '@/nostr/config'
import { normalizarRelay, relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import { definirMinhaLista, eventoRelaysDm } from './relaysDm'

export type MotivoRelayInvalido = 'formato' | 'duplicado' | 'limite'

// RN-WEB-RELAYS-007: so wss://, sem duplicados, no maximo MAXIMO_RELAYS_DM.
export function validarRelay(
  entrada: string,
  lista: readonly string[],
): { ok: true; url: string } | { ok: false; motivo: MotivoRelayInvalido } {
  const url = normalizarRelay(entrada.trim())
  if (!url || !url.startsWith('wss://') || url.length <= 'wss://'.length + 2) {
    return { ok: false, motivo: 'formato' }
  }
  if (lista.some((u) => u.toLowerCase() === url.toLowerCase()))
    return { ok: false, motivo: 'duplicado' }
  if (lista.length >= MAXIMO_RELAYS_DM) return { ok: false, motivo: 'limite' }
  return { ok: true, url }
}

export class ErroSalvarRelays extends Error {
  constructor(public readonly motivo: 'invalida' | 'nenhum-relay') {
    super(motivo)
    this.name = 'ErroSalvarRelays'
  }
}

interface Salvo {
  urls: string[]
  criadoEm: number
}

const chaveCache = (pubkey: string) => `voz:relays-dm:${pubkey}`

interface EstadoMeusRelays {
  pubkey: string | null
  // Lista em vigor (a publicada). Vazia = ninguem publicou nada, valem os relays padrao.
  lista: string[]
  criadoEm: number
  carregada: boolean
  carregar(pubkey: string): Promise<void>
  salvar(
    assinante: Assinante,
    nova: string[],
    agora?: number,
  ): Promise<{ aceitos: number; total: number }>
  limpar(): void
}

function aplicar(pubkey: string, urls: string[], criadoEm: number): Partial<EstadoMeusRelays> {
  definirMinhaLista(pubkey, urls)
  relays.definirRelays(urls.length > 0 ? urls : relaysPadrao)
  return { pubkey, lista: urls, criadoEm }
}

export const useMeusRelays = create<EstadoMeusRelays>((setEstado, getEstado) => ({
  pubkey: null,
  lista: [],
  criadoEm: 0,
  carregada: false,

  // Cache local primeiro (abre na hora e funciona sem rede); depois confirma nos relays e fica
  // com o mais novo.
  async carregar(pubkey) {
    const cache = await get<Salvo>(chaveCache(pubkey)).catch(() => undefined)
    if (cache && cache.urls.length > 0) setEstado(aplicar(pubkey, cache.urls, cache.criadoEm))
    const evento = await eventoRelaysDm(pubkey)
    if (getEstado().pubkey !== null && getEstado().pubkey !== pubkey) return
    const urls = relaysDoEvento(evento)
    if (evento && urls.length > 0 && evento.created_at > (cache?.criadoEm ?? 0)) {
      setEstado(aplicar(pubkey, urls, evento.created_at))
      await set(chaveCache(pubkey), { urls, criadoEm: evento.created_at } satisfies Salvo).catch(
        () => {},
      )
    }
    setEstado({ pubkey, carregada: true })
  },

  // RN-WEB-RELAYS-008: so vale se algum relay aceitou; vai para a lista antiga, a nova e os relays de perfil.
  async salvar(assinante, nova, agora = Math.floor(Date.now() / 1000)) {
    const urls = [...new Set(nova)]
    if (urls.length === 0 || urls.length > MAXIMO_RELAYS_DM) throw new ErroSalvarRelays('invalida')
    const { lista, criadoEm } = getEstado()
    const evento = await assinante.assinar({
      kind: KIND_RELAYS_DM,
      // Tem de ser mais novo que a lista que estamos substituindo, senao o relay a descarta.
      created_at: Math.max(agora, criadoEm + 1),
      tags: urls.map((url) => ['relay', url]),
      content: '',
    })
    const alvos = [
      ...new Set([...(lista.length > 0 ? lista : relaysPadrao), ...urls, ...relaysDePerfil]),
    ]
    const { aceitos, total } = await relays.publicar(evento, undefined, alvos)
    if (aceitos === 0) throw new ErroSalvarRelays('nenhum-relay')
    setEstado(aplicar(assinante.pubkey, urls, evento.created_at))
    await set(chaveCache(assinante.pubkey), {
      urls,
      criadoEm: evento.created_at,
    } satisfies Salvo).catch(() => {})
    return { aceitos, total }
  },

  // Ao sair: volta aos relays padrao e esquece a lista da conta anterior.
  limpar() {
    definirMinhaLista('', [])
    relays.definirRelays(relaysPadrao)
    setEstado({ pubkey: null, lista: [], criadoEm: 0, carregada: false })
  },
}))
