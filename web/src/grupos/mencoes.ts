// RN-WEB-GRUPOS-016: marcar alguem do grupo. A mensagem leva o texto "@Nome" e, em tags, quem foi marcado
// e o texto exato que o representa; assim o balao destaca o nome e quem foi marcado e avisado.
export interface Mencao {
  pubkey: string
  // Exatamente como aparece no texto, com o "@" (ex.: "@Maria Silva").
  texto: string
}

export interface Sugestao {
  pubkey: string
  nome: string
}

export const MAXIMO_TEXTO_MENCAO = 60
export const MAXIMO_SUGESTOES = 6

const HEX_64 = /^[0-9a-f]{64}$/

const simples = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// O que foi digitado depois de um "@" colado no cursor (no comeco ou depois de espaco).
export function consultaDeMencao(
  texto: string,
  cursor: number,
): { inicio: number; consulta: string } | null {
  const ate = texto.slice(0, cursor)
  const m = /(^|\s)@([^\s@]*)$/.exec(ate)
  if (!m) return null
  return { inicio: ate.length - m[2]!.length - 1, consulta: m[2]! }
}

export function sugerir(membros: readonly Sugestao[], consulta: string): Sugestao[] {
  const q = simples(consulta)
  return membros
    .filter(
      (s) =>
        q === '' ||
        simples(s.nome)
          .split(/\s+/)
          .some((p) => p.startsWith(q)) ||
        simples(s.nome).includes(q),
    )
    .slice(0, MAXIMO_SUGESTOES)
}

// Troca "@consulta" por "@Nome " e devolve o texto novo e onde fica o cursor.
export function aplicarMencao(
  texto: string,
  cursor: number,
  inicio: number,
  nome: string,
): { texto: string; cursor: number } {
  const literal = `@${nome} `
  return {
    texto: texto.slice(0, inicio) + literal + texto.slice(cursor),
    cursor: inicio + literal.length,
  }
}

// So vale a marcacao que ainda esta no texto e cujo marcado e membro do grupo. Sem repetir a mesma pessoa.
export function mencoesValidas(
  texto: string,
  mencoes: readonly Mencao[],
  membros: readonly string[],
): Mencao[] {
  const vistos = new Set<string>()
  const validas: Mencao[] = []
  for (const m of mencoes) {
    if (!HEX_64.test(m.pubkey) || !membros.includes(m.pubkey) || vistos.has(m.pubkey)) continue
    if (m.texto.length < 2 || m.texto.length > MAXIMO_TEXTO_MENCAO || !m.texto.startsWith('@'))
      continue
    if (!texto.includes(m.texto)) continue
    vistos.add(m.pubkey)
    validas.push(m)
  }
  return validas
}

// Quebra o texto em pedacos: texto comum e marcacoes, na ordem em que aparecem.
export function partirPorMencoes(texto: string, mencoes: readonly Mencao[]): (string | Mencao)[] {
  const partes: (string | Mencao)[] = []
  let resto = texto
  while (resto.length > 0) {
    let melhor: { m: Mencao; i: number } | null = null
    for (const m of mencoes) {
      const i = resto.indexOf(m.texto)
      if (i >= 0 && (!melhor || i < melhor.i)) melhor = { m, i }
    }
    if (!melhor) break
    if (melhor.i > 0) partes.push(resto.slice(0, melhor.i))
    partes.push(melhor.m)
    resto = resto.slice(melhor.i + melhor.m.texto.length)
  }
  if (resto.length > 0) partes.push(resto)
  return partes
}
