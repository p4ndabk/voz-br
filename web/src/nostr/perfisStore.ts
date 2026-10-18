import { get, set } from 'idb-keyval'
import type { NostrEvent } from 'nostr-tools'
import { create } from 'zustand'
import { lerPerfil, maisRecente, VALIDADE_CACHE_MS, type Perfil, type PerfilSalvo } from './perfis'
import { relays } from './relays'

// undefined = ainda nao carregou; null = carregou e a pessoa nao tem perfil.
type Entrada = Perfil | null | undefined

interface EstadoPerfis {
  perfis: Record<string, Entrada>
  carregar(pubkey: string): Promise<void>
  // Usado ao publicar o proprio perfil: a tela e o cache mudam na hora, sem esperar o relay.
  definirPerfil(pubkey: string, evento: NostrEvent): Promise<void>
}

const emAndamento = new Map<string, Promise<void>>()
const chaveCache = (pubkey: string) => `voz:perfil:${pubkey}`

export function eventoEmCache(pubkey: string): Promise<PerfilSalvo | undefined> {
  return get<PerfilSalvo>(chaveCache(pubkey)).catch(() => undefined)
}

async function carregarPerfil(pubkey: string, aplicar: (perfil: Perfil | null) => void) {
  const salvo = await get<PerfilSalvo>(chaveCache(pubkey)).catch(() => undefined)
  if (salvo) {
    aplicar(lerPerfil(salvo.evento))
    // RN-WEB-PERFIL-007: cache fresco dispensa a consulta.
    if (Date.now() - salvo.buscadoEm < VALIDADE_CACHE_MS) return
  }

  let eventos: unknown[]
  try {
    eventos = await relays.consultar({ kinds: [0], authors: [pubkey], limit: 5 })
  } catch {
    if (!salvo) aplicar(null)
    return
  }
  const recebido = maisRecente(eventos, pubkey)
  // Nunca troca um perfil novo do cache por um mais antigo vindo de relay atrasado.
  const evento =
    recebido && (!salvo || recebido.created_at >= salvo.evento.created_at)
      ? recebido
      : salvo?.evento
  if (!evento) return aplicar(null)
  aplicar(lerPerfil(evento))
  await set(chaveCache(pubkey), { evento, buscadoEm: Date.now() } satisfies PerfilSalvo).catch(
    () => {},
  )
}

export const usePerfis = create<EstadoPerfis>((definir) => ({
  perfis: {},
  carregar(pubkey) {
    const atual = emAndamento.get(pubkey)
    if (atual) return atual
    const tarefa = carregarPerfil(pubkey, (perfil) =>
      definir((estado) => ({ perfis: { ...estado.perfis, [pubkey]: perfil } })),
    ).finally(() => emAndamento.delete(pubkey))
    emAndamento.set(pubkey, tarefa)
    return tarefa
  },
  async definirPerfil(pubkey, evento) {
    await set(chaveCache(pubkey), { evento, buscadoEm: Date.now() } satisfies PerfilSalvo).catch(
      () => {},
    )
    definir((estado) => ({ perfis: { ...estado.perfis, [pubkey]: lerPerfil(evento) } }))
  },
}))
