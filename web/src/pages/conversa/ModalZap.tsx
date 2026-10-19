import { useEffect, useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { BotaoCopiar } from '@/components/ui/BotaoCopiar'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { QrCode } from '@/components/ui/QrCode'
import { t } from '@/i18n/pt-BR'
import { relaysPadrao } from '@/nostr/config'
import { relays } from '@/nostr/relays'
import type { Assinante } from '@/nostr/signer/tipos'
import { reciboConfirma } from '@/nostr/zap'
import { consultarLnurl, type ParametrosLnurl } from '@/perfil/lightning'
import {
  ErroZap,
  pedirFatura,
  valorValido,
  type FaturaPedida,
  type ModoDePagamento,
} from '@/zap/enviar'
import { pagarComWebln, temWebln } from '@/zap/webln'

const ATALHOS = [21, 100, 500, 1000]

interface Props {
  aberto: boolean
  aoFechar: () => void
  nome: string
  pubkey: string
  // Sem endereco Lightning valido no perfil do amigo, o dialogo so explica o que fazer.
  endereco?: string
  // O perfil do amigo ainda esta sendo procurado nos relays: nao diga que falta o endereco.
  procurandoPerfil?: boolean
  assinante: Assinante
}

type Servico =
  { fase: 'consultando' } | { fase: 'falhou' } | { fase: 'pronto'; parametros: ParametrosLnurl }

function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroZap) {
    if (erro.motivo === 'servico' && erro.detalhe) return t.zap.erros.servicoMotivo(erro.detalhe)
    return t.zap.erros[erro.motivo]
  }
  return t.zap.erros.servico
}

// Formulario e fatura num dialogo so. RN-WEB-ZAP-008: a fatura vive so aqui, na memoria.
export function ModalZap({
  aberto,
  aoFechar,
  nome,
  pubkey,
  endereco,
  procurandoPerfil = false,
  assinante,
}: Props) {
  const [tentativa, setTentativa] = useState(0)
  const [servico, setServico] = useState<Servico>({ fase: 'consultando' })
  const [sats, setSats] = useState('100')
  const [comentario, setComentario] = useState('')
  const [modo, setModo] = useState<ModoDePagamento>('zap')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [fatura, setFatura] = useState<FaturaPedida>()
  const [satsPedidos, setSatsPedidos] = useState(0)
  const [recebido, setRecebido] = useState(false)
  const [erroWebln, setErroWebln] = useState(false)

  // RN-WEB-ZAP-002: so consulta o servidor quando o dialogo abre (ou se tenta de novo).
  useEffect(() => {
    if (!aberto || !endereco) return
    let valido = true
    consultarLnurl(endereco).then((r) => {
      if (valido) setServico(r.ok ? { fase: 'pronto', parametros: r } : { fase: 'falhou' })
    })
    return () => {
      valido = false
    }
  }, [aberto, endereco, tentativa])

  const parametros = servico.fase === 'pronto' ? servico.parametros : undefined

  // RN-WEB-ZAP-007: so um recibo valido confirma.
  useEffect(() => {
    if (!aberto || !fatura?.pedido || !parametros?.nostrPubkey) return
    const dados = {
      nostrPubkey: parametros.nostrPubkey,
      pedidoId: fatura.pedido.id,
      fatura: fatura.fatura,
    }
    return relays.inscrever(
      { kinds: [9735], '#p': [pubkey], since: Math.floor(Date.now() / 1000) - 120 },
      (evento) => {
        if (reciboConfirma(evento, dados)) setRecebido(true)
      },
    )
  }, [aberto, fatura, parametros, pubkey])

  const fechar = () => {
    setFatura(undefined)
    setRecebido(false)
    setErro(undefined)
    setErroWebln(false)
    setServico({ fase: 'consultando' })
    aoFechar()
  }

  const valor = Number(sats)
  const valido = parametros ? valorValido(valor, parametros.minSats, parametros.maxSats) : false
  const modoEfetivo: ModoDePagamento = parametros?.aceitaZap ? modo : 'comum'

  const gerar = async () => {
    if (!parametros || !valido) return
    setGerando(true)
    setErro(undefined)
    try {
      const nova = await pedirFatura({
        parametros,
        sats: valor,
        comentario,
        modo: modoEfetivo,
        destinatario: pubkey,
        assinante,
        relays: relaysPadrao,
      })
      setSatsPedidos(valor)
      setFatura(nova)
    } catch (e) {
      setErro(mensagemDoErro(e))
    } finally {
      setGerando(false)
    }
  }

  const pagarComExtensao = async () => {
    if (!fatura) return
    setErroWebln(false)
    try {
      await pagarComWebln(fatura.fatura)
    } catch {
      setErroWebln(true)
    }
  }

  const novaFatura = () => {
    setFatura(undefined)
    setRecebido(false)
    setErroWebln(false)
  }

  let corpo
  if (!endereco && procurandoPerfil) {
    corpo = <p role="status">{t.zap.procurandoPerfil(nome)}</p>
  } else if (!endereco) {
    corpo = <Aviso>{t.zap.semEndereco(nome)}</Aviso>
  } else if (servico.fase === 'consultando') {
    corpo = <p role="status">{t.zap.consultando}</p>
  } else if (servico.fase === 'falhou' || !parametros) {
    corpo = (
      <div className="flex flex-col items-start gap-3">
        <Aviso tom="erro">{t.zap.semServico}</Aviso>
        <p className="text-sm text-tinta-suave">{t.zap.semServicoAjuda}</p>
        <BotaoCopiar texto={endereco} rotulo={t.zap.copiarEndereco} />
        <Botao
          variante="secundario"
          onClick={() => {
            setServico({ fase: 'consultando' })
            setTentativa((n) => n + 1)
          }}
        >
          {t.zap.tentarDeNovo}
        </Botao>
      </div>
    )
  } else if (fatura) {
    corpo = (
      <div className="flex min-w-0 flex-col items-center gap-3">
        <h3 className="text-center font-bold">{t.zap.faturaTitulo(satsPedidos)}</h3>
        {/* QR em maiusculas: o esquema alfanumerico gera um codigo menor e mais facil de ler. */}
        <QrCode
          texto={`lightning:${fatura.fatura}`.toUpperCase()}
          rotulo={t.zap.faturaQr}
          tamanho={240}
        />
        <p className="max-h-20 w-full overflow-y-auto break-all rounded-cordel border-2 border-borda bg-fundo p-2 font-mono text-xs">
          {fatura.fatura}
        </p>
        <div className="flex w-full flex-wrap justify-center gap-2">
          <BotaoCopiar texto={fatura.fatura} rotulo={t.zap.copiarFatura} />
          <a
            href={`lightning:${fatura.fatura}`}
            className="inline-flex items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo"
          >
            {t.zap.abrirCarteira}
          </a>
          {temWebln() && (
            <Botao variante="secundario" onClick={pagarComExtensao}>
              {t.zap.pagarWebln}
            </Botao>
          )}
        </div>
        {erroWebln && <Aviso tom="erro">{t.zap.weblnFalhou}</Aviso>}
        {fatura.pedido ? (
          recebido ? (
            <Aviso>{t.zap.recebido}</Aviso>
          ) : (
            <p role="status" className="text-sm text-tinta-suave">
              {t.zap.aguardando}
            </p>
          )
        ) : (
          <p className="text-center text-sm text-tinta-suave">{t.zap.comumInfo}</p>
        )}
      </div>
    )
  } else {
    corpo = (
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-bold">{t.zap.valor}</legend>
          <div className="flex flex-wrap gap-2">
            {ATALHOS.filter((n) => valorValido(n, parametros.minSats, parametros.maxSats)).map(
              (n) => (
                <Botao
                  key={n}
                  variante="secundario"
                  aria-pressed={valor === n}
                  className={`px-3 py-1.5 text-sm ${valor === n ? 'bg-vermelho text-sobre-vermelho' : ''}`}
                  onClick={() => setSats(String(n))}
                >
                  {n.toLocaleString('pt-BR')}
                </Botao>
              ),
            )}
          </div>
        </fieldset>
        <Campo
          rotulo={t.zap.valorLivre}
          type="number"
          inputMode="numeric"
          min={parametros.minSats}
          max={parametros.maxSats}
          value={sats}
          onChange={(e) => setSats(e.target.value)}
          ajuda={t.zap.valorLimite(parametros.minSats, parametros.maxSats)}
          erro={
            sats !== '' && !valido
              ? t.zap.valorLimite(parametros.minSats, parametros.maxSats)
              : undefined
          }
        />
        <Campo
          rotulo={t.zap.comentario}
          value={comentario}
          maxLength={parametros.comentarioMax > 0 ? parametros.comentarioMax : 200}
          onChange={(e) => setComentario(e.target.value)}
        />
        {parametros.aceitaZap ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-bold">{t.zap.forma}</legend>
            {(
              [
                ['zap', t.zap.modoZap, t.zap.modoZapAjuda],
                ['comum', t.zap.modoComum, t.zap.modoComumAjuda],
              ] as const
            ).map(([valorModo, rotulo, ajuda]) => (
              <label
                key={valorModo}
                className="flex cursor-pointer items-start gap-2 rounded-cordel border-2 border-borda bg-fundo p-3"
              >
                <input
                  type="radio"
                  name="modo-zap"
                  className="mt-1"
                  checked={modo === valorModo}
                  onChange={() => setModo(valorModo)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">{rotulo}</span>
                  <span className="text-sm text-tinta-suave">{ajuda}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <Aviso>{t.zap.semZapAviso}</Aviso>
        )}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
      </div>
    )
  }

  const acoes =
    parametros && !fatura ? (
      <Botao onClick={gerar} disabled={!valido || gerando}>
        {gerando ? t.zap.gerando : t.zap.gerar}
      </Botao>
    ) : fatura ? (
      <Botao variante="secundario" onClick={novaFatura}>
        {t.zap.novaFatura}
      </Botao>
    ) : undefined

  return (
    <Modal aberto={aberto} titulo={t.zap.titulo(nome)} aoFechar={fechar} acoes={acoes}>
      {corpo}
    </Modal>
  )
}
