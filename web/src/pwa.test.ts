import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registrarServiceWorker } from './pwa'

const publico = (arquivo: string) => resolve(__dirname, '../public', arquivo)

describe('PWA', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('RN-WEB-PWA-001: em desenvolvimento nao registra service worker', () => {
    const registrar = vi.fn()
    vi.stubGlobal('navigator', { serviceWorker: { register: registrar } })
    registrarServiceWorker(false, '/')
    window.dispatchEvent(new Event('load'))
    expect(registrar).not.toHaveBeenCalled()
  })

  it('RN-WEB-PWA-001: em producao registra sob o caminho-base', () => {
    const registrar = vi.fn(async () => ({}))
    vi.stubGlobal('navigator', { serviceWorker: { register: registrar } })
    registrarServiceWorker(true, '/voz-br/')
    window.dispatchEvent(new Event('load'))
    expect(registrar).toHaveBeenCalledWith('/voz-br/sw.js', { scope: '/voz-br/' })
  })

  it('RN-WEB-PWA-001: navegador sem service worker segue sem erro', () => {
    vi.stubGlobal('navigator', {})
    expect(() => registrarServiceWorker(true, '/')).not.toThrow()
  })

  it('RN-WEB-PWA-003: o manifesto e instalavel e seus icones existem', () => {
    const m = JSON.parse(readFileSync(publico('manifest.webmanifest'), 'utf8'))
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('./')
    expect(m.scope).toBe('./')
    const tamanhos = m.icons.map((i: { sizes: string }) => i.sizes)
    expect(tamanhos).toContain('192x192')
    expect(tamanhos).toContain('512x512')
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
    for (const icone of m.icons) expect(existsSync(publico(icone.src))).toBe(true)
  })

  it('RN-WEB-PWA-002: o service worker so guarda arquivos do proprio site e ignora o que nao e GET', () => {
    const sw = readFileSync(publico('sw.js'), 'utf8')
    expect(sw).toContain("pedido.method !== 'GET'")
    expect(sw).toContain('url.origin !== self.location.origin')
  })
})
