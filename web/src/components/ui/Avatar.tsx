interface Props {
  // Texto que define o desenho (a pubkey, quando houver). Mesmo texto, mesmo avatar.
  semente: string
  tamanho?: number
}

function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Grade 5x5 espelhada, sorteada de forma deterministica a partir da semente (xorshift32).
function gerarCelulas(semente: string): { x: number; y: number }[] {
  let estado = hash(semente) || 1
  const proximo = () => {
    estado ^= estado << 13
    estado ^= estado >>> 17
    estado ^= estado << 5
    return (estado >>> 0) / 4294967296
  }
  const celulas: { x: number; y: number }[] = []
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (proximo() > 0.5) {
        celulas.push({ x, y })
        if (x < 2) celulas.push({ x: 4 - x, y })
      }
    }
  }
  return celulas
}

export function Avatar({ semente, tamanho = 40 }: Props) {
  const celulas = gerarCelulas(semente)
  const destaque = hash(`${semente}:cor`) % 2 === 0

  return (
    <svg
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className="shrink-0 rounded-cordel border-2 border-borda bg-superficie"
    >
      {celulas.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="1"
          height="1"
          fill={destaque ? 'var(--vermelho)' : 'var(--tinta)'}
        />
      ))}
    </svg>
  )
}
