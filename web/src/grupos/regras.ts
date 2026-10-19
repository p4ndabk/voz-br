import type { AcaoDeGrupo } from './protocolo'
import { MAXIMO_MEMBROS, TOLERANCIA_RELOGIO_S, type DadosGrupo, type Grupo } from './tipos'

export type Rejeicao =
  | 'desconhecido'
  | 'nao-e-admin'
  | 'versao-antiga'
  | 'nao-e-membro'
  | 'inativo'
  | 'sem-convite'
  | 'cheio'
  | 'ja-existe'
  | 'invalido'

export type Resultado =
  | {
      ok: true
      // Grupo depois da acao (o mesmo objeto se nada mudou).
      grupo: Grupo
      // O admin mudou a lista por causa de um aceite, recusa ou saida: precisa avisar todos.
      publicarMembros?: boolean
      // "Limpar para todos": apagar as mensagens ate este instante.
      limparAte?: number
      // A mensagem de grupo e valida e deve virar balao.
      mensagem?: boolean
    }
  | { ok: false; motivo: Rejeicao }

const recusa = (motivo: Rejeicao): Resultado => ({ ok: false, motivo })
type Extra = { publicarMembros?: boolean; limparAte?: number; mensagem?: boolean }
const ok = (grupo: Grupo, extra: Extra = {}): Resultado => ({ ok: true, grupo, ...extra })

const paraDados = (g: Grupo): DadosGrupo => ({
  id: g.id,
  nome: g.nome,
  admin: g.admin,
  membros: g.membros,
  pendentes: g.pendentes,
  versao: g.versao,
})
export { paraDados }

function deDados(d: DadosGrupo, estado: Grupo['estado'], criadoEm: number, antigo?: Grupo): Grupo {
  return { ...antigo, ...d, estado, criadoEm: antigo?.criadoEm ?? criadoEm }
}

// RN-WEB-GRUPOS-001 a 008: decide o que fazer com uma acao de grupo vinda de `autor` (a chave do selo,
// ja provada pelo `abrirEmbrulho`). Puro: nao mexe em armazenamento nem rede.
export function aplicarAcao(
  local: Grupo | undefined,
  autor: string,
  acao: AcaoDeGrupo,
  eu: string,
  // `rumorEm`: created_at do rumor (relogio de quem enviou). `agora`: relogio deste aparelho.
  rumorEm: number,
  agora: number,
): Resultado {
  switch (acao.tipo) {
    case 'convite': {
      // O convite so vale vindo do admin que ele mesmo declara, e para quem esta na lista de pendentes.
      const d = acao.dados
      if (autor !== d.admin) return recusa('nao-e-admin')
      if (!d.pendentes.includes(eu)) return recusa('sem-convite')
      // Convite reentregue pelo relay (versao igual ou menor) nao ressuscita um grupo de que saí ou recusei.
      if (local) {
        if (local.estado === 'ativo' || local.estado === 'encerrado') return recusa('ja-existe')
        if (d.versao <= local.versao) return recusa('versao-antiga')
      }
      return ok(deDados(d, 'convidado', agora, local))
    }

    case 'membros': {
      if (!local) return recusa('desconhecido')
      if (autor !== local.admin) return recusa('nao-e-admin')
      if (acao.dados.versao <= local.versao) return recusa('versao-antiga')
      const d = acao.dados
      if (local.estado === 'saiu' || local.estado === 'removido' || local.estado === 'encerrado') {
        return recusa('inativo')
      }
      if (d.membros.includes(eu)) return ok(deDados(d, 'ativo', agora, local))
      if (d.pendentes.includes(eu)) return ok(deDados(d, 'convidado', agora, local))
      // Fora da lista: era membro e foi removido, ou o convite foi cancelado.
      return ok(deDados(d, 'removido', agora, local))
    }

    case 'mensagem': {
      if (!local) return recusa('desconhecido')
      if (local.estado !== 'ativo') return recusa('inativo')
      if (!local.membros.includes(autor)) return recusa('nao-e-membro')
      return ok(local, { mensagem: true })
    }

    case 'aceito':
    case 'recusado':
    case 'sair': {
      // So o admin processa: ele e quem mantem a lista.
      if (!local || local.admin !== eu) return recusa('desconhecido')
      if (local.estado !== 'ativo') return recusa('inativo')
      if (rumorEm < (local.alteradoEm ?? 0) - TOLERANCIA_RELOGIO_S) return recusa('versao-antiga')
      const eMembro = local.membros.includes(autor)
      const ePendente = local.pendentes.includes(autor)
      if (acao.tipo === 'sair') {
        if (!eMembro || autor === local.admin) return recusa('nao-e-membro')
        return ok(
          {
            ...local,
            membros: local.membros.filter((pk) => pk !== autor),
            versao: local.versao + 1,
            alteradoEm: agora,
          },
          { publicarMembros: true },
        )
      }
      if (!ePendente) return recusa('sem-convite')
      const pendentes = local.pendentes.filter((pk) => pk !== autor)
      if (acao.tipo === 'recusado') {
        return ok(
          { ...local, pendentes, versao: local.versao + 1, alteradoEm: agora },
          { publicarMembros: true },
        )
      }
      if (local.membros.length >= MAXIMO_MEMBROS) return recusa('cheio')
      return ok(
        {
          ...local,
          pendentes,
          membros: [...local.membros, autor],
          versao: local.versao + 1,
          alteradoEm: agora,
        },
        { publicarMembros: true },
      )
    }

    case 'limpar': {
      if (!local) return recusa('desconhecido')
      if (autor !== local.admin) return recusa('nao-e-admin')
      if (local.estado !== 'ativo') return recusa('inativo')
      const ate = Math.max(local.apagadoAte ?? 0, acao.ate)
      return ok({ ...local, apagadoAte: ate }, { limparAte: acao.ate })
    }

    case 'encerrar': {
      if (!local) return recusa('desconhecido')
      if (autor !== local.admin) return recusa('nao-e-admin')
      return ok({ ...local, estado: 'encerrado' })
    }
  }
}
