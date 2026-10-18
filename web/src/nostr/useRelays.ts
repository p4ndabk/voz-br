import { useEffect, useSyncExternalStore } from 'react'
import { relays } from './relays'

export function useRelays() {
  useEffect(() => {
    relays.iniciar()
  }, [])
  const lista = useSyncExternalStore(
    (aviso) => relays.assinar(aviso),
    () => relays.snapshot(),
  )
  return {
    lista,
    conectados: lista.filter((r) => r.estado === 'conectado').length,
    total: lista.length,
  }
}
