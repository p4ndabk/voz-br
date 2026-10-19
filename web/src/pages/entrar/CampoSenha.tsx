import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'
import { forcaDaSenha, validarSenha, type ErroSenha } from '@/nostr/senha'

// RN-WEB-AUTH-010: senha com confirmacao como caminho principal; seguir sem senha exige confirmar o aviso.
export function useEscolhaDeSenha() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<ErroSenha>()
  const [pendente, setPendente] = useState<((senha: string | undefined) => void) | null>(null)

  // Chame no envio do formulario. Sem nada digitado, abre o aviso de "sem senha".
  const decidir = (aoDecidir: (senha: string | undefined) => void) => {
    if (senha === '' && confirmacao === '') {
      setPendente(() => aoDecidir)
      return
    }
    const problema = validarSenha(senha, confirmacao)
    setErro(problema ?? undefined)
    if (!problema) aoDecidir(senha)
  }

  return {
    senha,
    confirmacao,
    erro,
    pendente,
    mudarSenha: (valor: string) => {
      setSenha(valor)
      setErro(undefined)
    },
    mudarConfirmacao: (valor: string) => {
      setConfirmacao(valor)
      setErro(undefined)
    },
    decidir,
    // "Continuar sem senha": abre o aviso; so segue depois de confirmar.
    semSenha: (aoDecidir: (senha: string | undefined) => void) => setPendente(() => aoDecidir),
    fecharAviso: () => setPendente(null),
  }
}

export type EscolhaDeSenha = ReturnType<typeof useEscolhaDeSenha>

const FORCA = { fraca: 'forcaFraca', media: 'forcaMedia', forte: 'forcaForte' } as const

export function CampoSenha({ escolha }: { escolha: EscolhaDeSenha }) {
  const textos = t.entrarPagina.senha
  return (
    <div className="flex flex-col gap-3">
      <Campo
        rotulo={textos.campo}
        ajuda={textos.ajuda}
        erro={escolha.erro === 'curta' ? textos.erros.curta : undefined}
        type="password"
        autoComplete="new-password"
        value={escolha.senha}
        onChange={(e) => escolha.mudarSenha(e.target.value)}
      />
      {escolha.senha !== '' && (
        <p role="status" className="text-sm text-tinta-suave">
          {textos[FORCA[forcaDaSenha(escolha.senha)]]}
        </p>
      )}
      <Campo
        rotulo={textos.repetir}
        erro={escolha.erro === 'diferente' ? textos.erros.diferente : undefined}
        type="password"
        autoComplete="new-password"
        value={escolha.confirmacao}
        onChange={(e) => escolha.mudarConfirmacao(e.target.value)}
      />
    </div>
  )
}

// Aviso de "continuar sem senha": so segue depois de confirmar.
export function AvisoSemSenha({ escolha }: { escolha: EscolhaDeSenha }) {
  const textos = t.entrarPagina.senha
  return (
    <Modal
      aberto={escolha.pendente !== null}
      titulo={textos.semSenhaTitulo}
      aoFechar={escolha.fecharAviso}
      acoes={
        <Botao
          onClick={() => {
            const seguir = escolha.pendente
            escolha.fecharAviso()
            seguir?.(undefined)
          }}
        >
          {textos.semSenhaConfirmar}
        </Botao>
      }
    >
      <Aviso tom="erro">{textos.semSenhaAviso}</Aviso>
    </Modal>
  )
}

// Link que dispara a mesma confirmacao sem precisar deixar os campos vazios.
export function LinkSemSenha({
  escolha,
  aoDecidir,
}: {
  escolha: EscolhaDeSenha
  aoDecidir: (senha: string | undefined) => void
}) {
  return (
    <button
      type="button"
      onClick={() => escolha.semSenha(aoDecidir)}
      className="self-start text-sm font-bold underline underline-offset-4"
    >
      {t.entrarPagina.senha.continuarSem}
    </button>
  )
}
