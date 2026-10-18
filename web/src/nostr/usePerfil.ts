import { useEffect } from 'react'
import type { Perfil } from './perfis'
import { usePerfis } from './perfisStore'

// undefined enquanto carrega; null se a pessoa nao tem perfil.
export function usePerfil(pubkey: string): Perfil | null | undefined {
  const perfil = usePerfis((estado) => estado.perfis[pubkey])
  const carregar = usePerfis((estado) => estado.carregar)
  useEffect(() => {
    void carregar(pubkey)
  }, [pubkey, carregar])
  return perfil
}
