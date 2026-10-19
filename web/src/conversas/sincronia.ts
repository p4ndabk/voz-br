import type { Conversa } from './armazem'
import { MAXIMO_CONVERSAS_PORTATEIS, type ConversaPortatil } from '@/nostr/listaPortatil'

const MAXIMO_DICAS = 5

// RN-WEB-SYNC-002: o que sai do aparelho. Nunca o trecho nem o texto de mensagem.
export function paraPortatil(c: Conversa): ConversaPortatil {
  return {
    pubkey: c.pubkey,
    relaysDica: c.relaysDica.slice(0, MAXIMO_DICAS),
    criadaEm: c.criadaEm,
    // A data da ultima mensagem so vale a pena enviar se ha remocao (para saber se algo e mais novo).
    ultimaMensagemEm: c.removidaEm !== undefined ? c.ultimaMensagemEm : undefined,
    apagadoAte: c.apagadoAte,
    apagadoPor: c.apagadoPor,
    removidaEm: c.removidaEm,
    reabertaEm: c.reabertaEm,
  }
}

const maior = (a?: number, b?: number) =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b)
const menor = (a: number, b: number) => Math.min(a, b)

// Assinatura estavel de uma lista portatil, para saber se algo mudou.
export function resumoDaLista(lista: ConversaPortatil[]): string {
  const ordenada = [...lista].sort((a, b) => a.pubkey.localeCompare(b.pubkey))
  return JSON.stringify(
    ordenada.map((c) => [
      c.pubkey,
      [...c.relaysDica].sort(),
      c.criadaEm,
      c.ultimaMensagemEm ?? null,
      c.apagadoAte ?? null,
      c.apagadoPor ?? null,
      c.removidaEm ?? null,
      c.reabertaEm ?? null,
    ]),
  )
}

export interface ResultadoMescla {
  // Todas, inclusive as removidas: e o que fica guardado no aparelho.
  conversas: Conversa[]
  // Conversas que mudaram (ou nasceram) no aparelho por causa do que veio de fora.
  alteradas: Conversa[]
  // O que deve ser publicado: a uniao dos dois lados.
  portatil: ConversaPortatil[]
  // A uniao tem algo que a lista remota ainda nao tinha.
  remotoDesatualizado: boolean
}

// RN-WEB-SYNC-003: une a lista local com a remota sem perder remocao, apagado nem dica.
export function mesclar(locais: Conversa[], remotas: ConversaPortatil[]): ResultadoMescla {
  const porPubkey = new Map(locais.map((c) => [c.pubkey, c]))
  const alteradas: Conversa[] = []
  const resultado: Conversa[] = []

  for (const remota of remotas) {
    const local = porPubkey.get(remota.pubkey)
    porPubkey.delete(remota.pubkey)
    if (!local) {
      // Conversa que so existe fora: entra como lida (as mensagens ainda vem dos relays, e so as novas contam).
      const nova: Conversa = {
        pubkey: remota.pubkey,
        relaysDica: remota.relaysDica,
        criadaEm: remota.criadaEm,
        ultimaMensagemEm: remota.ultimaMensagemEm,
        novaPessoa: false,
        lidaAte: remota.ultimaMensagemEm ?? remota.criadaEm,
        apagadoAte: remota.apagadoAte,
        apagadoPor: remota.apagadoPor,
        removidaEm: remota.removidaEm,
        reabertaEm: remota.reabertaEm,
      }
      alteradas.push(nova)
      resultado.push(nova)
      continue
    }
    const apagadoAte = maior(local.apagadoAte, remota.apagadoAte)
    const apagadoPeloRemoto = (remota.apagadoAte ?? -1) > (local.apagadoAte ?? -1)
    const unida: Conversa = {
      ...local,
      relaysDica: [...new Set([...local.relaysDica, ...remota.relaysDica])].slice(0, MAXIMO_DICAS),
      criadaEm: menor(local.criadaEm, remota.criadaEm),
      ultimaMensagemEm: maior(local.ultimaMensagemEm, remota.ultimaMensagemEm),
      apagadoAte,
      apagadoPor: apagadoPeloRemoto ? remota.apagadoPor : local.apagadoPor,
      removidaEm: maior(local.removidaEm, remota.removidaEm),
      reabertaEm: maior(local.reabertaEm, remota.reabertaEm),
    }
    // O trecho de uma conversa com historico apagado pelo outro aparelho nao deve continuar na lista.
    if (apagadoPeloRemoto) unida.trecho = undefined
    if (resumoDaLista([paraPortatil(unida)]) !== resumoDaLista([paraPortatil(local)])) {
      alteradas.push(unida)
    }
    resultado.push(unida)
  }
  resultado.push(...porPubkey.values())

  const portatil = limitar(resultado.map(paraPortatil))
  const remotoDesatualizado = resumoDaLista(portatil) !== resumoDaLista(limitar(remotas))
  return { conversas: resultado, alteradas, portatil, remotoDesatualizado }
}

// Acima do teto, ficam as com atividade mais recente (removidas por ultimo).
function limitar(lista: ConversaPortatil[]): ConversaPortatil[] {
  if (lista.length <= MAXIMO_CONVERSAS_PORTATEIS) return lista
  const peso = (c: ConversaPortatil) =>
    c.removidaEm !== undefined ? -1 : (c.ultimaMensagemEm ?? c.criadaEm)
  return [...lista].sort((a, b) => peso(b) - peso(a)).slice(0, MAXIMO_CONVERSAS_PORTATEIS)
}
