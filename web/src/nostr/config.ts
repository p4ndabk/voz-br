// Relays padrao do Voz. Lista provisoria (duvida 2 da spec 0002): disponibilidade e
// politica de cada um ainda nao foram verificadas.
const RELAYS_PADRAO = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net']

function relaysDoAmbiente(): string[] {
  const bruto = import.meta.env.VITE_RELAYS as string | undefined
  if (!bruto) return RELAYS_PADRAO
  const lista = bruto
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.startsWith('wss://') || url.startsWith('ws://'))
  return lista.length > 0 ? lista : RELAYS_PADRAO
}

export const relaysPadrao: readonly string[] = relaysDoAmbiente()

// RN-WEB-RELAYS-002: espera crescente entre tentativas, de 1 s ate 60 s.
export const ESPERA_INICIAL_MS = 1_000
export const ESPERA_MAXIMA_MS = 60_000

// Tempo maximo para um relay responder OK ao publicar um evento.
export const TEMPO_PUBLICAR_MS = 10_000
