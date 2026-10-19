import { nomeValido } from './protocolo'
import { MAXIMO_MEMBROS, type Grupo } from './tipos'

// RN-WEB-GRUPOS-001 a 006: o que o admin pode fazer com a lista. Cada funcao devolve o grupo novo, ou
// o motivo de nao poder. Nada aqui fala com rede.
export type ErroAdmin =
  | 'nome-invalido'
  | 'cheio'
  | 'nao-e-admin'
  | 'ja-na-lista'
  | 'nao-esta-na-lista'
  | 'e-o-admin'
  | 'sem-convidados'
  | 'inativo'

type Saida = { ok: true; grupo: Grupo } | { ok: false; erro: ErroAdmin }
const erro = (e: ErroAdmin): Saida => ({ ok: false, erro: e })

export function criarGrupo(
  admin: string,
  nome: string,
  convidados: string[],
  id: string,
  agora: number,
): Saida {
  if (!nomeValido(nome)) return erro('nome-invalido')
  const unicos = [...new Set(convidados)].filter((pk) => pk !== admin)
  if (unicos.length === 0) return erro('sem-convidados')
  if (1 + unicos.length > MAXIMO_MEMBROS) return erro('cheio')
  return {
    ok: true,
    grupo: {
      id,
      nome: nome.trim(),
      admin,
      membros: [admin],
      pendentes: unicos,
      versao: 1,
      estado: 'ativo',
      criadoEm: agora,
      alteradoEm: agora,
    },
  }
}

function soAdmin(grupo: Grupo, eu: string): Saida | null {
  if (grupo.admin !== eu) return erro('nao-e-admin')
  if (grupo.estado !== 'ativo') return erro('inativo')
  return null
}

export function convidar(grupo: Grupo, eu: string, pessoa: string, agora: number): Saida {
  const negado = soAdmin(grupo, eu)
  if (negado) return negado
  if (grupo.membros.includes(pessoa) || grupo.pendentes.includes(pessoa)) return erro('ja-na-lista')
  if (grupo.membros.length + grupo.pendentes.length >= MAXIMO_MEMBROS) return erro('cheio')
  return {
    ok: true,
    grupo: {
      ...grupo,
      pendentes: [...grupo.pendentes, pessoa],
      versao: grupo.versao + 1,
      alteradoEm: agora,
    },
  }
}

// Remove um membro ou cancela um convite pendente.
export function remover(grupo: Grupo, eu: string, pessoa: string, agora: number): Saida {
  const negado = soAdmin(grupo, eu)
  if (negado) return negado
  if (pessoa === grupo.admin) return erro('e-o-admin')
  if (!grupo.membros.includes(pessoa) && !grupo.pendentes.includes(pessoa)) {
    return erro('nao-esta-na-lista')
  }
  return {
    ok: true,
    grupo: {
      ...grupo,
      membros: grupo.membros.filter((pk) => pk !== pessoa),
      pendentes: grupo.pendentes.filter((pk) => pk !== pessoa),
      versao: grupo.versao + 1,
      alteradoEm: agora,
    },
  }
}

// RN-WEB-GRUPOS-006: o admin so sai depois de passar o cargo a outro membro.
export function passarAdmin(grupo: Grupo, eu: string, novo: string, agora: number): Saida {
  const negado = soAdmin(grupo, eu)
  if (negado) return negado
  if (novo === eu || !grupo.membros.includes(novo)) return erro('nao-esta-na-lista')
  return {
    ok: true,
    grupo: { ...grupo, admin: novo, versao: grupo.versao + 1, alteradoEm: agora },
  }
}

export const podeSair = (grupo: Grupo, eu: string) => grupo.estado === 'ativo' && grupo.admin !== eu
