import { entries, get, set } from 'idb-keyval'

// RN-WEB-PRIVACIDADE-007: com a conta protegida por senha, o que e guardado no navegador (mensagens,
// lista de conversas, embrulhos e fila de pedidos) fica cifrado com AES-GCM. A chave do cofre e derivada
// (HKDF) da chave secreta da conta, que so existe na memoria depois de a senha ser digitada.
// Sem senha, ou entrando por extensao/app assinante (sem chave aqui), nada muda: fica em texto.

const INFO = new TextEncoder().encode('voz-cofre-v1')
const PREFIXOS_SENSIVEIS = [
  'voz:conversa:',
  'voz:msg:',
  'voz:embrulho:',
  'voz:fila:',
  'voz:grupo:',
] as const

interface Envelope {
  voz: 'cofre1'
  iv: string
  ct: string
}

let chaveDoCofre: CryptoKey | null = null

export const cofreAberto = () => chaveDoCofre !== null

const ehSensivel = (chave: IDBValidKey) =>
  typeof chave === 'string' && PREFIXOS_SENSIVEIS.some((p) => chave.startsWith(p))

const ehEnvelope = (valor: unknown): valor is Envelope =>
  typeof valor === 'object' && valor !== null && (valor as Envelope).voz === 'cofre1'

function paraBase64(bytes: Uint8Array): string {
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(texto)
}
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

export async function abrirCofre(segredo: Uint8Array): Promise<void> {
  const base = await crypto.subtle.importKey('raw', segredo as BufferSource, 'HKDF', false, [
    'deriveKey',
  ])
  chaveDoCofre = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function fecharCofre(): void {
  chaveDoCofre = null
}

async function selar(valor: unknown): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aberto = new TextEncoder().encode(JSON.stringify(valor))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chaveDoCofre!, aberto)
  return { voz: 'cofre1', iv: paraBase64(iv), ct: paraBase64(new Uint8Array(ct)) }
}

// undefined = nao deu para abrir (cofre fechado ou dado de outra conta/corrompido).
async function desselar(envelope: Envelope): Promise<unknown> {
  if (!chaveDoCofre) return undefined
  try {
    const aberto = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deBase64(envelope.iv) as BufferSource },
      chaveDoCofre,
      deBase64(envelope.ct) as BufferSource,
    )
    return JSON.parse(new TextDecoder().decode(aberto))
  } catch {
    return undefined
  }
}

async function paraLeitura(valor: unknown): Promise<unknown> {
  return ehEnvelope(valor) ? desselar(valor) : valor
}

export async function lerCofre<T>(chave: string): Promise<T | undefined> {
  return (await paraLeitura(await get(chave))) as T | undefined
}

export async function gravarCofre(chave: string, valor: unknown): Promise<void> {
  await set(chave, chaveDoCofre ? await selar(valor) : valor)
}

export async function listarCofre<T>(prefixo: string): Promise<T[]> {
  const itens = await entries()
  const lidos = await Promise.all(
    itens
      .filter(([chave]) => typeof chave === 'string' && chave.startsWith(prefixo))
      .map(([, valor]) => paraLeitura(valor)),
  )
  return lidos.filter((v) => v !== undefined) as T[]
}

// Cifra o que ainda esta em texto (dados de antes da senha). Pode rodar varias vezes.
export async function cifrarTudoQueFaltar(): Promise<number> {
  if (!chaveDoCofre) return 0
  let feitos = 0
  for (const [chave, valor] of await entries()) {
    if (!ehSensivel(chave) || ehEnvelope(valor)) continue
    await set(chave, await selar(valor))
    feitos++
  }
  return feitos
}
