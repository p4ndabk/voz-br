import { useEffect, useRef, useState } from 'react'
import { t } from '@/i18n/pt-BR'
import { Aviso } from './Aviso'

interface Props {
  aoLer: (texto: string) => void
}

// Le QR pela camera. A decodificacao roda no proprio navegador (jsQR); nada e enviado.
export function LeitorQr({ aoLer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [indisponivel, setIndisponivel] = useState(false)

  useEffect(() => {
    let ativo = true
    let quadro = 0
    let fluxo: MediaStream | undefined

    async function iniciar() {
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!ativo || !video.current) return fluxo.getTracks().forEach((f) => f.stop())
        video.current.srcObject = fluxo
        await video.current.play()
        const { default: jsQR } = await import('jsqr')
        const tela = document.createElement('canvas')
        const contexto = tela.getContext('2d', { willReadFrequently: true })

        const varrer = () => {
          const v = video.current
          if (!ativo || !v || !contexto) return
          if (v.readyState >= 2 && v.videoWidth > 0) {
            tela.width = v.videoWidth
            tela.height = v.videoHeight
            contexto.drawImage(v, 0, 0)
            const imagem = contexto.getImageData(0, 0, tela.width, tela.height)
            const achado = jsQR(imagem.data, imagem.width, imagem.height)
            if (achado?.data) return aoLer(achado.data)
          }
          quadro = requestAnimationFrame(varrer)
        }
        varrer()
      } catch {
        if (ativo) setIndisponivel(true)
      }
    }

    void iniciar()
    return () => {
      ativo = false
      cancelAnimationFrame(quadro)
      fluxo?.getTracks().forEach((f) => f.stop())
    }
  }, [aoLer])

  if (indisponivel) return <Aviso tom="erro">{t.camera.indisponivel}</Aviso>
  return (
    <div className="flex flex-col gap-2">
      <video
        ref={video}
        muted
        playsInline
        className="aspect-square w-full max-w-sm rounded-cordel border-2 border-borda bg-tinta object-cover"
      />
      <p className="text-sm text-tinta-suave">{t.camera.instrucao}</p>
    </div>
  )
}
