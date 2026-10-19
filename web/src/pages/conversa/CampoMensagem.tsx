import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Botao } from '@/components/ui/Botao'
import { LIMITE_MENSAGEM, validarTexto } from '@/conversas/mensageria'
import { t } from '@/i18n/pt-BR'
import { alturaDoCampo, guardarAltura, lerAlturaGuardada } from './alturaCampo'

const LINHAS_MAXIMAS = 5
const MOSTRAR_CONTADOR_A_PARTIR_DE = LIMITE_MENSAGEM - 500

interface Props {
  aoEnviar: (texto: string) => void
}

export function CampoMensagem({ aoEnviar }: Props) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const validacao = validarTexto(texto)

  // Altura que a pessoa arrastou com o mouse (0 = nunca mexeu) e a ultima que o campo se deu sozinho.
  const manual = useRef(lerAlturaGuardada())
  const automatica = useRef(0)

  // Cresce com o texto ate 5 linhas, sem ficar menor que o tamanho escolhido na mao.
  const ajustarAltura = () => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const linha = parseFloat(getComputedStyle(el).lineHeight) || 24
    const altura = alturaDoCampo(manual.current, el.scrollHeight, linha * LINHAS_MAXIMAS)
    automatica.current = altura
    el.style.height = `${altura}px`
  }

  // Arrastar a alca muda a altura sem passar pelo ajuste automatico: o que difere do ultimo valor que o
  // campo se deu e tamanho escolhido na mao. (O navegador nao avisa o mouse solto sobre a alca.)
  useEffect(() => {
    const el = area.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(() => {
      const atual = el.offsetHeight
      if (atual > 0 && Math.abs(atual - automatica.current) > 2) {
        manual.current = atual
        automatica.current = atual
        guardarAltura(atual)
      }
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  useEffect(ajustarAltura, [])

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
          className="min-h-11 max-h-[50dvh] flex-1 resize-y rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
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
