import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Botao } from '@/components/ui/Botao'
import { Identidade } from '@/components/ui/Identidade'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { ModalSair } from '@/components/ModalSair'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import {
  desligarNotificacoes,
  estadoNotificacoes,
  ligarNotificacoes,
  type EstadoNotificacoes,
} from '@/conversas/notificacoes'
import { useSincronia } from '@/conversas/useSincronia'
import { definirSom, somLigado, tocarFogo, tocarPlin } from '@/conversas/som'
import { t } from '@/i18n/pt-BR'
import { conferirSenha, sessaoComNsec } from '@/nostr/sessao'
import { npubDe } from '@/nostr/signer/chaves'
import { useSessao } from '@/nostr/useSessao'
import { mensagemDoErro } from './entrar/erros'
import { ModalSenha } from './conta/ModalSenha'

// RN-WEB-AUTH-009: a nsec so aparece depois de confirmacao e some em 60 s.
const TEMPO_NSEC_VISIVEL_MS = 60_000

export function Conta() {
  const assinante = useSessao((s) => s.assinante)
  const [modalChave, setModalChave] = useState(false)
  const [nsecVisivel, setNsecVisivel] = useState<string>()
  const [modalSair, setModalSair] = useState(false)
  // RN-WEB-AUTH-011: undefined = ainda lendo; false = nsec em claro; true = protegida por senha.
  const [protegida, setProtegida] = useState<boolean>()
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaSalva, setSenhaSalva] = useState(false)
  // RN-WEB-AUTH-012: com senha, ver a chave pede a senha antes.
  const [senhaParaVer, setSenhaParaVer] = useState('')
  const [erroSenhaVer, setErroSenhaVer] = useState<string>()
  const [conferindo, setConferindo] = useState(false)
  const [som, setSom] = useState(somLigado)
  const sincLigada = useSincronia((s) => s.ligada)
  const sincEstado = useSincronia((s) => s.estado)
  const sincUltima = useSincronia((s) => s.ultimaEm)
  const definirSincLigada = useSincronia((s) => s.definirLigada)
  const sincronizarAgora = useSincronia((s) => s.sincronizarAgora)
  const [avisos, setAvisos] = useState<EstadoNotificacoes>(estadoNotificacoes)

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
  const npub = npubDe(assinante.pubkey)

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
      <CabecalhoPagina titulo={t.conta.titulo} voltarPara="/conversas" />
      <Identidade pubkey={assinante.pubkey} tamanho={56} />
      <p className="text-tinta-suave">{t.conta.metodo[assinante.metodo]}</p>

      {/* RN-WEB-LAYOUT-004: os atalhos da conta ficam no topo, a vista, sem precisar rolar. */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/conta/perfil"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.conta.editarPerfil}
        </Link>
        <Link
          to="/conta/relays"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.relaysConfig.link}
        </Link>
        <Link
          to="/meu-codigo"
          className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          {t.conversas.meuCodigo}
        </Link>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t.conta.chavePublica}</h2>
        <p className="break-all rounded-cordel border-2 border-borda bg-superficie p-3 font-mono text-sm">
          {npub}
        </p>
        <p className="text-sm text-tinta-suave">{t.conta.chavePublicaAjuda}</p>
        <div>
          <BotaoCopiar texto={npub} />
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="lista-portatil">
        <h2 id="lista-portatil" className="font-bold">
          {t.sincronia.secao}
        </h2>
        <p className="text-sm text-tinta-suave">{t.sincronia.ajuda}</p>
        <p role="status">
          {!sincLigada
            ? t.sincronia.desligada
            : sincEstado === 'sincronizando'
              ? t.sincronia.sincronizando
              : sincEstado === 'falhou'
                ? t.sincronia.falhou
                : sincUltima
                  ? t.sincronia.ok(
                      new Date(sincUltima).toLocaleTimeString('pt-BR', { timeStyle: 'short' }),
                    )
                  : t.sincronia.aindaNao}
        </p>
        <div className="flex flex-wrap gap-3">
          <Botao variante="secundario" onClick={() => definirSincLigada(!sincLigada)}>
            {sincLigada ? t.sincronia.desligar : t.sincronia.ligar}
          </Botao>
          {sincLigada && (
            <Botao
              variante="secundario"
              disabled={sincEstado === 'sincronizando'}
              onClick={() => void sincronizarAgora(assinante)}
            >
              {t.sincronia.agora}
            </Botao>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="som-mensagem">
        <h2 id="som-mensagem" className="font-bold">
          {t.notificacoes.som}
        </h2>
        <p className="text-sm text-tinta-suave">{t.notificacoes.somAjuda}</p>
        <p role="status">{som ? t.notificacoes.somLigado : t.notificacoes.somSilenciado}</p>
        <div>
          <Botao
            variante="secundario"
            onClick={() => {
              definirSom(!som)
              setSom(!som)
            }}
          >
            {som ? t.notificacoes.somSilenciar : t.notificacoes.somLigar}
          </Botao>
          <Botao variante="secundario" className="ml-3" onClick={() => tocarPlin(true)}>
            {t.notificacoes.somOuvir}
          </Botao>
          <Botao variante="secundario" className="ml-3" onClick={() => tocarFogo(2400, true)}>
            {t.notificacoes.somOuvirFogo}
          </Botao>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="avisos-navegador">
        <h2 id="avisos-navegador" className="font-bold">
          {t.notificacoes.secao}
        </h2>
        <p className="text-sm text-tinta-suave">{t.notificacoes.ajuda}</p>
        {avisos === 'ligada' && <p role="status">{t.notificacoes.ligados}</p>}
        {avisos === 'bloqueada' && <Aviso tom="erro">{t.notificacoes.bloqueada}</Aviso>}
        {avisos === 'indisponivel' && <p>{t.notificacoes.indisponivel}</p>}
        {(avisos === 'desligada' || avisos === 'ligada') && (
          <div>
            <Botao
              variante="secundario"
              onClick={async () => {
                if (avisos === 'ligada') {
                  desligarNotificacoes()
                  setAvisos(estadoNotificacoes())
                } else {
                  setAvisos(await ligarNotificacoes())
                }
              }}
            >
              {avisos === 'ligada' ? t.notificacoes.desligar : t.notificacoes.ligar}
            </Botao>
          </div>
        )}
      </section>

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
        <Botao variante="secundario" onClick={() => setModalSair(true)}>
          {t.conta.sair}
        </Botao>
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

      <ModalSair aberto={modalSair} aoFechar={() => setModalSair(false)} />
    </main>
  )
}
