// Quanto vale 1 unidade de cada multiplicador de fatura, em milissatoshis (1 BTC = 10^11 msat).
const MULTIPLICADOR: Record<string, number> = { '': 1e11, m: 1e8, u: 1e5, n: 1e2, p: 0.1 }

// Valor da fatura BOLT11 da rede principal em milissatoshis, ou null se a fatura nao for da
// rede principal, nao tiver valor ou nao der para ler.
export function milissatsDaFatura(fatura: string): number | null {
  const texto = fatura.trim().toLowerCase()
  const separador = texto.lastIndexOf('1')
  if (separador < 0) return null
  const m = /^lnbc(\d+)([munp]?)$/.exec(texto.slice(0, separador))
  if (!m) return null
  const valor = Math.round(Number(m[1]) * (MULTIPLICADOR[m[2] ?? ''] ?? NaN))
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null
}

// RN-WEB-ZAP-006: a fatura tem de ser da rede principal e do valor exato que a pessoa escolheu.
export function faturaConfere(fatura: string, milissats: number): boolean {
  return milissatsDaFatura(fatura) === milissats
}
