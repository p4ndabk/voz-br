interface WebLN {
  enable(): Promise<void>
  sendPayment(fatura: string): Promise<{ preimage: string }>
}

function extensao(): WebLN | undefined {
  return (globalThis as unknown as { webln?: WebLN }).webln
}

export function temWebln(): boolean {
  return extensao() !== undefined
}

// RN-WEB-ZAP-008: so roda no clique da pessoa; ela confirma o valor na propria carteira.
export async function pagarComWebln(fatura: string): Promise<void> {
  const webln = extensao()
  if (!webln) throw new Error('sem-webln')
  await webln.enable()
  await webln.sendPayment(fatura)
}
