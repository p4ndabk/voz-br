import { beforeEach, describe, expect, it, vi } from 'vitest'
import { estadoNotificacoes, ligarNotificacoes, notificarNovaMensagem } from './notificacoes'

vi.mock('@/nostr/relays', () => ({ relays: { publicar: vi.fn(), consultar: vi.fn() } }))

const criadas: { titulo: string; opcoes: NotificationOptions }[] = []
function simular(permissao: NotificationPermission, pedir: NotificationPermission = 'granted') {
  class Falsa {
    static permission = permissao
    static requestPermission = vi.fn(async () => {
      Falsa.permission = pedir
      return pedir
    })
    constructor(titulo: string, opcoes: NotificationOptions) {
      criadas.push({ titulo, opcoes })
    }
  }
  vi.stubGlobal('Notification', Falsa)
}
const aba = (estado: DocumentVisibilityState) =>
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(estado)

beforeEach(() => {
  criadas.length = 0
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('notificacoes', () => {
  it('RN-WEB-NOTIF-001: desligadas por padrao e nao pedem permissao sozinhas', () => {
    simular('default')
    expect(estadoNotificacoes()).toBe('desligada')
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('RN-WEB-NOTIF-001: ligar pede a permissao e passa a valer', async () => {
    simular('default')
    expect(await ligarNotificacoes()).toBe('ligada')
  })

  it('RN-WEB-NOTIF-001: permissao negada fica bloqueada', async () => {
    simular('default', 'denied')
    expect(await ligarNotificacoes()).toBe('bloqueada')
  })

  it('RN-WEB-NOTIF-002: o aviso nao leva o conteudo da mensagem', async () => {
    simular('granted')
    await ligarNotificacoes()
    aba('hidden')
    notificarNovaMensagem('a'.repeat(64))
    expect(criadas).toHaveLength(1)
    expect(criadas[0]?.opcoes.body).toMatch(/^Nova mensagem de /)
  })

  it('RN-WEB-NOTIF-003: com a aba visivel nao avisa', async () => {
    simular('granted')
    await ligarNotificacoes()
    aba('visible')
    notificarNovaMensagem('a'.repeat(64))
    expect(criadas).toHaveLength(0)
  })

  it('RN-WEB-NOTIF-001: desligadas, nao avisa mesmo com a aba escondida', () => {
    simular('granted')
    aba('hidden')
    notificarNovaMensagem('a'.repeat(64))
    expect(criadas).toHaveLength(0)
  })
})
