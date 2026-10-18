import { enderecoLightningValido, normalizarLightning } from '@/nostr/perfis'

export const LIMITE_NOME = 40
export const LIMITE_SOBRE = 300
export const LIMITE_FOTO = 500

export interface CamposEditaveis {
  nome: string
  sobre: string
  foto: string
  lightning: string
}

export type ErroDeCampo = 'longo' | 'invalido'
export type ErrosDeCampos = Partial<Record<keyof CamposEditaveis, ErroDeCampo>>

const texto = (v: unknown) => (typeof v === 'string' ? v : '')

// Perfil (o content do kind 0) -> o que a tela edita. O nome mostrado e o display_name; sem ele, o name.
export function lerCampos(conteudo: Record<string, unknown>): CamposEditaveis {
  return {
    nome: texto(conteudo.display_name).trim() || texto(conteudo.name).trim(),
    sobre: texto(conteudo.about).trim(),
    foto: texto(conteudo.picture).trim(),
    lightning: texto(conteudo.lud16).trim(),
  }
}

// RN-WEB-PERFIL-011: a foto e um endereco https (http seria bloqueado como conteudo misto).
function fotoValida(foto: string): boolean {
  try {
    return new URL(foto).protocol === 'https:'
  } catch {
    return false
  }
}

// RN-WEB-PERFIL-014: limites de tamanho. Campo vazio e sempre valido (remove o campo).
export function validarCampos(c: CamposEditaveis): ErrosDeCampos {
  const erros: ErrosDeCampos = {}
  if (Array.from(c.nome.trim()).length > LIMITE_NOME) erros.nome = 'longo'
  if (Array.from(c.sobre.trim()).length > LIMITE_SOBRE) erros.sobre = 'longo'
  const foto = c.foto.trim()
  if (foto.length > LIMITE_FOTO) erros.foto = 'longo'
  else if (foto !== '' && !fotoValida(foto)) erros.foto = 'invalido'
  const lightning = c.lightning.trim()
  if (lightning !== '' && !enderecoLightningValido(lightning)) erros.lightning = 'invalido'
  return erros
}

export const temErros = (erros: ErrosDeCampos) => Object.keys(erros).length > 0

export function normalizarCampos(c: CamposEditaveis): CamposEditaveis {
  return {
    nome: c.nome.trim(),
    sobre: c.sobre.trim(),
    foto: c.foto.trim(),
    lightning: c.lightning.trim() === '' ? '' : normalizarLightning(c.lightning),
  }
}

export function iguais(a: CamposEditaveis, b: CamposEditaveis): boolean {
  const x = normalizarCampos(a)
  const y = normalizarCampos(b)
  return (
    x.nome === y.nome && x.sobre === y.sobre && x.foto === y.foto && x.lightning === y.lightning
  )
}

function definirOuTirar(destino: Record<string, unknown>, chave: string, valor: string) {
  if (valor === '') delete destino[chave]
  else destino[chave] = valor
}

// RN-WEB-PERFIL-009: o kind 0 substitui o perfil inteiro, entao tudo que o Voz nao edita (banner,
// site, nip05, lud06, campos de outros aplicativos) passa para o novo evento sem mudanca.
export function mesclarPerfil(
  atual: Record<string, unknown>,
  novos: CamposEditaveis,
): Record<string, unknown> {
  const c = normalizarCampos(novos)
  const resultado: Record<string, unknown> = { ...atual }
  definirOuTirar(resultado, 'display_name', c.nome)
  // Clientes antigos so leem "name": se nao havia um, usa o mesmo nome.
  if (c.nome !== '' && texto(atual.name).trim() === '') resultado.name = c.nome
  definirOuTirar(resultado, 'about', c.sobre)
  definirOuTirar(resultado, 'picture', c.foto)
  definirOuTirar(resultado, 'lud16', c.lightning)
  return resultado
}
