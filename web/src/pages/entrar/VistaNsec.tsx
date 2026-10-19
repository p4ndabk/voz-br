import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'
import { lerNsec } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'
import { AvisoSemSenha, CampoSenha, LinkSemSenha, useEscolhaDeSenha } from './CampoSenha'
import { mensagemDoErro } from './erros'

export function VistaNsec({ aoEntrar }: { aoEntrar: () => void }) {
  const entrarComNsec = useSessao((s) => s.entrarComNsec)
  const [nsec, setNsec] = useState('')
  const escolha = useEscolhaDeSenha()
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const entrar = async (senha: string | undefined) => {
    setErro(undefined)
    setOcupado(true)
    try {
      await entrarComNsec(nsec, senha)
      aoEntrar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setOcupado(false)
    }
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    // Chave invalida mostra o erro na hora, antes de falar de senha.
    if (!lerNsec(nsec).ok) return void entrar(undefined)
    escolha.decidir((senha) => void entrar(senha))
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
      <CampoSenha escolha={escolha} />
      <LinkSemSenha escolha={escolha} aoDecidir={(senha) => void entrar(senha)} />
      <Botao type="submit" disabled={ocupado || nsec.trim() === ''}>
        {t.entrarPagina.nsec.entrar}
      </Botao>
      <AvisoSemSenha escolha={escolha} />
    </form>
  )
}
