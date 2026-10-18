import { useState } from 'react'
import { t } from '@/i18n/pt-BR'
import { Botao } from './Botao'

interface Props {
  texto: string
  rotulo?: string
}

export function BotaoCopiar({ texto, rotulo = t.copiar }: Props) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // sem permissao de area de transferencia: a pessoa ainda pode selecionar o texto
    }
  }

  return (
    <Botao variante="secundario" onClick={copiar}>
      {copiado ? t.copiado : rotulo}
    </Botao>
  )
}
