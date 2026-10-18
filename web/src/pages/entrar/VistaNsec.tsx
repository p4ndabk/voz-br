import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'
import { CampoSenha } from './CampoSenha'
import { mensagemDoErro } from './erros'

export function VistaNsec({ aoEntrar }: { aoEntrar: () => void }) {
  const entrarComNsec = useSessao((s) => s.entrarComNsec)
  const [nsec, setNsec] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(undefined)
    setOcupado(true)
    try {
      await entrarComNsec(nsec, senha || undefined)
      aoEntrar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Aviso>{t.entrarPagina.nsec.risco}</Aviso>
      <Campo
        rotulo={t.entrarPagina.nsec.campo}
        ajuda={t.entrarPagina.nsec.ajuda}
        erro={erro}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={nsec}
        onChange={(e) => setNsec(e.target.value)}
      />
      <CampoSenha valor={senha} aoMudar={setSenha} />
      <Botao type="submit" disabled={ocupado || nsec.trim() === ''}>
        {t.entrarPagina.nsec.entrar}
      </Botao>
    </form>
  )
}
