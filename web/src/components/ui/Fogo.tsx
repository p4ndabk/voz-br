import { useEffect, useRef } from 'react'
import {
  brilhoDoFundo,
  corDaChama,
  criarMundo,
  DURACAO_MS,
  opacidadeFinal,
  passo,
  yDaFrente,
  type Mundo,
  type Particula,
} from './motorDoFogo'

interface Props {
  // Chamado quando a animacao acaba (ou nao pode rodar): quem usa tira o fogo da tela.
  aoTerminar: () => void
}

function desenhar(ctx: CanvasRenderingContext2D, mundo: Mundo, tempo: number) {
  const { largura, altura } = mundo
  ctx.clearRect(0, 0, largura, altura)

  // Escurece a area queimada (sem isso a luz do fogo some no fundo claro) e acende um brilho na base.
  const frente = yDaFrente(tempo, altura)
  const brilho = brilhoDoFundo(tempo)
  const topo = Math.max(0, frente - altura * 0.22)
  const gradiente = ctx.createLinearGradient(0, topo, 0, altura)
  gradiente.addColorStop(0, 'rgba(24, 10, 6, 0)')
  gradiente.addColorStop(0.3, `rgba(24, 10, 6, ${brilho * 0.8})`)
  gradiente.addColorStop(1, `rgba(40, 12, 4, ${Math.min(0.9, brilho * 1.3)})`)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = gradiente
  ctx.fillRect(0, topo, largura, altura - topo)

  // Fumaca primeiro (por baixo), depois chamas e brasas somando luz.
  const ordem = (p: Particula) => (p.tipo === 'fumaca' ? 0 : p.tipo === 'chama' ? 1 : 2)
  const ordenadas = [...mundo.particulas].sort((a, b) => ordem(a) - ordem(b))
  for (const p of ordenadas) {
    const relativa = p.idade / p.vida
    const [r, g, b, a] = corDaChama(relativa)
    if (p.tipo === 'fumaca') {
      ctx.globalCompositeOperation = 'source-over'
      const alfa = 0.28 * (1 - relativa) * Math.min(1, p.idade / 200)
      const f = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.raio)
      f.addColorStop(0, `rgba(60, 52, 50, ${alfa})`)
      f.addColorStop(1, 'rgba(60, 52, 50, 0)')
      ctx.fillStyle = f
    } else {
      ctx.globalCompositeOperation = 'lighter'
      // Chama e alongada na vertical e tremula; brasa e um pontinho.
      const alongar = p.tipo === 'chama' ? 1.9 : 1
      const tremer = p.tipo === 'chama' ? 0.8 + 0.2 * Math.sin(p.idade / 55 + p.x) : 1
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(p.tipo === 'chama' ? 0.65 : 1, alongar)
      const f = ctx.createRadialGradient(0, 0, 0, 0, 0, p.raio)
      const intensidade = (p.tipo === 'brasa' ? Math.min(1, a * 1.3) : a) * tremer
      f.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${intensidade})`)
      f.addColorStop(
        0.45,
        `rgba(${r | 0}, ${(g * 0.7) | 0}, ${(b * 0.4) | 0}, ${intensidade * 0.55})`,
      )
      f.addColorStop(1, `rgba(${(r * 0.6) | 0}, 20, 0, 0)`)
      ctx.fillStyle = f
      ctx.beginPath()
      ctx.arc(0, 0, p.raio, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      continue
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
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
