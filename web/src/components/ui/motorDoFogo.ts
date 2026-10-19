// RN-WEB-APAGAR-010: motor de particulas do fogo (puro: sem DOM, para poder ser testado).
export const DURACAO_MS = 2400
export const MAX_PARTICULAS = 500
// A frente das chamas sobe de baixo para cima entre estes dois instantes.
export const FRENTE_INICIO_MS = 150
export const FRENTE_FIM_MS = 1600
// Depois deste instante nao nasce mais chama: o que sobra sobe, esfria e vira fumaca.
export const FIM_DA_EMISSAO_MS = 1750
export const DESVANECER_MS = 400

export type TipoDeParticula = 'chama' | 'brasa' | 'fumaca'

export interface Particula {
  tipo: TipoDeParticula
  x: number
  y: number
  vx: number
  vy: number
  raio: number
  // Idade e vida em ms.
  idade: number
  vida: number
}

export type Aleatorio = () => number

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
const facilitar = (t: number) => t * t * (3 - 2 * t)

// 0 = embaixo, 1 = a frente chegou no topo.
export function progressoDaFrente(tempoMs: number): number {
  return facilitar(limitar((tempoMs - FRENTE_INICIO_MS) / (FRENTE_FIM_MS - FRENTE_INICIO_MS), 0, 1))
}

// Altura (px, de cima para baixo) em que esta a frente das chamas.
export function yDaFrente(tempoMs: number, altura: number): number {
  return altura * (1 - progressoDaFrente(tempoMs))
}

// Cor da chama pela idade relativa (0 = nasceu, 1 = morreu): branco-amarelo, laranja, vermelho, fumaca.
export function corDaChama(idadeRelativa: number): [number, number, number, number] {
  const t = limitar(idadeRelativa, 0, 1)
  const paradas: [number, number, number, number, number][] = [
    [0, 255, 244, 190, 0.95],
    [0.3, 255, 176, 48, 0.9],
    [0.65, 226, 70, 22, 0.7],
    [1, 70, 40, 36, 0],
  ]
  for (let i = 1; i < paradas.length; i++) {
    const [t1, r1, g1, b1, a1] = paradas[i]!
    const [t0, r0, g0, b0, a0] = paradas[i - 1]!
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0)
      return [r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k, a0 + (a1 - a0) * k]
    }
  }
  return [70, 40, 36, 0]
}

// Fim do muro de chamas: depois que a frente chega ao topo, a base sobe e leva o fogo embora.
export const CAUDA_INICIO_MS = 1350
export const CAUDA_FIM_MS = 2250

// 0 = a base do muro ainda esta embaixo, 1 = ja saiu pelo topo.
export function progressoDaCauda(tempoMs: number): number {
  return facilitar(limitar((tempoMs - CAUDA_INICIO_MS) / (CAUDA_FIM_MS - CAUDA_INICIO_MS), 0, 1))
}

// Altura (px) da ponta de uma lingua de fogo no ponto x: pontas afiadas e vales arredondados, em
// movimento. `fase` desloca as linguas de cada camada para elas nao ficarem alinhadas.
export function alturaDaLingua(x: number, tempoMs: number, fase = 0): number {
  const base = Math.abs(Math.sin(x / 34 + tempoMs / 150 + fase))
  const miudo = Math.sin(x / 15 - tempoMs / 95 + fase * 2) * 0.12
  return Math.max(0, (1 - base) ** 1.4 + miudo) * 54
}

// Brilho laranja no fundo, que sobe com a frente e se apaga no fim.
export function brilhoDoFundo(tempoMs: number): number {
  const entrada = limitar(tempoMs / 300, 0, 1)
  const saida = limitar((DURACAO_MS - tempoMs) / 700, 0, 1)
  return 0.55 * entrada * saida
}

// Opacidade do canvas inteiro: some de vez nos ultimos 400 ms.
export function opacidadeFinal(tempoMs: number): number {
  return limitar((DURACAO_MS - tempoMs) / DESVANECER_MS, 0, 1)
}

export function criarParticula(
  tipo: TipoDeParticula,
  x: number,
  y: number,
  aleatorio: Aleatorio,
): Particula {
  if (tipo === 'brasa') {
    return {
      tipo,
      x,
      y,
      vx: (aleatorio() - 0.5) * 70,
      vy: -(90 + aleatorio() * 170),
      raio: 1.2 + aleatorio() * 2.2,
      idade: 0,
      vida: 700 + aleatorio() * 900,
    }
  }
  if (tipo === 'fumaca') {
    return {
      tipo,
      x,
      y,
      vx: (aleatorio() - 0.5) * 24,
      vy: -(24 + aleatorio() * 36),
      raio: 22 + aleatorio() * 26,
      idade: 0,
      vida: 900 + aleatorio() * 700,
    }
  }
  return {
    tipo,
    x,
    y,
    vx: (aleatorio() - 0.5) * 40,
    vy: -(90 + aleatorio() * 190),
    raio: 13 + aleatorio() * 17,
    idade: 0,
    vida: 600 + aleatorio() * 600,
  }
}

// Move a particula por `dtMs`. Chama encolhe; fumaca cresce; brasa balanca de leve.
export function atualizar(p: Particula, dtMs: number): void {
  const dt = dtMs / 1000
  p.idade += dtMs
  p.x += p.vx * dt
  p.y += p.vy * dt
  const relativa = p.idade / p.vida
  if (p.tipo === 'chama') {
    p.raio *= 1 - 0.7 * dt
    p.vx += Math.sin(p.idade / 90 + p.x) * 40 * dt
  } else if (p.tipo === 'brasa') {
    p.vx += Math.sin(p.idade / 120 + p.y) * 120 * dt
    p.vy += 40 * dt
  } else {
    p.raio *= 1 + 0.5 * dt
  }
  if (relativa > 1) p.idade = p.vida
}

export const estaViva = (p: Particula) => p.idade < p.vida

export interface Mundo {
  largura: number
  altura: number
  particulas: Particula[]
  // Particulas "devidas" que ainda nao nasceram (a taxa e fracionaria por quadro).
  resto: number
}

export const criarMundo = (largura: number, altura: number): Mundo => ({
  largura,
  altura,
  particulas: [],
  resto: 0,
})

// Avanca o mundo: emite perto da frente, atualiza e descarta as mortas. Respeita MAX_PARTICULAS.
export function passo(mundo: Mundo, tempoMs: number, dtMs: number, aleatorio: Aleatorio): void {
  for (const p of mundo.particulas) atualizar(p, dtMs)
  mundo.particulas = mundo.particulas.filter(estaViva)

  if (tempoMs >= FRENTE_INICIO_MS - 100 && tempoMs < FIM_DA_EMISSAO_MS) {
    const frente = yDaFrente(tempoMs, mundo.altura)
    // Taxa proporcional a largura: ~1 chama a cada 5 px por segundo de cada tipo, vezes o quadro.
    mundo.resto += (mundo.largura / 5) * (dtMs / 1000) * 2
    while (mundo.resto >= 1 && mundo.particulas.length < MAX_PARTICULAS) {
      mundo.resto -= 1
      const sorteio = aleatorio()
      const tipo: TipoDeParticula = sorteio < 0.72 ? 'chama' : 'brasa'
      const x = aleatorio() * mundo.largura
      // Nasce na frente e um pouco abaixo dela (o que ja queimou continua em chamas).
      // Tudo abaixo da frente continua queimando: mais denso junto dela, mais ralo para baixo.
      const y = frente + aleatorio() ** 1.6 * (mundo.altura - frente + 40)
      mundo.particulas.push(criarParticula(tipo, x, Math.min(y, mundo.altura + 10), aleatorio))
    }
    mundo.resto = Math.min(mundo.resto, 8)
  }
}
