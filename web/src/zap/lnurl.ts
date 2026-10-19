const ALFABETO = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const GERADOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]

function polimodulo(valores: number[]): number {
  let chk = 1
  for (const v of valores) {
    const topo = chk >>> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) if ((topo >>> i) & 1) chk ^= GERADOR[i] ?? 0
  }
  return chk >>> 0
}

// Codigo lnurl (LUD-01): a URL do servico em bech32, em maiusculas. O NIP-57 pede esse codigo
// na tag "lnurl" do pedido de zap.
export function codificarLnurl(url: string): string {
  const bytes = new TextEncoder().encode(url)
  const dados: number[] = []
  let acc = 0
  let bits = 0
  for (const b of bytes) {
    acc = (acc << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      dados.push((acc >> bits) & 31)
    }
    acc &= (1 << bits) - 1
  }
  if (bits > 0) dados.push((acc << (5 - bits)) & 31)

  const hrp = 'lnurl'
  const expandido = [
    ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
    0,
    ...[...hrp].map((c) => c.charCodeAt(0) & 31),
  ]
  const mod = polimodulo([...expandido, ...dados, 0, 0, 0, 0, 0, 0]) ^ 1
  const soma = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31)
  return (hrp + '1' + [...dados, ...soma].map((v) => ALFABETO[v]).join('')).toUpperCase()
}
