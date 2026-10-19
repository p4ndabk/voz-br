import { useEffect, useState, type CSSProperties } from 'react'

// RN-WEB-LAYOUT-007: no celular o teclado abre por cima da pagina e o navegador a rola para mostrar o
// campo de texto, e o cabecalho da conversa (com o "Mais") sobe para fora da tela. Por isso o layout
// segue a area VISIVEL (visualViewport): fica preso ao topo dela e tem a altura dela.
// Sem visualViewport, ou com zoom de pinca, devolve undefined e vale o `h-dvh` normal.
export function useAlturaVisivel(): CSSProperties | undefined {
  const [estilo, setEstilo] = useState<CSSProperties>()

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const atualizar = () => {
      if (vv.scale > 1.01) return setEstilo(undefined)
      setEstilo({
        position: 'fixed',
        top: vv.offsetTop,
        left: 0,
        right: 0,
        height: vv.height,
      })
    }
    atualizar()
    vv.addEventListener('resize', atualizar)
    vv.addEventListener('scroll', atualizar)
    // A pagina em si nunca rola: quem rola sao as listas por dentro.
    const antes = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      vv.removeEventListener('resize', atualizar)
      vv.removeEventListener('scroll', atualizar)
      document.documentElement.style.overflow = antes
    }
  }, [])

  return estilo
}
