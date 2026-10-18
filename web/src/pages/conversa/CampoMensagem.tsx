import { useRef, useState, type KeyboardEvent } from 'react'
import { Botao } from '@/components/ui/Botao'
import { LIMITE_MENSAGEM, validarTexto } from '@/conversas/mensageria'
import { t } from '@/i18n/pt-BR'

const LINHAS_MAXIMAS = 5
const MOSTRAR_CONTADOR_A_PARTIR_DE = LIMITE_MENSAGEM - 500

interface Props {
  aoEnviar: (texto: string) => void
}

export function CampoMensagem({ aoEnviar }: Props) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const validacao = validarTexto(texto)

  // Cresce com o texto ate 5 linhas; depois rola por dentro.
  const ajustarAltura = () => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const linha = parseFloat(getComputedStyle(el).lineHeight) || 24
    el.style.height = `${Math.min(el.scrollHeight, linha * LINHAS_MAXIMAS)}px`
  }

  const enviar = () => {
    if (validacao !== 'ok') return
    aoEnviar(texto)
    setTexto('')
    requestAnimationFrame(ajustarAltura)
    area.current?.focus()
  }

  // Enter envia, Shift+Enter quebra a linha. Durante a composicao (acentos, IME) Enter nao envia.
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="flex flex-col gap-2 border-t-2 border-borda pt-3"
    >
      <div className="flex items-end gap-3">
        <textarea
          ref={area}
          rows={1}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            ajustarAltura()
          }}
          onKeyDown={aoTeclar}
          aria-label={t.mensagens.campo}
          placeholder={t.mensagens.campo}
          className="min-h-11 flex-1 resize-none rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
        />
        <Botao type="submit" disabled={validacao !== 'ok'}>
          {t.mensagens.enviar}
        </Botao>
      </div>
      {texto.length >= MOSTRAR_CONTADOR_A_PARTIR_DE && (
        <p
          aria-live="polite"
          className={`text-right text-sm ${
            validacao === 'longo' ? 'font-bold text-vermelho' : 'text-tinta-suave'
          }`}
        >
          {t.mensagens.contador(texto.length, LIMITE_MENSAGEM)}
        </p>
      )}
    </form>
  )
}
