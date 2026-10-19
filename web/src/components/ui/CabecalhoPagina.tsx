import { Link } from 'react-router-dom'
import { t } from '@/i18n/pt-BR'

interface Props {
  titulo: string
  // Para onde o ← leva (a tela de onde a pessoa veio).
  voltarPara: string
  // Nas configuracoes o menu fica sempre ao lado em tela larga, entao a seta so aparece no celular.
  soNoCelular?: boolean
}

// Cabecalho das paginas do painel do meio: sempre tem um caminho de volta, tambem no celular,
// onde a lateral some enquanto a pagina esta aberta.
export function CabecalhoPagina({ titulo, voltarPara, soNoCelular = false }: Props) {
  return (
    <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-fundo px-4 py-2">
      <Link
        to={voltarPara}
        aria-label={t.voltarPagina}
        className={`rounded-cordel border-2 border-borda px-2.5 py-1 font-bold shadow-carimbo-pequeno active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
          soNoCelular ? 'md:hidden' : ''
        }`}
      >
        ←
      </Link>
      <h1 className="font-display text-4xl">{titulo}</h1>
    </header>
  )
}
