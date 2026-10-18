import { maisRecente } from '@/nostr/perfis'
import { eventoEmCache, usePerfis } from '@/nostr/perfisStore'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import {
  mesclarPerfil,
  normalizarCampos,
  temErros,
  validarCampos,
  type CamposEditaveis,
} from './campos'

export interface PerfilAtual {
  // O content do kind 0 mais recente que conseguimos achar ({} se nao ha nenhum).
  conteudo: Record<string, unknown>
  criadoEm: number
  // false: nenhum relay nem o cache tem um perfil seu. Pode ser conta nova, ou relays fora do ar.
  encontrado: boolean
}

function lerConteudo(texto: string): Record<string, unknown> {
  try {
    const dados: unknown = JSON.parse(texto)
    return typeof dados === 'object' && dados !== null && !Array.isArray(dados)
      ? (dados as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

// RN-WEB-PERFIL-010: antes de editar, busca o perfil mais recente nos relays (o cache pode estar velho
// e outro aplicativo pode ter mudado o perfil). Vale o mais novo entre os relays e o cache.
export async function carregarPerfilAtual(pubkey: string): Promise<PerfilAtual> {
  const [doCache, dosRelays] = await Promise.all([
    eventoEmCache(pubkey),
    relays.consultar({ kinds: [0], authors: [pubkey], limit: 5 }).catch(() => [] as unknown[]),
  ])
  const recebido = maisRecente(dosRelays, pubkey)
  const candidatos = [recebido, doCache?.evento].filter((e) => e != null)
  const evento = candidatos.sort((a, b) => b.created_at - a.created_at)[0]
  if (!evento) return { conteudo: {}, criadoEm: 0, encontrado: false }
  return { conteudo: lerConteudo(evento.content), criadoEm: evento.created_at, encontrado: true }
}

export type MotivoErroSalvar = 'invalido' | 'nenhum-relay'

export class ErroSalvarPerfil extends Error {
  constructor(public readonly motivo: MotivoErroSalvar) {
    super(motivo)
    this.name = 'ErroSalvarPerfil'
  }
}

// Publica o perfil novo, preservando o resto dos campos. RN-WEB-PERFIL-013: so conta como salvo
// se ao menos um relay respondeu OK; so entao a tela e o cache mudam.
export async function salvarPerfil(
  assinante: Assinante,
  atual: PerfilAtual,
  novos: CamposEditaveis,
  agora = Math.floor(Date.now() / 1000),
): Promise<{ aceitos: number; total: number; publicado: PerfilAtual }> {
  if (temErros(validarCampos(novos))) throw new ErroSalvarPerfil('invalido')
  const conteudo = mesclarPerfil(atual.conteudo, normalizarCampos(novos))
  const evento = await assinante.assinar({
    kind: 0,
    // Tem de ser mais novo que o perfil que estamos substituindo, senao o relay o descarta.
    created_at: Math.max(agora, atual.criadoEm + 1),
    tags: [],
    content: JSON.stringify(conteudo),
  })
  const { aceitos, total } = await relays.publicar(evento)
  if (aceitos === 0) throw new ErroSalvarPerfil('nenhum-relay')
  await usePerfis.getState().definirPerfil(assinante.pubkey, evento)
  return { aceitos, total, publicado: { conteudo, criadoEm: evento.created_at, encontrado: true } }
}
