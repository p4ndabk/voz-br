import {
  abrirEmbrulho,
  criarEmbrulhos,
  KIND_EMBRULHO,
  KIND_RELAYS_DM,
  lerPedidoDeApagar,
  parceiroDoRumor,
  type Embrulho,
  type Rumor,
} from '@/nostr/dm'
import { relaysPadrao, TEMPO_PUBLICAR_MS } from '@/nostr/config'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import {
  embrulhosDaMensagem,
  listarTodasMensagens,
  obterMensagem,
  registrarRelaysDoEmbrulho,
  salvarEmbrulho,
  type Mensagem,
} from './armazemMensagens'
import { obterConversa } from './armazem'
import { aplicarPedidoRecebido, processarFila } from './apagar'
import { meusRelaysDm, relaysDeDmDe, relaysDoAmigo } from './relaysDm'
import { useConversas } from './useConversas'
import { useMensagens } from './useMensagens'

// RN-WEB-MENSAGENS-005
export const LIMITE_MENSAGEM = 4000

export type ValidacaoTexto = 'ok' | 'vazio' | 'longo'

export function validarTexto(texto: string): ValidacaoTexto {
  if (texto.trim() === '') return 'vazio'
  return texto.length > LIMITE_MENSAGEM ? 'longo' : 'ok'
}

const trechoDe = (texto: string) => texto.replace(/\s+/g, ' ').trim().slice(0, 80)
const agoraEmSegundos = () => Math.floor(Date.now() / 1000)

async function publicarEm(embrulho: Embrulho, urls: string[]): Promise<number> {
  const { aceitos } = await relays.publicar(embrulho.evento, TEMPO_PUBLICAR_MS, urls)
  return aceitos
}

// RN-WEB-MENSAGENS-009: so e "enviada" se ao menos um relay do amigo respondeu OK.
async function publicarEPassar(
  minhaPubkey: string,
  mensagem: Mensagem,
  paraAmigo: Embrulho,
  paraMim: Embrulho,
): Promise<void> {
  const conversa = await obterConversa(mensagem.conversa)
  const [amigo, meus] = await Promise.all([
    relaysDoAmigo(mensagem.conversa, conversa?.relaysDica ?? []),
    meusRelaysDm(minhaPubkey),
  ])
  await Promise.all([
    registrarRelaysDoEmbrulho(paraAmigo.evento.id, amigo.urls),
    registrarRelaysDoEmbrulho(paraMim.evento.id, meus),
  ])
  const [aceitosAmigo] = await Promise.all([
    publicarEm(paraAmigo, amigo.urls),
    // A copia propria e melhor esforco: nao decide o estado da mensagem.
    publicarEm(paraMim, meus).catch(() => 0),
  ])
  await useMensagens.getState().atualizar(mensagem.id, {
    estado: aceitosAmigo > 0 ? 'enviada' : 'falhou',
    semRelaysDm: amigo.semRelaysDm,
  })
}

async function guardarEmbrulho(
  embrulho: Embrulho,
  conversa: string,
  rumorId: string,
  paraMim: boolean,
) {
  await salvarEmbrulho({
    id: embrulho.evento.id,
    conversa,
    rumorId,
    evento: embrulho.evento,
    chaveEfemera: embrulho.chaveEfemera,
    paraMim,
    relays: [],
  })
}

export async function enviarMensagem(
  assinante: Assinante,
  amigo: string,
  texto: string,
): Promise<Mensagem> {
  if (validarTexto(texto) !== 'ok') throw new Error('mensagem invalida')
  const limpo = texto.trim()
  const conversa = await obterConversa(amigo)
  const { rumor, paraAmigo, paraMim } = await criarEmbrulhos(
    assinante,
    amigo,
    limpo,
    conversa?.relaysDica[0],
  )
  const mensagem: Mensagem = {
    id: rumor.id,
    conversa: amigo,
    autor: assinante.pubkey,
    texto: limpo,
    criadoEm: rumor.created_at,
    estado: 'enviando',
  }
  await useMensagens.getState().inserir(mensagem)
  await Promise.all([
    guardarEmbrulho(paraAmigo, amigo, rumor.id, false),
    guardarEmbrulho(paraMim, amigo, rumor.id, true),
  ])
  await useConversas
    .getState()
    .registrarRecebida(amigo, rumor.created_at, trechoDe(limpo), [], true)

  await publicarEPassar(assinante.pubkey, mensagem, paraAmigo, paraMim).catch(() =>
    useMensagens.getState().atualizar(mensagem.id, { estado: 'falhou' }),
  )
  return mensagem
}

// "Tentar de novo": reenvia os MESMOS embrulhos, entao o balao nao duplica.
export async function reenviarMensagem(assinante: Assinante, id: string): Promise<void> {
  const mensagem = await obterMensagem(id)
  if (!mensagem || mensagem.estado === 'enviada') return
  const salvos = await embrulhosDaMensagem(id)
  const amigo = salvos.find((e) => !e.paraMim)
  const meu = salvos.find((e) => e.paraMim)
  if (!amigo || !meu) return
  await useMensagens.getState().atualizar(id, { estado: 'enviando' })
  const comoEmbrulho = (e: typeof amigo, destinatario: string): Embrulho => ({
    evento: e.evento,
    chaveEfemera: e.chaveEfemera,
    destinatario,
  })
  await publicarEPassar(
    assinante.pubkey,
    mensagem,
    comoEmbrulho(amigo, mensagem.conversa),
    comoEmbrulho(meu, assinante.pubkey),
  ).catch(() => useMensagens.getState().atualizar(id, { estado: 'falhou' }))
}

async function receberRumor(minhaPubkey: string, rumor: Rumor): Promise<void> {
  const parceiro = parceiroDoRumor(rumor, minhaPubkey)
  if (!parceiro || parceiro === minhaPubkey) return
  const propria = rumor.pubkey === minhaPubkey
  // RN-WEB-APAGAR-009: o que foi apagado nao volta, mesmo que um relay reentregue o embrulho.
  const conversa = await obterConversa(parceiro)
  if (conversa?.apagadoAte !== undefined && rumor.created_at <= conversa.apagadoAte) return
  // RN-WEB-APAGAR-007: o pedido so atinge a conversa com quem o enviou, entao ninguem consegue
  // apagar a sua conversa com um terceiro.
  const limite = lerPedidoDeApagar(rumor)
  if (limite !== null) {
    await aplicarPedidoRecebido(minhaPubkey, parceiro, limite, propria ? 'eu' : 'outro')
    return
  }
  const inserida = await useMensagens.getState().inserir({
    id: rumor.id,
    conversa: parceiro,
    autor: rumor.pubkey,
    texto: rumor.content,
    criadoEm: rumor.created_at,
    estado: propria ? 'enviada' : 'recebida',
  })
  if (!inserida) return
  const dica = rumor.tags.find((t) => t[0] === 'p' && t[1] === minhaPubkey)?.[2]
  await useConversas
    .getState()
    .registrarRecebida(
      parceiro,
      rumor.created_at,
      trechoDe(rumor.content),
      dica ? [dica] : [],
      propria,
    )
}

// RN-WEB-MENSAGENS-001/006: assina os embrulhos enderecados a mim, abre um de cada vez e
// ignora o que nao for mensagem valida. Devolve a funcao que encerra.
export function iniciarRecebimento(assinante: Assinante): () => void {
  let parado = false
  let cancelar: (() => void) | undefined
  const vistos = new Set<string>()
  let fila: Promise<void> = Promise.resolve()

  const aoEvento = (evento: unknown) => {
    const id = (evento as { id?: unknown } | null)?.id
    if (typeof id !== 'string' || vistos.has(id)) return
    vistos.add(id)
    fila = fila.then(async () => {
      if (parado) return
      const rumor = await abrirEmbrulho(assinante, evento)
      if (rumor && !parado) await receberRumor(assinante.pubkey, rumor)
    })
  }

  void meusRelaysDm(assinante.pubkey).then((urls) => {
    if (parado) return
    cancelar = relays.inscrever(
      { kinds: [KIND_EMBRULHO], '#p': [assinante.pubkey], limit: 500 },
      aoEvento,
      urls,
    )
  })

  return () => {
    parado = true
    cancelar?.()
  }
}

// Primeiro login: sem lista de relays de DM (kind 10050), publica uma com os relays padrao.
export async function garantirRelaysDm(assinante: Assinante): Promise<void> {
  if ((await relaysDeDmDe(assinante.pubkey)).length > 0) return
  const evento = await assinante.assinar({
    kind: KIND_RELAYS_DM,
    created_at: agoraEmSegundos(),
    tags: relaysPadrao.map((url) => ['relay', url]),
    content: '',
  })
  await relays.publicar(evento)
}

// Mensagem que ficou "enviando" porque a pagina fechou no meio vira "falhou" (com "Tentar de novo").
async function recuperarEnvios(): Promise<void> {
  const todas = await listarTodasMensagens()
  await Promise.all(
    todas
      .filter((m) => m.estado === 'enviando')
      .map((m) => useMensagens.getState().atualizar(m.id, { estado: 'falhou' })),
  )
}

export function iniciarMensageria(assinante: Assinante): () => void {
  void recuperarEnvios()
  void garantirRelaysDm(assinante).catch(() => {})
  void processarFila().catch(() => {})
  const pararRecebimento = iniciarRecebimento(assinante)
  // RN-WEB-APAGAR-003: pedidos que nao puderam sair saem quando algum relay volta.
  const pararFila = relays.assinar(() => {
    if (relays.conectados() > 0) void processarFila().catch(() => {})
  })
  return () => {
    pararRecebimento()
    pararFila()
  }
}
