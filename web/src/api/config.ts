// Endereco da API Python. O chat nao depende dela: so o zap, para servicos Lightning que
// bloqueiam o navegador (spec 0012). Em producao sem VITE_API_URL a ponte fica desligada.
export function urlDaApi(): string | undefined {
  const configurada = import.meta.env.VITE_API_URL as string | undefined
  if (configurada) return configurada.replace(/\/+$/, '')
  return import.meta.env.MODE === 'development' ? 'http://localhost:8000' : undefined
}
