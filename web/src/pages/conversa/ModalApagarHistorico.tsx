import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import type { ResultadoApagar } from '@/conversas/apagar'
import { t } from '@/i18n/pt-BR'

interface Props {
  nome: string
  aoFechar: () => void
  aoApagar: () => Promise<ResultadoApagar>
}

type Passo = 'aviso' | 'confirmar' | 'apagando' | 'resultado'

// RN-WEB-APAGAR-001: duas etapas (ler o que vai acontecer, depois digitar APAGAR).
// RN-WEB-APAGAR-004: antes de confirmar, diz o que e certo e o que e so um pedido.
// Montado so enquanto aberto: cada abertura recomeca do primeiro passo.
export function ModalApagarHistorico({ nome, aoFechar, aoApagar }: Props) {
  const [passo, setPasso] = useState<Passo>('aviso')
  const [texto, setTexto] = useState('')
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

  const acoes =
    passo === 'aviso' ? (
      <Botao onClick={() => setPasso('confirmar')}>{t.apagar.continuar}</Botao>
    ) : passo === 'confirmar' ? (
      <Botao onClick={apagar} disabled={texto !== t.apagar.palavra}>
        {t.apagar.apagarTudo}
      </Botao>
    ) : null

  return (
    <Modal aberto titulo={t.apagar.titulo} aoFechar={aoFechar} acoes={acoes}>
      {passo === 'aviso' && <p>{t.apagar.aviso(nome)}</p>}

      {passo === 'confirmar' && (
        <div className="flex flex-col gap-3">
          <p>{t.apagar.aviso(nome)}</p>
          <Campo
            rotulo={t.apagar.campo}
            ajuda={t.apagar.instrucao}
            autoComplete="off"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      )}

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
