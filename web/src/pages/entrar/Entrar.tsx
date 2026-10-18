import { useCallback, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { t } from '@/i18n/pt-BR'
import { extensaoDisponivel } from '@/nostr/signer/nip07'
import { useSessao } from '@/nostr/useSessao'
import { mensagemDoErro } from './erros'
import { VistaCriar } from './VistaCriar'
import { VistaNsec } from './VistaNsec'
import { VistaQr } from './VistaQr'

type Vista = 'menu' | 'qr' | 'nsec' | 'criar'

function Opcao({
  titulo,
  descricao,
  aoClicar,
  desabilitada,
  nota,
}: {
  titulo: string
  descricao: string
  aoClicar: () => void
  desabilitada?: boolean
  nota?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={aoClicar}
        disabled={desabilitada}
        className="flex flex-col items-start gap-1 rounded-cordel border-2 border-borda bg-superficie p-4 text-left shadow-carimbo enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        <span className="font-display text-xl">{titulo}</span>
        <span className="text-tinta-suave">{descricao}</span>
      </button>
      {nota}
    </div>
  )
}

export function Entrar() {
  const navigate = useNavigate()
  const entrarComExtensao = useSessao((s) => s.entrarComExtensao)
  const [vista, setVista] = useState<Vista>('menu')
  const [erro, setErro] = useState<string>()
  const [aguardandoExtensao, setAguardandoExtensao] = useState(false)
  const temExtensao = extensaoDisponivel()
  const aoEntrar = useCallback(() => navigate('/conversas'), [navigate])

  const viaExtensao = async () => {
    setErro(undefined)
    setAguardandoExtensao(true)
    try {
      await entrarComExtensao()
      aoEntrar()
    } catch (falha) {
      setErro(mensagemDoErro(falha))
      setAguardandoExtensao(false)
    }
  }

  const titulos: Record<Exclude<Vista, 'menu'>, string> = {
    qr: t.entrarPagina.qr.titulo,
    nsec: t.entrarPagina.nsec.titulo,
    criar: t.entrarPagina.criar.titulo,
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-4xl">
        {vista === 'menu' ? t.entrarPagina.titulo : titulos[vista]}
      </h1>

      {vista === 'menu' ? (
        <>
          <p className="text-tinta-suave">{t.entrarPagina.intro}</p>
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <Opcao
            titulo={t.entrarPagina.extensao.titulo}
            descricao={
              aguardandoExtensao
                ? t.entrarPagina.extensao.entrando
                : temExtensao
                  ? t.entrarPagina.extensao.descricao
                  : t.entrarPagina.extensao.ausente
            }
            aoClicar={viaExtensao}
            desabilitada={!temExtensao || aguardandoExtensao}
            nota={
              !temExtensao && (
                <a
                  href="https://getalby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold underline underline-offset-4"
                >
                  {t.entrarPagina.extensao.comoInstalar}
                </a>
              )
            }
          />
          <Opcao
            titulo={t.entrarPagina.qr.titulo}
            descricao={t.entrarPagina.qr.descricao}
            aoClicar={() => setVista('qr')}
          />
          <Opcao
            titulo={t.entrarPagina.nsec.titulo}
            descricao={t.entrarPagina.nsec.descricao}
            aoClicar={() => setVista('nsec')}
          />
          <Opcao
            titulo={t.entrarPagina.criar.titulo}
            descricao={t.entrarPagina.criar.descricao}
            aoClicar={() => setVista('criar')}
          />
        </>
      ) : (
        <>
          {vista === 'qr' && <VistaQr aoEntrar={aoEntrar} />}
          {vista === 'nsec' && <VistaNsec aoEntrar={aoEntrar} />}
          {vista === 'criar' && <VistaCriar aoEntrar={aoEntrar} />}
          <div>
            <Botao variante="secundario" onClick={() => setVista('menu')}>
              {t.voltar}
            </Botao>
          </div>
        </>
      )}
    </main>
  )
}
