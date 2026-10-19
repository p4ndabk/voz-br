import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Botao } from '@/components/ui/Botao'
import { IconeEmoji } from '@/components/ui/IconeEmoji'
import { LIMITE_MENSAGEM, validarTexto } from '@/conversas/mensageria'
import { t } from '@/i18n/pt-BR'
import { EMOJIS, inserirNoCursor } from './emojis'
import {
  ALTURA_MINIMA,
  alturaDoCampo,
  guardarAltura,
  lerAlturaGuardada,
  limitarAltura,
} from './alturaCampo'

const LINHAS_MAXIMAS = 5
const MOSTRAR_CONTADOR_A_PARTIR_DE = LIMITE_MENSAGEM - 500

interface Props {
  aoEnviar: (texto: string) => void
}

export function CampoMensagem({ aoEnviar }: Props) {
  const [texto, setTexto] = useState('')
  const [emojisAbertos, setEmojisAbertos] = useState(false)
  const grade = useRef<HTMLDivElement>(null)
  const botaoEmoji = useRef<HTMLButtonElement>(null)
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

  // RN-WEB-MENSAGENS-011: a alca no topo do campo. Arrastar para cima aumenta, para baixo diminui;
  // as setas do teclado fazem o mesmo.
  const arrasto = useRef<{ y: number; altura: number } | null>(null)

  const definirAltura = (pedida: number) => {
    const el = area.current
    if (!el) return
    const nova = limitarAltura(pedida, window.innerHeight)
    manual.current = nova
    automatica.current = nova
    el.style.height = `${nova}px`
  }

  const aoComecarArrasto = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { y: e.clientY, altura: area.current?.offsetHeight ?? ALTURA_MINIMA }
  }
  const aoArrastar = (e: PointerEvent<HTMLDivElement>) => {
    if (arrasto.current) definirAltura(arrasto.current.altura + (arrasto.current.y - e.clientY))
  }
  const aoTerminarArrasto = () => {
    if (!arrasto.current) return
    arrasto.current = null
    guardarAltura(manual.current)
  }
  const aoTeclarAlca = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    definirAltura((area.current?.offsetHeight ?? ALTURA_MINIMA) + (e.key === 'ArrowUp' ? 24 : -24))
    guardarAltura(manual.current)
  }

  useEffect(ajustarAltura, [])

  // RN-WEB-MENSAGENS-012: clicar fora da grade (ou apertar Esc) fecha o seletor de emojis.
  useEffect(() => {
    if (!emojisAbertos) return
    const fora = (e: globalThis.PointerEvent) => {
      const alvo = e.target as Node
      if (grade.current?.contains(alvo) || botaoEmoji.current?.contains(alvo)) return
      setEmojisAbertos(false)
    }
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setEmojisAbertos(false)
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [emojisAbertos])

  const enviar = () => {
    if (validacao !== 'ok') return
    aoEnviar(texto)
    setTexto('')
    requestAnimationFrame(ajustarAltura)
    area.current?.focus()
  }

  const colocarEmoji = (emoji: string) => {
    const el = area.current
    const r = inserirNoCursor(
      texto,
      emoji,
      el?.selectionStart ?? texto.length,
      el?.selectionEnd ?? texto.length,
    )
    setTexto(r.texto)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(r.cursor, r.cursor)
      ajustarAltura()
    })
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
      className="relative flex flex-col gap-2 border-t-2 border-borda"
    >
      {/* Alca de redimensionar no topo do campo. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t.mensagens.redimensionar}
        tabIndex={0}
        onPointerDown={aoComecarArrasto}
        onPointerMove={aoArrastar}
        onPointerUp={aoTerminarArrasto}
        onPointerCancel={aoTerminarArrasto}
        onKeyDown={aoTeclarAlca}
        className="group flex h-4 cursor-ns-resize touch-none items-center justify-center"
      >
        <span className="h-1 w-12 rounded-full bg-borda opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
      {emojisAbertos && (
        <div
          ref={grade}
          role="group"
          aria-label={t.mensagens.emojis}
          className="absolute bottom-full left-0 z-10 mb-2 grid grid-cols-8 gap-0.5 rounded-cordel border-2 border-borda bg-superficie p-1.5 shadow-carimbo-pequeno"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={t.mensagens.inserirEmoji(e)}
              onClick={() => colocarEmoji(e)}
              className="rounded-cordel p-1 text-xl leading-none hover:bg-fundo"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          ref={botaoEmoji}
          type="button"
          aria-label={t.mensagens.emojis}
          aria-expanded={emojisAbertos}
          onClick={() => setEmojisAbertos((a) => !a)}
          className={`flex h-11 w-9 shrink-0 items-center justify-center transition-colors hover:text-tinta ${
            emojisAbertos ? 'text-vermelho' : 'text-tinta-suave'
          }`}
        >
          <IconeEmoji />
        </button>
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
          className="min-h-11 max-h-[50dvh] flex-1 resize-none rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
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
