// RN-WEB-PUBLICACAO-003: politica de seguranca do HTML publicado. O GitHub Pages nao deixa configurar
// cabecalhos, entao ela vai por <meta>. connect-src e img-src ficam abertos a https porque o zap consulta
// o servico Lightning de qualquer dominio e as fotos de perfil vem de qualquer URL (RN-WEB-PUBLICACAO-005).
export const POLITICA_DE_SEGURANCA = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' wss: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export function injetarPoliticaDeSeguranca(html: string): string {
  const metas =
    `<meta http-equiv="Content-Security-Policy" content="${POLITICA_DE_SEGURANCA}" />\n` +
    '    <meta name="referrer" content="no-referrer" />\n    '
  return html.replace('<meta charset="UTF-8" />\n    ', (inicio) => inicio + metas)
}
