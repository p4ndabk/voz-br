import { useState, type FormEvent } from 'react'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'
import { mensagemDoErro } from './entrar/erros'

export function Destravar() {
  const destravar = useSessao((s) => s.destravar)
  const sair = useSessao((s) => s.sair)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(undefined)
    setOcupado(true)
    try {
      await destravar(senha)
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setOcupado(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-4">
      <h1 className="font-display text-4xl">{t.destravar.titulo}</h1>
      <p className="text-tinta-suave">{t.destravar.descricao}</p>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          rotulo={t.destravar.campo}
          type="password"
          autoComplete="current-password"
          autoFocus
          erro={erro}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Botao type="submit" disabled={ocupado || senha === ''}>
          {t.destravar.entrar}
        </Botao>
      </form>
      <button
        type="button"
        onClick={() => void sair()}
        className="self-start font-bold underline underline-offset-4"
      >
        {t.destravar.trocarConta}
      </button>
    </main>
  )
}
