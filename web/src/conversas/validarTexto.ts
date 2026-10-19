// RN-WEB-MENSAGENS-005
export const LIMITE_MENSAGEM = 4000

export type ValidacaoTexto = 'ok' | 'vazio' | 'longo'

export function validarTexto(texto: string): ValidacaoTexto {
  if (texto.trim() === '') return 'vazio'
  return texto.length > LIMITE_MENSAGEM ? 'longo' : 'ok'
}
