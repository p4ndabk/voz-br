// RN-WEB-AUTH-010: politica da senha que protege a nsec guardada no navegador.
export const TAMANHO_MINIMO_SENHA = 8

export type ErroSenha = 'curta' | 'diferente'
export type ForcaSenha = 'fraca' | 'media' | 'forte'

// Confere a senha nova e a confirmacao. null = valida.
export function validarSenha(senha: string, confirmacao: string): ErroSenha | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) return 'curta'
  return senha === confirmacao ? null : 'diferente'
}

// So orienta a pessoa; nunca bloqueia (o unico bloqueio e o tamanho minimo).
export function forcaDaSenha(senha: string): ForcaSenha {
  const variedade = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(senha)).length
  if (senha.length >= 12 && variedade >= 3) return 'forte'
  if (senha.length >= TAMANHO_MINIMO_SENHA && variedade >= 2) return 'media'
  return 'fraca'
}
