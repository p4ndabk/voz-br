// RN-WEB-APAGAR-010 a 012: a conversa aberta se registra aqui para mostrar o fogo; `apagarLocal` pede
// `queimar` DEPOIS de apagar de verdade (IndexedDB e fila) e antes de tirar as mensagens da tela.
type Executor = (limite: number) => Promise<void>

// Rede de seguranca: se a animacao travar, o apagamento segue.
export const TEMPO_MAXIMO_QUEIMA_MS = 6_000

const executores = new Map<string, Executor>()
let cadeia: Promise<void> = Promise.resolve()

export function registrarQueima(conversa: string, executar: Executor): () => void {
  executores.set(conversa, executar)
  return () => {
    if (executores.get(conversa) === executar) executores.delete(conversa)
  }
}

// Nunca rejeita. Sem conversa aberta, ou com a aba escondida, resolve na hora.
export function queimar(conversa: string, limite: number): Promise<void> {
  const executar = executores.get(conversa)
  if (!executar) return Promise.resolve()
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return Promise.resolve()
  }
  // Uma queima de cada vez: a segunda espera a primeira terminar.
  const proxima = cadeia.then(
    () =>
      new Promise<void>((resolver) => {
        const limiteDeTempo = setTimeout(resolver, TEMPO_MAXIMO_QUEIMA_MS)
        const terminar = () => {
          clearTimeout(limiteDeTempo)
          resolver()
        }
        try {
          executar(limite).then(terminar, terminar)
        } catch {
          terminar()
        }
      }),
  )
  cadeia = proxima
  return proxima
}
