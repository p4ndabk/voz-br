import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'
import { gerarIdentidade, TAMANHO_MAXIMO_NOME } from '@/nostr/identidade'
import { useSessao } from '@/nostr/useSessao'
import { CampoSenha } from './CampoSenha'
import { mensagemDoErro } from './erros'

type Identidade = ReturnType<typeof gerarIdentidade>

export function VistaCriar({ aoEntrar }: { aoEntrar: () => void }) {
  const confirmarIdentidade = useSessao((s) => s.confirmarIdentidade)
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [identidade, setIdentidade] = useState<Identidade>()
  const [guardei, setGuardei] = useState(false)
  const [erro, setErro] = useState<string>()
  const [ocupado, setOcupado] = useState(false)

  const criar = (e: FormEvent) => {
    e.preventDefault()
    setIdentidade(gerarIdentidade())
  }

  // RN-WEB-AUTH-005: so entra depois de marcar "Guardei minha chave".
  const continuar = async (e: FormEvent) => {
    e.preventDefault()
    if (!identidade || !guardei) return
    setErro(undefined)
    setOcupado(true)
    try {
      await confirmarIdentidade(identidade.chave, nome, senha || undefined)
      aoEntrar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setOcupado(false)
    }
  }

  if (!identidade) {
    return (
      <form onSubmit={criar} className="flex flex-col gap-4">
        <Campo
          rotulo={t.entrarPagina.criar.campoNome}
          ajuda={t.entrarPagina.criar.ajudaNome}
          maxLength={TAMANHO_MAXIMO_NOME}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Botao type="submit">{t.entrarPagina.criar.criar}</Botao>
      </form>
    )
  }

  return (
    <form onSubmit={continuar} className="flex flex-col gap-4">
      <h2 className="font-display text-2xl">{t.entrarPagina.criar.guardeTitulo}</h2>
      <Aviso tom="erro">{t.entrarPagina.criar.guardeAviso}</Aviso>
      <Campo
        rotulo={t.entrarPagina.criar.campoChave}
        readOnly
        value={identidade.nsec}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-sm"
      />
      <div>
        <BotaoCopiar texto={identidade.nsec} />
      </div>
      <CampoSenha valor={senha} aoMudar={setSenha} />
      <label className="flex items-center gap-3 font-bold">
        <input
          type="checkbox"
          checked={guardei}
          onChange={(e) => setGuardei(e.target.checked)}
          className="size-5 accent-[var(--vermelho)]"
        />
        {t.entrarPagina.criar.guardei}
      </label>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <Botao type="submit" disabled={!guardei || ocupado}>
        {t.entrarPagina.criar.continuar}
      </Botao>
    </form>
  )
}
