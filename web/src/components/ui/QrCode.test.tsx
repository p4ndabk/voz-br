import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QrCode } from './QrCode'

describe('QrCode', () => {
  it('desenha modulos em SVG e muda conforme o texto', () => {
    const a = render(<QrCode texto="nostrconnect://aaa" rotulo="codigo" />)
    const b = render(<QrCode texto="nostrconnect://bbb" rotulo="codigo" />)
    const svgA = a.container.querySelector('svg')!
    expect(svgA).toHaveAttribute('aria-label', 'codigo')
    expect(svgA.querySelectorAll('rect').length).toBeGreaterThan(50)
    expect(a.container.innerHTML).not.toBe(b.container.innerHTML)
  })
})
