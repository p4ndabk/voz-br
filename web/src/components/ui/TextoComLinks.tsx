import type { ReactNode } from 'react'

const URL_HTTP = /https?:\/\/[^\s<>"']+/g
const PONTUACAO_FINAL = /[.,;:!?)\]]+$/

// RN-WEB-MENSAGENS-010: o texto e sempre texto puro; so enderecos http(s) viram link, e abrem
// em outra aba sem dar acesso a esta pagina (noopener) nem dizer de onde veio (noreferrer).
export function TextoComLinks({ texto }: { texto: string }) {
  const partes: ReactNode[] = []
  let fim = 0
  for (const achado of texto.matchAll(URL_HTTP)) {
    const inicio = achado.index
    const endereco = achado[0].replace(PONTUACAO_FINAL, '')
    if (inicio > fim) partes.push(texto.slice(fim, inicio))
    partes.push(
      <a
        key={inicio}
        href={endereco}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline underline-offset-2"
      >
        {endereco}
      </a>,
    )
    fim = inicio + endereco.length
  }
  if (fim < texto.length) partes.push(texto.slice(fim))
  return <>{partes}</>
}
