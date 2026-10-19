import { useNavigate } from 'react-router-dom'
import { Botao } from '@/components/ui/Botao'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'

interface Props {
  aberto: boolean
  aoFechar: () => void
}

// Confirmacao de saida usada na lateral das conversas e na tela da conta.
export function ModalSair({ aberto, aoFechar }: Props) {
  const navigate = useNavigate()
  const assinante = useSessao((s) => s.assinante)
  const sair = useSessao((s) => s.sair)
  const guardaChave = assinante?.metodo === 'nsec'

  const confirmar = async () => {
    await sair()
    navigate('/')
  }

  return (
    <Modal
      aberto={aberto}
      titulo={t.conta.sairTitulo}
      aoFechar={aoFechar}
      acoes={<Botao onClick={confirmar}>{t.conta.confirmarSair}</Botao>}
    >
      {guardaChave ? t.conta.sairAviso.nsec : t.conta.sairAviso.padrao}
    </Modal>
  )
}
