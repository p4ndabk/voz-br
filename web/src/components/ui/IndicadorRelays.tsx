import { t } from '@/i18n/pt-BR'
import { useRelays } from '@/nostr/useRelays'

// RN-WEB-RELAYS-001: o estado dos relays chega aqui pelo hook; a tela nao toca em WebSocket.
export function IndicadorRelays() {
  const { lista, conectados, total } = useRelays()
  // No primeiro instante todos estao 'conectando': ainda nao e falta de conexao.
  const semConexao = conectados === 0 && lista.some((r) => r.estado === 'desconectado')

  return (
    <div
      className="flex flex-col items-center gap-1 text-sm text-tinta-suave"
      aria-label={t.relays.rotulo}
    >
      <p role="status" className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-block size-2.5 border-2 border-borda ${semConexao ? 'bg-superficie' : 'bg-vermelho'}`}
        />
        {semConexao ? t.relays.semConexao : t.relays.resumo(conectados, total)}
      </p>
      <ul className="sr-only">
        {lista.map((r) => (
          <li key={r.url}>
            {r.url}: {t.relays.estado[r.estado]}
          </li>
        ))}
      </ul>
    </div>
  )
}
