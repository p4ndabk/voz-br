import { Botao } from '@/components/ui/Botao'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'

interface Props {
  nome?: string
  // Grupos usam os proprios textos; o padrao e o aviso da conversa de dois.
  titulo?: string
  aviso?: string
  botao?: string
  aoFechar: () => void
  aoApagar: () => Promise<unknown>
}

// RN-WEB-APAGAR-001: o aviso e uma etapa so; clicar em "Apagar" fecha o aviso e comeca a queimar.
// RN-WEB-APAGAR-004: antes de apagar, diz o que e certo e o que e so um pedido.
// Nao ha tela de resultado: o fogo e o resultado (RN-WEB-APAGAR-013).
export function ModalApagarHistorico({
  nome = '',
  titulo,
  aviso,
  botao,
  aoFechar,
  aoApagar,
}: Props) {
  const apagar = () => {
    aoFechar()
    void aoApagar().catch(() => {})
  }

  return (
    <Modal
      aberto
      titulo={titulo ?? t.apagar.titulo}
      aoFechar={aoFechar}
      acoes={<Botao onClick={apagar}>{botao ?? t.apagar.apagarTudo}</Botao>}
    >
      <p>{aviso ?? t.apagar.aviso(nome)}</p>
    </Modal>
  )
}
