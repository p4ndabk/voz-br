import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Avatar } from '@/components/ui/Avatar'
import { AreaDeTexto } from '@/components/ui/AreaDeTexto'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { t } from '@/i18n/pt-BR'
import { useSessao } from '@/nostr/useSessao'
import {
  iguais,
  lerCampos,
  LIMITE_NOME,
  LIMITE_SOBRE,
  temErros,
  validarCampos,
  type CamposEditaveis,
} from '@/perfil/campos'
import {
  carregarPerfilAtual,
  ErroSalvarPerfil,
  salvarPerfil,
  type PerfilAtual,
} from '@/perfil/editar'
import { verificarEnderecoLightning, type ResultadoLightning } from '@/perfil/lightning'

const VAZIOS: CamposEditaveis = { nome: '', sobre: '', foto: '', lightning: '' }

type Salvamento =
  | { fase: 'ocioso' }
  | { fase: 'salvando' }
  | { fase: 'salvo'; aceitos: number; total: number }
  | { fase: 'falhou' }

type Verificacao =
  { fase: 'parada' } | { fase: 'verificando' } | { fase: 'pronta'; r: ResultadoLightning }

export function EditarPerfil() {
  const assinante = useSessao((s) => s.assinante)
  const [atual, setAtual] = useState<PerfilAtual>()
  const [campos, setCampos] = useState<CamposEditaveis>(VAZIOS)
  const [original, setOriginal] = useState<CamposEditaveis>(VAZIOS)
  const [salvamento, setSalvamento] = useState<Salvamento>({ fase: 'ocioso' })
  const [verificacao, setVerificacao] = useState<Verificacao>({ fase: 'parada' })
  const [fotoFalhou, setFotoFalhou] = useState<string>()
  const pubkey = assinante?.pubkey

  // RN-WEB-PERFIL-010: o formulario so abre depois de buscar o perfil mais recente nos relays.
  useEffect(() => {
    if (!pubkey) return
    let ativo = true
    void carregarPerfilAtual(pubkey).then((perfil) => {
      if (!ativo) return
      const lidos = lerCampos(perfil.conteudo)
      setAtual(perfil)
      setCampos(lidos)
      setOriginal(lidos)
    })
    return () => {
      ativo = false
    }
  }, [pubkey])

  if (!assinante) return null

  const erros = validarCampos(campos)
  const mudou = !iguais(campos, original)
  const podeSalvar = Boolean(atual) && mudou && !temErros(erros) && salvamento.fase !== 'salvando'
  const fotoValida = campos.foto.trim() !== '' && !erros.foto
  const lightningVerificavel = campos.lightning.trim() !== '' && !erros.lightning

  const mudar = (parte: Partial<CamposEditaveis>) => {
    setCampos((c) => ({ ...c, ...parte }))
    if (salvamento.fase !== 'ocioso') setSalvamento({ fase: 'ocioso' })
    if ('lightning' in parte) setVerificacao({ fase: 'parada' })
  }

  const verificar = async () => {
    setVerificacao({ fase: 'verificando' })
    setVerificacao({ fase: 'pronta', r: await verificarEnderecoLightning(campos.lightning) })
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!podeSalvar || !atual) return
    setSalvamento({ fase: 'salvando' })
    try {
      const { aceitos, total, publicado } = await salvarPerfil(assinante, atual, campos)
      setAtual(publicado)
      setOriginal(campos)
      setSalvamento({ fase: 'salvo', aceitos, total })
    } catch (falha) {
      if (!(falha instanceof ErroSalvarPerfil)) throw falha
      setSalvamento({ fase: 'falhou' })
    }
  }

  const textoDoErro = (campo: keyof CamposEditaveis): string | undefined => {
    const erro = erros[campo]
    if (!erro) return undefined
    if (campo === 'nome') return t.editarPerfil.erros.longo(LIMITE_NOME)
    if (campo === 'sobre') return t.editarPerfil.erros.longo(LIMITE_SOBRE)
    if (campo === 'foto')
      return erro === 'longo' ? t.editarPerfil.erros.longo(500) : t.editarPerfil.erros.fotoInvalida
    return t.editarPerfil.erros.lightningInvalido
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.editarPerfil.titulo} voltarPara="/conta" />

      {!atual ? (
        <p role="status" className="text-tinta-suave">
          {t.editarPerfil.carregando}
        </p>
      ) : (
        <form onSubmit={salvar} className="flex flex-col gap-5">
          {!atual.encontrado && <Aviso>{t.editarPerfil.naoEncontrado}</Aviso>}

          <Campo
            rotulo={t.editarPerfil.nome.rotulo}
            ajuda={t.editarPerfil.nome.ajuda}
            erro={textoDoErro('nome')}
            autoComplete="off"
            value={campos.nome}
            onChange={(e) => mudar({ nome: e.target.value })}
          />

          <AreaDeTexto
            rotulo={t.editarPerfil.sobre.rotulo}
            ajuda={t.editarPerfil.sobre.ajuda}
            erro={textoDoErro('sobre')}
            value={campos.sobre}
            onChange={(e) => mudar({ sobre: e.target.value })}
          />

          <div className="flex flex-col gap-3">
            <Campo
              rotulo={t.editarPerfil.foto.rotulo}
              ajuda={t.editarPerfil.foto.ajuda}
              erro={textoDoErro('foto')}
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={campos.foto}
              onChange={(e) => mudar({ foto: e.target.value })}
            />
            <div className="flex items-center gap-3">
              {fotoValida && fotoFalhou !== campos.foto.trim() ? (
                // RN-WEB-PERFIL-008: sem referrer; se a imagem nao carregar, cai no aviso abaixo.
                <img
                  src={campos.foto.trim()}
                  alt={t.editarPerfil.foto.previa}
                  width={64}
                  height={64}
                  referrerPolicy="no-referrer"
                  onError={() => setFotoFalhou(campos.foto.trim())}
                  className="size-16 shrink-0 rounded-cordel border-2 border-borda bg-superficie object-cover"
                />
              ) : (
                <Avatar semente={assinante.pubkey} tamanho={64} />
              )}
              {fotoValida && fotoFalhou === campos.foto.trim() && (
                <p role="alert" className="text-sm font-bold text-vermelho">
                  {t.editarPerfil.foto.falhou}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Campo
              rotulo={t.editarPerfil.lightning.rotulo}
              ajuda={t.editarPerfil.lightning.ajuda}
              erro={textoDoErro('lightning')}
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              value={campos.lightning}
              onChange={(e) => mudar({ lightning: e.target.value })}
            />
            <div className="flex flex-col items-start gap-2">
              <Botao
                variante="secundario"
                onClick={verificar}
                disabled={!lightningVerificavel || verificacao.fase === 'verificando'}
              >
                {verificacao.fase === 'verificando'
                  ? t.editarPerfil.lightning.verificando
                  : t.editarPerfil.lightning.verificar}
              </Botao>
              <p className="text-xs text-tinta-suave">{t.editarPerfil.lightning.privacidade}</p>
              {verificacao.fase === 'pronta' && <ResultadoDaVerificacao r={verificacao.r} />}
            </div>
          </div>

          {salvamento.fase === 'falhou' && <Aviso tom="erro">{t.editarPerfil.falhou}</Aviso>}
          {salvamento.fase === 'salvo' && (
            <Aviso>{t.editarPerfil.salvo(salvamento.aceitos, salvamento.total)}</Aviso>
          )}

          <Botao type="submit" disabled={!podeSalvar}>
            {salvamento.fase === 'salvando' ? t.editarPerfil.salvando : t.editarPerfil.salvar}
          </Botao>
        </form>
      )}

      <Link to="/conta" className="font-bold underline underline-offset-4">
        {t.editarPerfil.voltar}
      </Link>
    </main>
  )
}

function ResultadoDaVerificacao({ r }: { r: ResultadoLightning }) {
  if (r.ok) {
    return (
      <div role="status" className="flex flex-col gap-1 text-sm">
        <p className="font-bold">{t.editarPerfil.lightning.ok(r.minSats, r.maxSats)}</p>
        <p>{r.aceitaZap ? t.editarPerfil.lightning.aceitaZap : t.editarPerfil.lightning.semZap}</p>
      </div>
    )
  }
  return (
    <p role="status" className="text-sm font-bold">
      {r.motivo === 'indisponivel'
        ? t.editarPerfil.lightning.indisponivel
        : t.editarPerfil.lightning.invalido}
    </p>
  )
}
