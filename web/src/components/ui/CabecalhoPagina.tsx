import { Link } from 'react-router-dom'
import { t } from '@/i18n/pt-BR'

interface Props {
  titulo: string
  // Para onde o ← leva (a tela de onde a pessoa veio).
  voltarPara: string
}

// Cabecalho das paginas do painel do meio: sempre tem um caminho de volta, tambem no celular,
// onde a lateral some enquanto a pagina esta aberta.
export function CabecalhoPagina({ titulo, voltarPara }: Props) {
  return (
    <header className="flex items-center gap-3">
      <Link
        to={voltarPara}
        aria-label={t.voltarPagina}
        className="rounded-cordel border-2 border-borda px-2.5 py-1 font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        ←
      </Link>
      <h1 className="font-display text-4xl">{titulo}</h1>
    </header>
  )
}
