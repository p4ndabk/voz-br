import { useEffect, useRef } from 'react'
import {
  alturaDaLingua,
  criarMundo,
  DURACAO_MS,
  opacidadeFinal,
  passo,
  progressoDaCauda,
  yDaFrente,
  type Mundo,
  type Particula,
} from './motorDoFogo'

interface Props {
  // Chamado quando a animacao acaba (ou nao pode rodar): quem usa tira o fogo da tela.
  aoTerminar: () => void
}

// Xilogravura de cordel: poucas cores chapadas (a paleta do Voz), contorno preto grosso e riscado.
const TINTA = '#1b1916'
const VERMELHO = '#b3261e'
const OCRE = '#e0a02c'
const PAPEL = '#f2e8d5'

// Riscado de entalhe: tracos verticais pretos dentro da camada vermelha (clipada pela propria forma).
function riscar(ctx: CanvasRenderingContext2D, largura: number, topo: number, base: number) {
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = TINTA
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = 4; x < largura; x += 11) {
    const comeco = topo + 18 + ((x * 7) % 23)
    ctx.moveTo(x, comeco)
    ctx.lineTo(x, Math.min(base, comeco + 26 + ((x * 13) % 31)))
  }
  ctx.stroke()
  ctx.restore()
}

// Muro de chamas: tres camadas de linguas afiadas, uma dentro da outra. A de cima acompanha a frente
// que sobe; a de baixo, a cauda que leva o fogo embora (RN-WEB-APAGAR-010).
function desenharMuro(ctx: CanvasRenderingContext2D, mundo: Mundo, tempo: number) {
  const { largura, altura } = mundo
  const frente = yDaFrente(tempo, altura)
  const cauda = altura * (1 - progressoDaCauda(tempo)) + 8
  const camadas = [
    { cor: VERMELHO, recuo: 0, fase: 0, risca: true },
    { cor: OCRE, recuo: 18, fase: 1.3, risca: false },
    { cor: PAPEL, recuo: 40, fase: 2.6, risca: false },
  ]
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = TINTA
  for (const { cor, recuo, fase, risca } of camadas) {
    const topo = frente + recuo
    const base = cauda - recuo * 0.6
    if (topo >= base) continue
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.moveTo(0, base + alturaDaLingua(0, tempo, fase + 3) * 0.5)
    ctx.lineTo(0, topo - alturaDaLingua(0, tempo, fase))
    for (let x = 6; x <= largura + 6; x += 6) {
      ctx.lineTo(x, topo - alturaDaLingua(x, tempo, fase))
    }
    ctx.lineTo(largura + 6, base + alturaDaLingua(largura, tempo, fase + 3) * 0.5)
    for (let x = largura; x >= 0; x -= 6) {
      ctx.lineTo(x, base + alturaDaLingua(x, tempo, fase + 3) * 0.5)
    }
    ctx.closePath()
    ctx.fill()
    if (risca) riscar(ctx, largura, topo, base)
    ctx.stroke()
  }
}

function gota(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.7)
  ctx.bezierCurveTo(x + r * 0.95, y - r * 0.3, x + r * 0.75, y + r, x, y + r)
  ctx.bezierCurveTo(x - r * 0.75, y + r, x - r * 0.95, y - r * 0.3, x, y - r * 1.7)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function desenhar(ctx: CanvasRenderingContext2D, mundo: Mundo, tempo: number) {
  const { largura, altura } = mundo
  ctx.clearRect(0, 0, largura, altura)
  ctx.globalCompositeOperation = 'source-over'
  desenharMuro(ctx, mundo, tempo)

  // Linguas soltas e fagulhas, na mesma paleta; a cor so muda em degraus, conforme a idade.
  const pintar = (p: Particula) => {
    const relativa = p.idade / p.vida
    ctx.globalAlpha = relativa > 0.8 ? Math.max(0, (1 - relativa) / 0.2) : 1
    ctx.strokeStyle = TINTA
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    if (p.tipo === 'brasa') {
      ctx.fillStyle = relativa < 0.5 ? PAPEL : OCRE
      const lado = Math.max(3, p.raio * 1.5)
      ctx.fillRect(p.x - lado / 2, p.y - lado / 2, lado, lado)
      ctx.lineWidth = 2
      ctx.strokeRect(p.x - lado / 2, p.y - lado / 2, lado, lado)
      return
    }
    if (p.tipo !== 'chama') return
    const r = Math.max(4, p.raio * 0.85)
    ctx.fillStyle = relativa < 0.4 ? OCRE : VERMELHO
    gota(ctx, p.x, p.y, r)
    ctx.lineWidth = 2
    ctx.fillStyle = relativa < 0.4 ? PAPEL : OCRE
    gota(ctx, p.x, p.y + r * 0.2, r * 0.5)
  }
  for (const p of mundo.particulas) pintar(p)
  ctx.globalAlpha = 1
}

// RN-WEB-APAGAR-010: fogo em canvas por cima da area das mensagens. Nao captura toque nem aparece para
// leitor de tela (quem usa avisa com um texto). Se o canvas nao puder ser usado, termina na hora.
export function Fogo({ aoTerminar }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const terminar = useRef(aoTerminar)
  useEffect(() => {
    terminar.current = aoTerminar
  })

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) {
      terminar.current()
      return
    }
    const dono = el.parentElement
    const caixa = dono?.getBoundingClientRect()
    const largura = Math.max(1, Math.round(caixa?.width ?? el.clientWidth ?? 1))
    const altura = Math.max(1, Math.round(caixa?.height ?? el.clientHeight ?? 1))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el.width = Math.round(largura * dpr)
    el.height = Math.round(altura * dpr)
    ctx.scale(dpr, dpr)
    const mundo = criarMundo(largura, altura)

    let quadro = 0
    let inicio = 0
    let anterior = 0
    let acabou = false
    const acabar = () => {
      if (acabou) return
      acabou = true
      cancelAnimationFrame(quadro)
      terminar.current()
    }
    const tocar = (agora: number) => {
      try {
        if (!inicio) {
          inicio = agora
          anterior = agora
        }
        const tempo = agora - inicio
        // Aba voltando de pausa: nao simula um salto enorme de uma vez.
        const dt = Math.min(agora - anterior, 50)
        anterior = agora
        passo(mundo, tempo, dt, Math.random)
        desenhar(ctx, mundo, tempo)
        el.style.opacity = String(opacidadeFinal(tempo))
        if (tempo >= DURACAO_MS) return acabar()
        quadro = requestAnimationFrame(tocar)
      } catch {
        acabar()
      }
    }
    quadro = requestAnimationFrame(tocar)
    return () => {
      acabou = true
      cancelAnimationFrame(quadro)
    }
  }, [])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-testid="fogo"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  )
}
