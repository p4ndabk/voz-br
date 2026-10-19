import { useEffect, useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { t } from '@/i18n/pt-BR'
import { conferirSenha, sessaoComNsec } from '@/nostr/sessao'
import { useSessao } from '@/nostr/useSessao'
import { ModalSenha } from '../conta/ModalSenha'
import { mensagemDoErro } from '../entrar/erros'

// RN-WEB-AUTH-009: a nsec so aparece depois de confirmacao e some em 60 s.
const TEMPO_NSEC_VISIVEL_MS = 60_000

// Configuracoes > Seguranca: a senha que protege a chave e ver a chave secreta.
export function SecaoSeguranca() {
  const assinante = useSessao((s) => s.assinante)
  const [modalChave, setModalChave] = useState(false)
  const [nsecVisivel, setNsecVisivel] = useState<string>()
  // RN-WEB-AUTH-011: undefined = ainda lendo; false = nsec em claro; true = protegida por senha.
  const [protegida, setProtegida] = useState<boolean>()
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaSalva, setSenhaSalva] = useState(false)
  // RN-WEB-AUTH-012: com senha, ver a chave pede a senha antes.
  const [senhaParaVer, setSenhaParaVer] = useState('')
  const [erroSenhaVer, setErroSenhaVer] = useState<string>()
  const [conferindo, setConferindo] = useState(false)

  const metodo = assinante?.metodo
  useEffect(() => {
    if (metodo !== 'nsec') return
    let valido = true
    void sessaoComNsec().then((sessao) => {
      if (valido) setProtegida(sessao?.protegida)
    })
    return () => {
      valido = false
    }
  }, [metodo, senhaSalva])

  useEffect(() => {
    if (!nsecVisivel) return
    const t60 = setTimeout(() => {
      setNsecVisivel(undefined)
      setModalChave(false)
    }, TEMPO_NSEC_VISIVEL_MS)
    return () => clearTimeout(t60)
  }, [nsecVisivel])

  if (!assinante) return null

  const fecharChave = () => {
    setNsecVisivel(undefined)
    setModalChave(false)
    setSenhaParaVer('')
    setErroSenhaVer(undefined)
  }

  const mostrarChave = async () => {
    if (protegida) {
      setConferindo(true)
      setErroSenhaVer(undefined)
      try {
        await conferirSenha(senhaParaVer)
      } catch (falha) {
        setErroSenhaVer(mensagemDoErro(falha))
        return
      } finally {
        setConferindo(false)
      }
      setSenhaParaVer('')
    }
    setNsecVisivel(assinante.exportarNsec?.())
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.configuracoes.seguranca} voltarPara="/configuracoes" soNoCelular />

      <section className="flex flex-col gap-2" aria-labelledby="senha-da-chave">
        <h2 id="senha-da-chave" className="font-bold">
          {t.conta.senha.secao}
        </h2>
        {assinante.metodo !== 'nsec' ? (
          <p className="text-sm text-tinta-suave">{t.conta.senha.extensao}</p>
        ) : (
          protegida !== undefined && (
            <>
              <p className="text-sm text-tinta-suave">
                {protegida ? t.conta.senha.protegida : t.conta.senha.desprotegida}
              </p>
              {senhaSalva && <p role="status">{t.conta.senha.salva}</p>}
              <div>
                <Botao variante="secundario" onClick={() => setModalSenha(true)}>
                  {protegida ? t.conta.senha.trocar : t.conta.senha.proteger}
                </Botao>
              </div>
            </>
          )
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {assinante.exportarNsec && (
          <Botao variante="secundario" onClick={() => setModalChave(true)}>
            {t.conta.verChave}
          </Botao>
        )}
      </div>

      <Modal
        aberto={modalChave}
        titulo={t.conta.verChaveTitulo}
        aoFechar={fecharChave}
        acoes={
          !nsecVisivel && (
            <Botao
              onClick={() => void mostrarChave()}
              disabled={conferindo || (protegida === true && senhaParaVer === '')}
            >
              {t.conta.mostrar}
            </Botao>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <Aviso tom="erro">{t.conta.verChaveAviso}</Aviso>
          {protegida && !nsecVisivel && (
            <Campo
              rotulo={t.conta.senha.campoVer}
              ajuda={t.conta.senha.pedirParaVer}
              erro={erroSenhaVer}
              type="password"
              autoComplete="current-password"
              value={senhaParaVer}
              onChange={(e) => setSenhaParaVer(e.target.value)}
            />
          )}
          {nsecVisivel && (
            <>
              <p className="break-all rounded-cordel border-2 border-borda bg-fundo p-3 font-mono text-sm">
                {nsecVisivel}
              </p>
              <div>
                <BotaoCopiar texto={nsecVisivel} />
              </div>
            </>
          )}
        </div>
      </Modal>

      <ModalSenha
        aberto={modalSenha}
        modo={protegida ? 'trocar' : 'proteger'}
        aoFechar={() => setModalSenha(false)}
        aoConcluir={() => setSenhaSalva(true)}
      />
    </main>
  )
}
