import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'

interface Props {
  valor: string
  aoMudar: (valor: string) => void
}

// Senha opcional que protege a nsec guardada no navegador (NIP-49).
export function CampoSenha({ valor, aoMudar }: Props) {
  return (
    <Campo
      rotulo={t.entrarPagina.senha.campo}
      ajuda={t.entrarPagina.senha.ajuda}
      type="password"
      autoComplete="new-password"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
    />
  )
}
