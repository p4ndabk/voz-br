import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'
import { protegerSessaoComSenha, trocarSenhaDaSessao } from '@/nostr/sessao'
import { forcaDaSenha, validarSenha } from '@/nostr/senha'
import { mensagemDoErro } from '../entrar/erros'

interface Props {
  aberto: boolean
  // 'proteger': conta sem senha; 'trocar': pede tambem a senha atual.
  modo: 'proteger' | 'trocar'
  aoFechar: () => void
  aoConcluir: () => void
}

const FORCA = { fraca: 'forcaFraca', media: 'forcaMedia', forte: 'forcaForte' } as const

// RN-WEB-AUTH-011: proteger ou trocar a senha da nsec guardada. A senha so passa pela memoria.
export function ModalSenha({ aberto, modo, aoFechar, aoConcluir }: Props) {
  const textos = t.conta.senha
  const campos = t.entrarPagina.senha
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const fechar = () => {
    setAtual('')
    setNova('')
    setRepetida('')
    setErro(undefined)
    aoFechar()
  }

  const salvar = async () => {
    const problema = validarSenha(nova, repetida)
    if (problema) return setErro(campos.erros[problema])
    setErro(undefined)
    setOcupado(true)
    try {
      if (modo === 'proteger') await protegerSessaoComSenha(nova)
      else await trocarSenhaDaSessao(atual, nova)
      fechar()
      aoConcluir()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      titulo={modo === 'proteger' ? textos.protegerTitulo : textos.trocarTitulo}
      aoFechar={fechar}
      acoes={
        <Botao onClick={() => void salvar()} disabled={ocupado || nova === ''}>
          {ocupado ? textos.salvando : textos.salvar}
        </Botao>
      }
    >
      <div className="flex flex-col gap-3">
        {modo === 'trocar' && (
          <Campo
            rotulo={textos.atual}
            type="password"
            autoComplete="current-password"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        )}
        <Campo
          rotulo={textos.nova}
          ajuda={campos.ajuda}
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        {nova !== '' && (
          <p role="status" className="text-sm text-tinta-suave">
            {campos[FORCA[forcaDaSenha(nova)]]}
          </p>
        )}
        <Campo
          rotulo={campos.repetir}
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {erro && <Aviso tom="erro">{erro}</Aviso>}
      </div>
    </Modal>
  )
}
