import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { convidarPessoa, passarOCargo, removerPessoa, removerPessoaEApagar } from '@/grupos/acoes'
import type { Grupo } from '@/grupos/tipos'
import { t } from '@/i18n/pt-BR'
import { lerChaveDoAmigo } from '@/nostr/contatos'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'
import type { Assinante } from '@/nostr/signer/tipos'
import { PessoaDoGrupo } from './PessoaDoGrupo'

interface Props {
  grupo: Grupo
  assinante: Assinante
  aoFechar: () => void
}

// RN-WEB-GRUPOS-003 e 006: todos veem quem esta no grupo; so o admin convida, tira e passa o cargo.
export function ModalMembros({ grupo, assinante, aoFechar }: Props) {
  const eu = assinante.pubkey
  const souAdmin = grupo.admin === eu && grupo.estado === 'ativo'
  const perfis = usePerfis((s) => s.perfis)
  const meuNome = nomeExibido(perfis[eu], eu).texto
  const [chave, setChave] = useState('')
  const [erro, setErro] = useState<string>()

  const mostrar = (r: { ok: boolean; erro?: keyof typeof t.grupos.erros }) => {
    if (!r.ok && r.erro) setErro(t.grupos.erros[r.erro])
    else setErro(undefined)
  }

  const convidar = async (e: FormEvent) => {
    e.preventDefault()
    const lida = lerChaveDoAmigo(chave, eu)
    if (!lida.ok) return setErro(t.novaConversa.erros[lida.motivo])
    mostrar(await convidarPessoa(assinante, grupo.id, lida.pubkey, meuNome))
    setChave('')
  }

  const linha = (pk: string, situacao: 'membro' | 'pendente') => (
    <li
      key={pk}
      className="flex flex-col gap-2 rounded-cordel border-2 border-borda bg-superficie px-3 py-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <PessoaDoGrupo pubkey={pk} tamanho={36} />
        </div>
        <span className="shrink-0 text-xs font-bold uppercase text-tinta-suave">
          {pk === grupo.admin
            ? t.grupos.admin
            : situacao === 'pendente'
              ? t.grupos.pendente
              : pk === eu
                ? t.grupos.voce
                : ''}
        </span>
      </div>
      {souAdmin && pk !== eu && (
        <div className="flex flex-wrap gap-2">
          {situacao === 'membro' && (
            <Botao
              variante="secundario"
              className="px-3 py-1 text-sm"
              onClick={async () => mostrar(await passarOCargo(assinante, grupo.id, pk))}
            >
              {t.grupos.passarCargo}
            </Botao>
          )}
          <Botao
            variante="secundario"
            className="px-3 py-1 text-sm"
            onClick={async () => mostrar(await removerPessoa(assinante, grupo.id, pk))}
          >
            {situacao === 'pendente' ? t.grupos.cancelarConvite : t.grupos.tirar}
          </Botao>
          {situacao === 'membro' && (
            <Botao
              variante="secundario"
              className="px-3 py-1 text-sm"
              onClick={async () =>
                mostrar(await removerPessoaEApagar(assinante, grupo.id, pk, meuNome))
              }
            >
              {t.grupos.tirarApagar}
            </Botao>
          )}
        </div>
      )}
    </li>
  )

  return (
    <Modal aberto titulo={t.grupos.membrosTitulo} aoFechar={aoFechar}>
      <div className="flex flex-col gap-4">
        <ul aria-label={t.grupos.membros} className="flex flex-col gap-2">
          {grupo.membros.map((pk) => linha(pk, 'membro'))}
          {grupo.pendentes.map((pk) => linha(pk, 'pendente'))}
        </ul>
        {souAdmin && (
          <form onSubmit={convidar} className="flex flex-col gap-2">
            <Campo
              rotulo={t.grupos.adicionarMais}
              ajuda={t.grupos.chaveAjuda}
              autoComplete="off"
              spellCheck={false}
              value={chave}
              onChange={(e) => {
                setChave(e.target.value)
                setErro(undefined)
              }}
            />
            <div>
              <Botao type="submit" variante="secundario" disabled={chave.trim() === ''}>
                {t.grupos.adicionarChave}
              </Botao>
            </div>
          </form>
        )}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
      </div>
    </Modal>
  )
}
