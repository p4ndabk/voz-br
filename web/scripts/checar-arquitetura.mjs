// RN-WEB-ARQ-002: web/ nao importa nada de fora de web/.
// Falha o build se algum import relativo escapar da pasta web/.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const padrao = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]*)['"]/g
const erros = []

function varrer(pasta) {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) varrer(caminho)
    else if (/\.(ts|tsx|js|mjs)$/.test(nome)) checar(caminho)
  }
}

function checar(arquivo) {
  const texto = readFileSync(arquivo, 'utf8')
  for (const [, alvo] of texto.matchAll(padrao)) {
    const resolvido = resolve(dirname(arquivo), alvo)
    if (relative(raiz, resolvido).startsWith('..')) {
      erros.push(`${relative(raiz, arquivo)} importa fora de web/: ${alvo}`)
    }
  }
}

for (const pasta of ['src', 'scripts']) varrer(join(raiz, pasta))

if (erros.length > 0) {
  console.error(erros.join('\n'))
  process.exit(1)
}
console.log('arquitetura ok: nenhum import escapa de web/')
