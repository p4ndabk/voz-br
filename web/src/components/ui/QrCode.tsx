import QRCode from 'qrcode'
import { useMemo } from 'react'

interface Props {
  texto: string
  rotulo: string
  tamanho?: number
}

// Desenhado como SVG, modulo a modulo: nada de innerHTML nem de servico externo.
export function QrCode({ texto, rotulo, tamanho = 220 }: Props) {
  const matriz = useMemo(() => QRCode.create(texto, { errorCorrectionLevel: 'M' }).modules, [texto])
  const lado = matriz.size
  const quadrados: number[] = []
  for (let i = 0; i < lado * lado; i++) if (matriz.data[i]) quadrados.push(i)

  return (
    <svg
      role="img"
      aria-label={rotulo}
      width={tamanho}
      height={tamanho}
      viewBox={`-2 -2 ${lado + 4} ${lado + 4}`}
      shapeRendering="crispEdges"
      className="max-w-full rounded-cordel border-2 border-borda"
    >
      {/* Fundo claro fixo: leitores de QR precisam de contraste escuro sobre claro. */}
      <rect x="-2" y="-2" width={lado + 4} height={lado + 4} fill="#fbf6ec" />
      {quadrados.map((i) => (
        <rect key={i} x={i % lado} y={Math.floor(i / lado)} width="1" height="1" fill="#1b1916" />
      ))}
    </svg>
  )
}
