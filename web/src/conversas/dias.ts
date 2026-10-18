import { t } from '@/i18n/pt-BR'

const diaEMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// "Hoje", "Ontem" ou "12 de outubro". `agora` em milissegundos, para poder testar.
export function rotuloDoDia(segundos: number, agora = Date.now()): string {
  const dias = Math.round(
    (inicioDoDia(new Date(agora)) - inicioDoDia(new Date(segundos * 1000))) / 86_400_000,
  )
  if (dias === 0) return t.mensagens.hoje
  if (dias === 1) return t.mensagens.ontem
  return diaEMes.format(new Date(segundos * 1000))
}

export function horaDe(segundos: number): string {
  return hora.format(new Date(segundos * 1000))
}

export function chaveDoDia(segundos: number): string {
  const d = new Date(segundos * 1000)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const diaMesCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

// Hora da ultima mensagem na lista: "14:32" se foi hoje, "Ontem" ou "12/10".
export function horarioNaLista(segundos: number, agora = Date.now()): string {
  const rotulo = rotuloDoDia(segundos, agora)
  if (rotulo === t.mensagens.hoje) return horaDe(segundos)
  if (rotulo === t.mensagens.ontem) return rotulo
  return diaMesCurto.format(new Date(segundos * 1000))
}

const dataCompleta = new Intl.DateTimeFormat('pt-BR')

// "18/10/2026"
export function dataDe(segundos: number): string {
  return dataCompleta.format(new Date(segundos * 1000))
}
