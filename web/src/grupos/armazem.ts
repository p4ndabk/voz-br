import { del } from 'idb-keyval'
import { gravarCofre, lerCofre, listarCofre } from '@/nostr/cofre'
import type { Grupo } from './tipos'

// Os grupos ficam so no IndexedDB deste navegador, cifrados com a senha da conta (RN-WEB-PRIVACIDADE-007).
const PREFIXO = 'voz:grupo:'

export const listarGrupos = () => listarCofre<Grupo>(PREFIXO)
export const obterGrupo = (id: string) => lerCofre<Grupo>(PREFIXO + id)
export const salvarGrupo = (grupo: Grupo) => gravarCofre(PREFIXO + grupo.id, grupo)
export const removerGrupoSalvo = (id: string) => del(PREFIXO + id)
