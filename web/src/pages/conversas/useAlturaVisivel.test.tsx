import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAlturaVisivel } from './useAlturaVisivel'

function Caixa() {
  const estilo = useAlturaVisivel()
  return <div data-testid="caixa" style={estilo} />
}

class VisualViewportFalso extends EventTarget {
  offsetTop = 0
  height = 800
  scale = 1
  mudar(parcial: Partial<Pick<VisualViewportFalso, 'offsetTop' | 'height' | 'scale'>>) {
    Object.assign(this, parcial)
    this.dispatchEvent(new Event('resize'))
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('altura visivel (teclado do celular)', () => {
  it('RN-WEB-LAYOUT-007: sem visualViewport nao muda nada', () => {
    vi.stubGlobal('visualViewport', null)
    render(<Caixa />)
    expect(screen.getByTestId('caixa').getAttribute('style')).toBeNull()
  })

  it('RN-WEB-LAYOUT-007: o layout fica preso ao topo e com a altura da area visivel', () => {
    const vv = new VisualViewportFalso()
    vi.stubGlobal('visualViewport', vv)
    render(<Caixa />)
    const caixa = screen.getByTestId('caixa')
    expect(caixa).toHaveStyle({ position: 'fixed', top: '0px', height: '800px' })
  })

  it('RN-WEB-LAYOUT-007: com o teclado aberto a altura encolhe e o topo acompanha o deslocamento', () => {
    const vv = new VisualViewportFalso()
    vi.stubGlobal('visualViewport', vv)
    render(<Caixa />)
    act(() => vv.mudar({ height: 430, offsetTop: 120 }))
    expect(screen.getByTestId('caixa')).toHaveStyle({ top: '120px', height: '430px' })
    act(() => vv.mudar({ height: 800, offsetTop: 0 }))
    expect(screen.getByTestId('caixa')).toHaveStyle({ top: '0px', height: '800px' })
  })

  it('RN-WEB-LAYOUT-007: com zoom de pinca nao interfere', () => {
    const vv = new VisualViewportFalso()
    vi.stubGlobal('visualViewport', vv)
    render(<Caixa />)
    act(() => vv.mudar({ scale: 2, height: 400 }))
    expect(screen.getByTestId('caixa').style.position).toBe('')
    expect(screen.getByTestId('caixa').style.height).toBe('')
  })

  it('a pagina em si nao rola enquanto o layout esta montado e volta ao desmontar', () => {
    vi.stubGlobal('visualViewport', new VisualViewportFalso())
    document.documentElement.style.overflow = ''
    const { unmount } = render(<Caixa />)
    expect(document.documentElement.style.overflow).toBe('hidden')
    unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
