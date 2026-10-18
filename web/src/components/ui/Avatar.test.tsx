import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

function desenho(semente: string): string {
  const { container } = render(<Avatar semente={semente} />)
  return container.querySelector('svg')!.innerHTML
}

describe('Avatar', () => {
  it('a mesma semente gera sempre o mesmo desenho', () => {
    expect(desenho('maria')).toBe(desenho('maria'))
  })

  it('sementes diferentes geram desenhos diferentes', () => {
    expect(desenho('maria')).not.toBe(desenho('joao'))
  })
})
