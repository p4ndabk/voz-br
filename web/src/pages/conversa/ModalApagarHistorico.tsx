import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Modal } from '@/components/ui/Modal'
import type { ResultadoApagar } from '@/conversas/apagar'
import { t } from '@/i18n/pt-BR'

interface Props {
  nome: string
  aoFechar: () => void
  aoApagar: () => Promise<ResultadoApagar>
  // Enquanto o fogo queima as mensagens o aviso sai da frente e volta com o resultado.
  oculto?: boolean
}

type Passo = 'aviso' | 'apagando' | 'resultado'

// RN-WEB-APAGAR-001: o aviso e uma etapa so; clicar em "Apagar" ja apaga (e queima).
// RN-WEB-APAGAR-004: antes de apagar, diz o que e certo e o que e so um pedido.
// Montado so enquanto aberto: cada abertura recomeca do primeiro passo.
export function ModalApagarHistorico({ nome, aoFechar, aoApagar, oculto = false }: Props) {
  const [passo, setPasso] = useState<Passo>('aviso')
  const [resultado, setResultado] = useState<ResultadoApagar>()
  const [falhou, setFalhou] = useState(false)

  const apagar = async () => {
    setPasso('apagando')
    try {
      setResultado(await aoApagar())
    } catch {
      setFalhou(true)
    }
    setPasso('resultado')
  }

  const acoes = passo === 'aviso' ? <Botao onClick={apagar}>{t.apagar.apagarTudo}</Botao> : null

  return (
    <Modal aberto={!oculto} titulo={t.apagar.titulo} aoFechar={aoFechar} acoes={acoes}>
      {passo === 'aviso' && <p>{t.apagar.aviso(nome)}</p>}

      {passo === 'apagando' && <p role="status">{t.apagar.apagando}</p>}

      {passo === 'resultado' && resultado && (
        <ul role="status" className="flex flex-col gap-2">
          <li className="font-bold">{t.apagar.apagadoAqui}</li>
          {resultado.relaysTotal > 0 && (
            <li>{t.apagar.relays(resultado.relaysAtendidos, resultado.relaysTotal)}</li>
          )}
          <li>
            {resultado.aviso === 'enviado'
              ? t.apagar.amigoEnviado(nome)
              : t.apagar.amigoPendente(nome)}
          </li>
          {resultado.pendentes > 0 && <li>{t.apagar.pendente}</li>}
          {resultado.semChave > 0 && <li>{t.apagar.semChave(resultado.semChave)}</li>}
        </ul>
      )}

      {passo === 'resultado' && falhou && <Aviso tom="erro">{t.mensagens.falhou}</Aviso>}
    </Modal>
  )
}
