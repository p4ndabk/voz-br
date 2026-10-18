// Relays padrao do Voz (duvida 2 da spec 0002). Em 2026-10-18 cada um aceitou publicar e devolveu
// um embrulho NIP-17 (kind 1059) sem exigir conta. Ficaram de fora: relay.damus.io (exige AUTH e
// recusa a prova: "relay needs serviceUrl to be configured") e nos.lol (nao conectou).
const RELAYS_PADRAO = ['wss://relay.primal.net', 'wss://offchain.pub', 'wss://purplerelay.com']

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

// Tempo maximo para os relays terminarem uma consulta (EOSE).
export const TEMPO_CONSULTA_MS = 6_000

// Teto de conexoes extras (relays do amigo etc.), para um relay malicioso nao encher o navegador.
export const MAXIMO_RELAYS_EXTRAS = 12
