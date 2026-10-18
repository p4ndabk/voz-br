import { t } from '@/i18n/pt-BR'

interface Props {
  tipo: 'privado' | 'publico'
}

// RN-WEB-UI-004 (regra 3 da spec 0000): o usuario sempre ve se a conversa e publica ou privada.
export function Selo({ tipo }: Props) {
  const privado = tipo === 'privado'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-cordel border-2 border-borda px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
        privado ? 'bg-tinta text-fundo' : 'bg-superficie text-tinta'
      }`}
    >
      <span aria-hidden="true">{privado ? '■' : '□'}</span>
      {privado ? t.selo.privado : t.selo.publico}
    </span>
  )
}
