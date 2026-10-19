import { describe, expect, it } from 'vitest'
import {
  atualizar,
  brilhoDoFundo,
  corDaChama,
  criarMundo,
  criarParticula,
  DURACAO_MS,
  FIM_DA_EMISSAO_MS,
  MAX_PARTICULAS,
  opacidadeFinal,
  passo,
  progressoDaFrente,
  yDaFrente,
} from './motorDoFogo'

// Aleatorio determinista para os testes.
const sequencia = () => {
  let i = 0
  return () => {
    i = (i * 9301 + 49297) % 233280
    return i / 233280 || 0.5
  }
}

describe('fogo (motor de particulas)', () => {
  it('RN-WEB-APAGAR-010: a frente sobe de baixo para cima e para no topo', () => {
    expect(progressoDaFrente(0)).toBe(0)
    expect(progressoDaFrente(900)).toBeGreaterThan(0.2)
    expect(progressoDaFrente(900)).toBeLessThan(0.8)
    expect(progressoDaFrente(1600)).toBe(1)
    expect(progressoDaFrente(DURACAO_MS)).toBe(1)
    expect(yDaFrente(0, 500)).toBe(500)
    expect(yDaFrente(1600, 500)).toBe(0)
    let anterior = progressoDaFrente(0)
    for (let t = 100; t <= 1700; t += 100) {
      const atual = progressoDaFrente(t)
      expect(atual).toBeGreaterThanOrEqual(anterior)
      anterior = atual
    }
  })

  it('a chama vai de clara a escura e some', () => {
    const [r0, g0, , a0] = corDaChama(0)
    const [r1, g1, , a1] = corDaChama(0.65)
    const [, , , a2] = corDaChama(1)
    expect(g0).toBeGreaterThan(g1) // do amarelo ao vermelho
    expect(r0).toBeGreaterThanOrEqual(r1)
    expect(a0).toBeGreaterThan(a1)
    expect(a2).toBe(0)
    expect(corDaChama(-3)).toEqual(corDaChama(0))
    expect(corDaChama(9)).toEqual(corDaChama(1))
  })

  it('o brilho do fundo entra e se apaga; o canvas some nos ultimos 400 ms', () => {
    expect(brilhoDoFundo(0)).toBe(0)
    expect(brilhoDoFundo(1000)).toBeGreaterThan(0.3)
    expect(brilhoDoFundo(DURACAO_MS)).toBe(0)
    expect(opacidadeFinal(1000)).toBe(1)
    expect(opacidadeFinal(DURACAO_MS - 200)).toBeCloseTo(0.5)
    expect(opacidadeFinal(DURACAO_MS)).toBe(0)
  })

  it('a chama sobe e encolhe; a fumaca cresce', () => {
    const aleatorio = sequencia()
    const chama = criarParticula('chama', 50, 300, aleatorio)
    const y0 = chama.y
    const r0 = chama.raio
    atualizar(chama, 100)
    expect(chama.y).toBeLessThan(y0)
    expect(chama.raio).toBeLessThan(r0)
    const fumaca = criarParticula('fumaca', 50, 300, aleatorio)
    const rf = fumaca.raio
    atualizar(fumaca, 100)
    expect(fumaca.raio).toBeGreaterThan(rf)
  })

  it('RN-WEB-APAGAR-010: nunca passa do teto de particulas', () => {
    const mundo = criarMundo(2000, 900)
    const aleatorio = sequencia()
    let maximo = 0
    for (let t = 0; t < DURACAO_MS; t += 16) {
      passo(mundo, t, 16, aleatorio)
      maximo = Math.max(maximo, mundo.particulas.length)
    }
    expect(maximo).toBeLessThanOrEqual(MAX_PARTICULAS)
    expect(maximo).toBeGreaterThan(100)
  })

  it('depois do fim da emissao nao nasce nada e as particulas morrem', () => {
    const mundo = criarMundo(800, 600)
    const aleatorio = sequencia()
    for (let t = 0; t < FIM_DA_EMISSAO_MS; t += 16) passo(mundo, t, 16, aleatorio)
    expect(mundo.particulas.length).toBeGreaterThan(0)
    let nasceu = false
    let antes = mundo.particulas.length
    for (let t = FIM_DA_EMISSAO_MS; t < FIM_DA_EMISSAO_MS + 2500; t += 16) {
      passo(mundo, t, 16, aleatorio)
      if (mundo.particulas.length > antes) nasceu = true
      antes = mundo.particulas.length
    }
    expect(nasceu).toBe(false)
    expect(mundo.particulas).toHaveLength(0)
  })

  it('as chamas nascem perto da frente, nao no topo no comeco', () => {
    const mundo = criarMundo(800, 600)
    const aleatorio = sequencia()
    for (let t = 0; t < 300; t += 16) passo(mundo, t, 16, aleatorio)
    const chamas = mundo.particulas.filter((p) => p.tipo === 'chama')
    expect(chamas.length).toBeGreaterThan(0)
    // No inicio a frente esta embaixo: nenhuma chama pode estar na metade de cima.
    expect(chamas.every((p) => p.y > 300)).toBe(true)
  })
})
