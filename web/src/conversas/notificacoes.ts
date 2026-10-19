import { t } from '@/i18n/pt-BR'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'

// RN-WEB-NOTIF-001 a 003: o aviso do navegador e opcional, so pede permissao quando a pessoa liga,
// so aparece com a aba em segundo plano e nunca mostra o conteudo da mensagem.
const CHAVE = 'voz:notificacoes'

export type EstadoNotificacoes = 'indisponivel' | 'bloqueada' | 'desligada' | 'ligada'

const suportado = () => typeof Notification !== 'undefined'

function preferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE) === 'on'
  } catch {
    return false
  }
}

export function estadoNotificacoes(): EstadoNotificacoes {
  if (!suportado()) return 'indisponivel'
  if (Notification.permission === 'denied') return 'bloqueada'
  return Notification.permission === 'granted' && preferencia() ? 'ligada' : 'desligada'
}

export async function ligarNotificacoes(): Promise<EstadoNotificacoes> {
  if (!suportado()) return 'indisponivel'
  const permissao =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
  try {
    if (permissao === 'granted') localStorage.setItem(CHAVE, 'on')
  } catch {
    // Sem armazenamento: o aviso vale so ate recarregar a pagina.
  }
  return estadoNotificacoes()
}

export function desligarNotificacoes(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada a limpar
  }
}

export function notificarNovaMensagemDeGrupo(id: string, nome: string): void {
  if (estadoNotificacoes() !== 'ligada' || document.visibilityState !== 'hidden') return
  new Notification(t.notificacoes.titulo, {
    body: t.notificacoes.corpoGrupo(nome),
    tag: `grupo:${id}`,
  })
}

export function notificarNovaMensagem(pubkey: string): void {
  if (estadoNotificacoes() !== 'ligada' || document.visibilityState !== 'hidden') return
  const nome = nomeExibido(usePerfis.getState().perfis[pubkey], pubkey).texto
  new Notification(t.notificacoes.titulo, { body: t.notificacoes.corpo(nome), tag: pubkey })
}
