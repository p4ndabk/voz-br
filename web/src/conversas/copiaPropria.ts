// RN-WEB-PRIVACIDADE-002: a copia que mando para mim nao pode chegar ao mesmo relay no mesmo instante
// que a do amigo, senao o relay liga os dois embrulhos e descobre quem fala com quem.
export const ATRASO_MINIMO_MS = 30_000
export const ATRASO_MAXIMO_MS = 120_000

export interface DestinoDaCopia {
  urls: string[]
  atrasoMs: number
}

// Se tenho relays que o amigo nao usa, a copia vai so para eles e sai na hora. Se nao, vai para os meus
// depois de uma espera sorteada entre o minimo e o maximo.
export function destinoDaCopia(
  meus: readonly string[],
  doAmigo: readonly string[],
  sorteio: number = sortear(),
): DestinoDaCopia {
  const separados = meus.filter((u) => !doAmigo.includes(u))
  if (separados.length > 0) return { urls: separados, atrasoMs: 0 }
  return {
    urls: [...meus],
    atrasoMs: Math.round(ATRASO_MINIMO_MS + sorteio * (ATRASO_MAXIMO_MS - ATRASO_MINIMO_MS)),
  }
}

function sortear(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
}

export const esperar = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms))
