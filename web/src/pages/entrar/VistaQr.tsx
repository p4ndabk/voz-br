import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { Campo } from '@/components/ui/Campo'
import { QrCode } from '@/components/ui/QrCode'
import { t } from '@/i18n/pt-BR'
import { relaysPadrao } from '@/nostr/config'
import { entrarComBunker, criarConexaoQr } from '@/nostr/signer/nip46'
import { ErroLogin } from '@/nostr/signer/tipos'
import { useSessao } from '@/nostr/useSessao'
import { mensagemDoErro } from './erros'

export function VistaQr({ aoEntrar }: { aoEntrar: () => void }) {
  const entrarComAssinante = useSessao((s) => s.entrarComAssinante)
  const [tentativa, setTentativa] = useState(0)
  const [expirou, setExpirou] = useState(false)
  const [erro, setErro] = useState<string>()
  const [bunker, setBunker] = useState('')
  const [conectando, setConectando] = useState(false)
  // Uma conexao nova por tentativa ("Gerar outro" muda a tentativa).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const conexao = useMemo(() => criarConexaoQr(relaysPadrao), [tentativa])

  useEffect(() => {
    let ativo = true
    conexao
      .aguardar()
      .then(async ({ assinante, credencial }) => {
        if (!ativo) return
        await entrarComAssinante(assinante, credencial)
        aoEntrar()
      })
      .catch((falha) => {
        if (!ativo) return
        if (falha instanceof ErroLogin && falha.motivo === 'expirou') setExpirou(true)
        else setErro(mensagemDoErro(falha))
      })
    return () => {
      ativo = false
      conexao.cancelar()
    }
  }, [conexao, entrarComAssinante, aoEntrar])

  const gerarOutro = () => {
    setExpirou(false)
    setErro(undefined)
    setTentativa((n) => n + 1)
  }

  const conectarBunker = async (e: FormEvent) => {
    e.preventDefault()
    setErro(undefined)
    setConectando(true)
    try {
      const { assinante, credencial } = await entrarComBunker(bunker)
      await entrarComAssinante(assinante, credencial)
      aoEntrar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setConectando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p>{t.entrarPagina.qr.instrucao}</p>
      {expirou ? (
        <div className="flex flex-col items-start gap-3">
          <Aviso>{t.entrarPagina.qr.expirou}</Aviso>
          <Botao onClick={gerarOutro}>{t.entrarPagina.qr.gerarOutro}</Botao>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <QrCode texto={conexao.uri} rotulo={t.entrarPagina.qr.titulo} />
          <p role="status" className="text-sm text-tinta-suave">
            {t.entrarPagina.qr.aguardando}
          </p>
          <BotaoCopiar texto={conexao.uri} rotulo={t.entrarPagina.qr.copiarLink} />
        </div>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <form onSubmit={conectarBunker} className="flex flex-col gap-3 border-t-2 border-borda pt-4">
        <Campo
          rotulo={t.entrarPagina.qr.campoBunker}
          ajuda={t.entrarPagina.qr.ouColar}
          autoComplete="off"
          spellCheck={false}
          value={bunker}
          onChange={(e) => setBunker(e.target.value)}
        />
        <div>
          <Botao type="submit" variante="secundario" disabled={conectando || bunker.trim() === ''}>
            {conectando ? t.entrarPagina.qr.conectando : t.entrarPagina.qr.conectar}
          </Botao>
        </div>
      </form>
    </div>
  )
}
