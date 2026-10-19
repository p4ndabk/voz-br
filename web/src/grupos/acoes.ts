import type { Assinante } from '@/nostr/signer/tipos'
import { convidar, criarGrupo, passarAdmin, podeSair, remover, type ErroAdmin } from './administrar'
import { obterGrupo } from './armazem'
import {
  avisarEncerramento,
  avisarSaida,
  enviarConvites,
  pedirLimpezaGeral,
  publicarMembros,
  responderConvite,
} from './enviar'
import { limparGrupoLocal } from './limpar'
import type { Grupo } from './tipos'
import { useGrupos } from './useGrupos'

// As acoes que a tela chama. Cada uma muda o grupo aqui e depois avisa quem precisa saber.
export type ResultadoAcao =
  { ok: true; grupo: Grupo } | { ok: false; erro: ErroAdmin | 'sem-grupo' }

const agora = () => Math.floor(Date.now() / 1000)

function novoId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

async function doAdmin(
  id: string,
  mudar: (grupo: Grupo) => ReturnType<typeof criarGrupo>,
): Promise<ResultadoAcao> {
  const grupo = await obterGrupo(id)
  if (!grupo) return { ok: false, erro: 'sem-grupo' }
  const r = mudar(grupo)
  if (!r.ok) return r
  await useGrupos.getState().gravar(r.grupo)
  return r
}

// RN-WEB-GRUPOS-002: quem cria e o admin; os convidados so entram se aceitarem.
export async function criarNovoGrupo(
  assinante: Assinante,
  nome: string,
  convidados: string[],
  meuNome: string,
): Promise<ResultadoAcao> {
  const r = criarGrupo(assinante.pubkey, nome, convidados, novoId(), agora())
  if (!r.ok) return r
  await useGrupos.getState().gravar(r.grupo)
  await enviarConvites(assinante, r.grupo, meuNome, r.grupo.pendentes)
  return r
}

// RN-WEB-GRUPOS-004: aceitar so avisa o admin; o grupo vira "ativo" quando a lista nova chega.
export async function aceitarConvite(
  assinante: Assinante,
  id: string,
  meuNome: string,
): Promise<void> {
  const grupo = await obterGrupo(id)
  if (!grupo || grupo.estado !== 'convidado') return
  await responderConvite(assinante, grupo, true, meuNome)
}

export async function recusarConvite(
  assinante: Assinante,
  id: string,
  meuNome: string,
): Promise<void> {
  const grupo = await obterGrupo(id)
  if (!grupo || grupo.estado !== 'convidado') return
  await useGrupos.getState().gravar({ ...grupo, estado: 'saiu' })
  await responderConvite(assinante, grupo, false, meuNome).catch(() => {})
}

// RN-WEB-GRUPOS-003
export async function convidarPessoa(
  assinante: Assinante,
  id: string,
  pessoa: string,
  meuNome: string,
): Promise<ResultadoAcao> {
  const r = await doAdmin(id, (g) => convidar(g, assinante.pubkey, pessoa, agora()))
  if (r.ok) await enviarConvites(assinante, r.grupo, meuNome, [pessoa])
  return r
}

// Tira um membro ou cancela um convite; a pessoa tambem recebe a lista nova para saber.
export async function removerPessoa(
  assinante: Assinante,
  id: string,
  pessoa: string,
): Promise<ResultadoAcao> {
  const r = await doAdmin(id, (g) => remover(g, assinante.pubkey, pessoa, agora()))
  if (r.ok) await publicarMembros(assinante, r.grupo, [pessoa]).catch(() => {})
  return r
}

// RN-WEB-GRUPOS-006
export async function passarOCargo(
  assinante: Assinante,
  id: string,
  novoAdmin: string,
): Promise<ResultadoAcao> {
  const r = await doAdmin(id, (g) => passarAdmin(g, assinante.pubkey, novoAdmin, agora()))
  if (r.ok) await publicarMembros(assinante, r.grupo).catch(() => {})
  return r
}

export async function sairDoGrupo(
  assinante: Assinante,
  id: string,
  meuNome: string,
): Promise<boolean> {
  const grupo = await obterGrupo(id)
  if (!grupo || !podeSair(grupo, assinante.pubkey)) return false
  await useGrupos.getState().gravar({ ...grupo, estado: 'saiu' })
  await avisarSaida(assinante, grupo, meuNome).catch(() => {})
  return true
}

export async function encerrarGrupo(assinante: Assinante, id: string): Promise<boolean> {
  const grupo = await obterGrupo(id)
  if (!grupo || grupo.admin !== assinante.pubkey || grupo.estado === 'encerrado') return false
  await useGrupos.getState().gravar({ ...grupo, estado: 'encerrado' })
  await avisarEncerramento(assinante, grupo).catch(() => {})
  return true
}

// RN-WEB-GRUPOS-009: cada um limpa o seu; o admin tambem pode limpar o de todos.
export async function limparMeuHistorico(id: string, ate = agora()): Promise<number> {
  return limparGrupoLocal(id, ate)
}

export async function limparParaTodos(
  assinante: Assinante,
  id: string,
  meuNome: string,
  ate = agora(),
): Promise<boolean> {
  const grupo = await obterGrupo(id)
  if (!grupo || grupo.admin !== assinante.pubkey || grupo.estado !== 'ativo') return false
  await pedirLimpezaGeral(assinante, grupo, meuNome, ate).catch(() => {})
  await limparGrupoLocal(id, ate)
  return true
}
